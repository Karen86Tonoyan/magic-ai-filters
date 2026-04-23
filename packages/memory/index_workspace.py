from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from packages.memory.chunking import chunk_text_by_chars
from packages.memory.prepare_dataset import (
    DEFAULT_CHUNK_OVERLAP_CHARS,
    DEFAULT_CHUNK_TARGET_CHARS,
    ROOT_DIR,
    build_kompendium_tags,
    first_markdown_heading,
    normalize_text,
    stable_id,
    validate_chunk,
    validate_normalized_document,
    write_jsonl,
)

IGNORED_DIRS = {".git", "node_modules", "dist", "build", ".next", ".venv", "venv", "__pycache__", "coverage", "logs", "output"}
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "alfa-core" / "workspace-index"
CODE_SUFFIXES = {".py", ".js", ".ts", ".tsx", ".jsx"}
DOC_SUFFIXES = {".md", ".txt"}
CONFIG_SUFFIXES = {".json", ".yaml", ".yml", ".toml"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index a local workspace for ALFA-CORE memory.")
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--chunk-target-chars", type=int, default=DEFAULT_CHUNK_TARGET_CHARS)
    parser.add_argument("--chunk-overlap-chars", type=int, default=DEFAULT_CHUNK_OVERLAP_CHARS)
    return parser.parse_args()


def workspace_id_from_path(workspace_root: Path) -> str:
    return stable_id(str(workspace_root.resolve()))[:16]


def detect_doc_type(path: Path) -> str | None:
    if path.name.endswith(".env.example"):
        return "config"
    if path.suffix.lower() in CODE_SUFFIXES:
        return "code"
    if path.suffix.lower() in DOC_SUFFIXES:
        return "documentation"
    if path.suffix.lower() in CONFIG_SUFFIXES:
        return "config"
    return None


def iter_workspace_files(workspace_root: Path):
    for path in workspace_root.rglob("*"):
        if path.is_dir():
            continue
        if any(part in IGNORED_DIRS for part in path.parts):
            continue
        if detect_doc_type(path) is not None:
            yield path


def collect_workspace_documents(workspace_root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    workspace_root = workspace_root.resolve()
    ws_id = workspace_id_from_path(workspace_root)
    documents: list[dict[str, Any]] = []
    skipped_files: list[str] = []
    for path in iter_workspace_files(workspace_root):
        try:
            raw_content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            skipped_files.append(f"{path}: {type(exc).__name__}")
            continue
        content = normalize_text(raw_content)
        if not content:
            continue
        relative_path = path.relative_to(workspace_root)
        doc_type = detect_doc_type(path)
        title = first_markdown_heading(content, relative_path.as_posix()) if doc_type == "documentation" else relative_path.as_posix()
        tags = sorted({*build_kompendium_tags(relative_path.parts[0] if len(relative_path.parts) > 1 else "workspace", relative_path), doc_type or "unknown"})
        source_bucket = "project_code" if doc_type in {"code", "config"} else "knowledge_base"
        document = {
            "doc_id": stable_id("workspace_file", ws_id, relative_path.as_posix()),
            "source_archive": f"workspace::{workspace_root.name}",
            "source_kind": "workspace_file",
            "title": title,
            "content": content,
            "tags": tags,
            "metadata": {
                "relative_path": relative_path.as_posix(),
                "original_filename": path.name,
                "workspace_id": ws_id,
                "workspace_root": str(workspace_root),
                "workspace_path": str(workspace_root),
                "source_path": relative_path.as_posix(),
                "doc_type": doc_type,
                "section": relative_path.parts[0] if len(relative_path.parts) > 1 else "workspace",
                "ingested_at": datetime.now(timezone.utc).isoformat(),
                "source_bucket": source_bucket,
            },
            "sanitized": False,
        }
        validate_normalized_document(document)
        documents.append(document)
    return documents, skipped_files


def build_workspace_documents(workspace_root: Path) -> list[dict[str, Any]]:
    documents, _skipped_files = collect_workspace_documents(workspace_root)
    return documents


def build_workspace_chunks(documents: list[dict[str, Any]], target_chars: int, overlap_chars: int) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for document in documents:
        for index, content in enumerate(chunk_text_by_chars(document["content"], target_chars, overlap_chars)):
            chunk_hash = stable_id(document["doc_id"], content)
            metadata = dict(document["metadata"])
            metadata.update({"chunk_index": index, "chunk_hash": chunk_hash})
            chunk = {
                "chunk_id": stable_id(document["doc_id"], str(index), chunk_hash),
                "doc_id": document["doc_id"],
                "chunk_index": index,
                "content": content,
                "source_kind": document["source_kind"],
                "title": document["title"],
                "tags": list(document["tags"]),
                "metadata": metadata,
                "doc_type": document["metadata"]["doc_type"],
                "relative_path": document["metadata"]["relative_path"],
                "source_path": document["metadata"]["source_path"],
            }
            validate_chunk(chunk)
            chunks.append(chunk)
    return chunks


def index_workspace(workspace_root: Path, output_dir: Path, chunk_target_chars: int, chunk_overlap_chars: int) -> dict[str, Any]:
    workspace_root = workspace_root.resolve()
    output_root = output_dir / workspace_root.name
    documents, skipped_files = collect_workspace_documents(workspace_root)
    chunks = build_workspace_chunks(documents, chunk_target_chars, chunk_overlap_chars)
    write_jsonl(output_root / "workspace_documents.jsonl", documents)
    write_jsonl(output_root / "workspace_chunks.jsonl", chunks)
    report = {
        "workspace": str(workspace_root),
        "workspace_id": workspace_id_from_path(workspace_root),
        "document_count": len(documents),
        "chunk_count": len(chunks),
        "doc_types": sorted({doc["metadata"]["doc_type"] for doc in documents}),
        "skipped_files": skipped_files,
    }
    (output_root / "workspace_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    args = parse_args()
    report = index_workspace(args.workspace, args.output_dir, args.chunk_target_chars, args.chunk_overlap_chars)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()