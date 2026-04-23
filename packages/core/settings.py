from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True, slots=True)
class Settings:
    repo_root: Path
    api_host: str
    api_port: int
    log_dir: Path
    prompt_dir: Path
    llm_provider: str
    ollama_base_url: str
    ollama_model: str
    ollama_timeout_seconds: int
    ollama_retries: int
    grok_base_url: str
    grok_api_key: str | None
    grok_model: str
    grok_timeout_seconds: int
    grok_retries: int
    qdrant_url: str
    qdrant_collection: str
    qdrant_timeout_seconds: int
    rag_top_k: int
    low_confidence_score: float
    hash_embedding_dim: int
    chunk_target_chars: int
    chunk_overlap_chars: int
    memory_root: Path
    stt_provider: str
    vosk_model_path: Path | None
    vosk_cache_dir: Path
    vosk_sample_rate: int


def _resolve_path(value: str, root: Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (root / path).resolve()


def _resolve_optional_path(value: str | None, root: Path) -> Path | None:
    if not value:
        return None
    return _resolve_path(value, root)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    return int(raw) if raw else default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    return float(raw) if raw else default


@lru_cache(maxsize=1)
def load_settings() -> Settings:
    repo_root = ROOT_DIR
    return Settings(
        repo_root=repo_root,
        api_host=os.getenv("ALFA_CORE_API_HOST", "127.0.0.1"),
        api_port=_env_int("ALFA_CORE_API_PORT", 8000),
        log_dir=_resolve_path(os.getenv("ALFA_CORE_LOG_DIR", "./logs"), repo_root),
        prompt_dir=_resolve_path(
            os.getenv("ALFA_CORE_PROMPT_DIR", "./packages/core/prompts"),
            repo_root,
        ),
        llm_provider=os.getenv("ALFA_CORE_LLM_PROVIDER", "ollama").strip().lower(),
        ollama_base_url=os.getenv("ALFA_CORE_OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/"),
        ollama_model=os.getenv("ALFA_CORE_OLLAMA_MODEL", "llama3.2"),
        ollama_timeout_seconds=_env_int("ALFA_CORE_OLLAMA_TIMEOUT_SECONDS", 90),
        ollama_retries=_env_int("ALFA_CORE_OLLAMA_RETRIES", 1),
        grok_base_url=os.getenv("ALFA_CORE_GROK_BASE_URL", "https://api.x.ai/v1").rstrip("/"),
        grok_api_key=os.getenv("ALFA_CORE_GROK_API_KEY") or os.getenv("XAI_API_KEY"),
        grok_model=os.getenv("ALFA_CORE_GROK_MODEL", "grok-4.20-reasoning"),
        grok_timeout_seconds=_env_int("ALFA_CORE_GROK_TIMEOUT_SECONDS", 3600),
        grok_retries=_env_int("ALFA_CORE_GROK_RETRIES", 1),
        qdrant_url=os.getenv("ALFA_CORE_QDRANT_URL", "http://127.0.0.1:6333").rstrip("/"),
        qdrant_collection=os.getenv("ALFA_CORE_QDRANT_COLLECTION", "alfa_core_chunks"),
        qdrant_timeout_seconds=_env_int("ALFA_CORE_QDRANT_TIMEOUT_SECONDS", 5),
        rag_top_k=_env_int("ALFA_CORE_RAG_TOP_K", 5),
        low_confidence_score=_env_float("ALFA_CORE_LOW_CONFIDENCE_SCORE", 0.15),
        hash_embedding_dim=_env_int("ALFA_CORE_HASH_EMBEDDING_DIM", 256),
        chunk_target_chars=_env_int("ALFA_CORE_CHUNK_TARGET_CHARS", 1500),
        chunk_overlap_chars=_env_int("ALFA_CORE_CHUNK_OVERLAP_CHARS", 200),
        memory_root=_resolve_path(os.getenv("ALFA_CORE_MEMORY_ROOT", "./data/alfa-core"), repo_root),
        stt_provider=os.getenv("ALFA_CORE_STT_PROVIDER", "vosk"),
        vosk_model_path=_resolve_optional_path(os.getenv("ALFA_CORE_VOSK_MODEL_PATH"), repo_root),
        vosk_cache_dir=_resolve_path(os.getenv("ALFA_CORE_VOSK_CACHE_DIR", "./data/alfa-core/models"), repo_root),
        vosk_sample_rate=_env_int("ALFA_CORE_VOSK_SAMPLE_RATE", 16000),
    )
