from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

import httpx

from packages.core.models import Mode, RequestContext
from packages.core.settings import load_settings
from packages.llm.ollama_client import OllamaClient
from packages.memory.qdrant_store import EmbeddingService, QdrantStore
from packages.router.router import Router
from packages.speech import UnsupportedAudioError, VoskModelError, VoskRuntimeError, VoskTranscriber


def command_bootstrap() -> int:
    settings = load_settings()
    settings.log_dir.mkdir(parents=True, exist_ok=True)
    settings.memory_root.mkdir(parents=True, exist_ok=True)
    settings.vosk_cache_dir.mkdir(parents=True, exist_ok=True)
    print(
        json.dumps(
            {
                "repo_root": str(settings.repo_root),
                "log_dir": str(settings.log_dir),
                "memory_root": str(settings.memory_root),
                "prompt_dir": str(settings.prompt_dir),
                "vosk_cache_dir": str(settings.vosk_cache_dir),
            },
            indent=2,
        )
    )
    return 0


def command_doctor() -> int:
    settings = load_settings()
    ollama = OllamaClient(settings)
    qdrant_ok = False
    embedding_service = EmbeddingService(settings)
    speech = VoskTranscriber(settings)
    try:
        with httpx.Client(timeout=settings.qdrant_timeout_seconds) as client:
            response = client.get(f"{settings.qdrant_url}/collections")
            response.raise_for_status()
        qdrant_ok = True
    except httpx.HTTPError:
        qdrant_ok = False

    report = {
        "repo_root": str(settings.repo_root),
        "prompt_dir_exists": settings.prompt_dir.exists(),
        "log_dir_exists": settings.log_dir.exists(),
        "memory_root_exists": settings.memory_root.exists(),
        "ollama_health": ollama.health(),
        "qdrant_url": settings.qdrant_url,
        "qdrant_health": qdrant_ok,
        "embedding_backend": embedding_service.backend,
        "embedding_dimension": embedding_service.dimension,
        "stt_provider": settings.stt_provider,
        "vosk": speech.inspect(),
        "compose_hint": "docker compose -f docker-compose.qdrant.yml up -d",
    }
    print(json.dumps(report, indent=2))
    return 0


def command_smoke(api_base_url: str | None) -> int:
    settings = load_settings()
    router = Router()
    route = router.route(
        RequestContext(
            request_id="smoke-route",
            mode=Mode.ASK,
            workspace_path=str(settings.repo_root),
            question="Explain the current ALFA-CORE migration status.",
        )
    )
    store = QdrantStore(settings)
    qdrant_status = "unreachable"
    try:
        store.ensure_collection()
        qdrant_status = "ready"
    except Exception as exc:  # noqa: BLE001
        qdrant_status = f"error:{type(exc).__name__}"

    report = {
        "router_decision": route.decision.value,
        "risk_level": route.risk_level.value,
        "qdrant_status": qdrant_status,
    }
    if api_base_url:
        with httpx.Client(timeout=5) as client:
            health = client.get(f"{api_base_url.rstrip('/')}/health")
            report["api_health_status"] = health.status_code
    print(json.dumps(report, indent=2))
    return 0


def command_transcribe(audio_path: str, model_path: str | None) -> int:
    settings = load_settings()
    transcriber = VoskTranscriber(settings=settings, model_path=model_path)
    try:
        result = transcriber.transcribe_wav(audio_path)
    except (FileNotFoundError, UnsupportedAudioError, VoskModelError, VoskRuntimeError) as exc:
        print(
            json.dumps(
                {
                    "provider": "vosk",
                    "audio_path": str(audio_path),
                    "error": type(exc).__name__,
                    "message": str(exc),
                },
                indent=2,
            )
        )
        return 1

    print(json.dumps(asdict(result), indent=2, ensure_ascii=False))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ALFA-CORE operator CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("bootstrap")
    subparsers.add_parser("doctor")

    smoke = subparsers.add_parser("smoke")
    smoke.add_argument("--api-base-url", default=None)

    transcribe = subparsers.add_parser("transcribe")
    transcribe.add_argument("audio_path")
    transcribe.add_argument("--model-path", default=None)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "bootstrap":
        return command_bootstrap()
    if args.command == "doctor":
        return command_doctor()
    if args.command == "smoke":
        return command_smoke(args.api_base_url)
    if args.command == "transcribe":
        return command_transcribe(args.audio_path, args.model_path)
    parser.error("Unknown command")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())