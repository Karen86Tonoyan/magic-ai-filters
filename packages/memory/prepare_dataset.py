from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from packages.memory.chunking import chunk_text_by_chars

DEFAULT_CHUNK_TARGET_CHARS = 1400
DEFAULT_CHUNK_OVERLAP_CHARS = 220
ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "alfa-core" / "ingestion-prep"
DEFAULT_KOMPENDIUM_ZIP = Path.home() / "Downloads" / "kompendium_kodowanie_20260420.zip"
DEFAULT_KOMPENDIUM_DUPLICATE = Path.home() / "Downloads" / "kompendium_kodowanie_20260420 (1).zip"
DEFAULT_DEEPSEEK_ZIP = Path.home() / "Downloads" / "deepseek_data-2026-04-21.zip"
INGESTED_AT = datetime.now(timezone.utc).isoformat()

EMAIL_RE = re.compile(r"(?i)\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b")
PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d[\d().\-\s]{6,}\d)")
UUID_RE = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE)
GOOGLE_PROFILE_ID_RE = re.compile(r"\bGoogle-[A-Za-z0-9-]{8,}\b")
AVATAR_URL_RE = re.compile(r"https?://\S*(?:user-avatar|avatar|profile)\S*", re.IGNORECASE)

TECHNICAL_KEYWORDS = {
    "python": ("python", "pytest", "sqlalchemy", "fastapi"),
    "javascript": ("javascript", "node.js", "nodejs", "npm", "express"),
    "typescript": ("typescript", "tsconfig", "typecheck", "vitest"),
    "react": ("react", "hooks", "jsx", "tsx", "component"),
    "database": ("database", "sql", "postgres", "mysql", "sqlite", "qdrant", "vector db", "embedding"),
    "devops": ("docker", "compose", "pipeline", "deploy", "deployment", "github actions", "kubernetes"),
    "testing": ("test", "tests", "testing", "bug", "debug", "traceback", "stack trace"),
    "security": ("security", "owasp", "jwt", "rbac", "oauth", "prompt injection"),
    "architecture": ("architecture", "backend", "frontend", "service", "system design", "design pattern"),
    "ai_llm": ("ai", "llm", "rag", "ollama", "model", "prompt", "agent", "retriever", "mcp"),
    "product_engineering": ("mvp", "roadmap", "extension", "vscode", "workflow", "engineering", "product", "plan"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare ALFA-CORE RAG sources from kompendium and deepseek archives.")
    parser.add_argument("--kompendium-zip", type=Path, default=DEFAULT_KOMPENDIUM_ZIP)
    parser.add_argument("--duplicate-candidate", action="append", type=Path, default=[DEFAULT_KOMPENDIUM_DUPLICATE])
    parser.add_argument("--deepseek-zip", type=Path, default=DEFAULT_DEEPSEEK_ZIP)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--chunk-target-chars", type=int, default=DEFAULT_CHUNK_TARGET_CHARS)
    parser.add_argument("--chunk-overlap-chars", type=int, default=DEFAULT_CHUNK_OVERLAP_CHARS)
    return parser.parse_args()


def stable_id(*parts: str) -> str:
    return hashlib.sha256("::".join(parts).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def sanitize_text(text: str) -> tuple[str, dict[str, int]]:
    sanitized = normalize_text(text)
    replacements: Counter[str] = Counter()
    patterns = (
        (EMAIL_RE, "EMAIL"),
        (PHONE_RE, "PHONE"),
        (UUID_RE, "ID"),
        (GOOGLE_PROFILE_ID_RE, "ID"),
        (AVATAR_URL_RE, "PROFILE_URL"),
    )
    for pattern, label in patterns:
        sanitized, count = pattern.subn(f"[REDACTED_{label}]", sanitized)
        if count:
            replacements[label] += count
    return sanitized, dict(replacements)


def first_markdown_heading(text: str, fallback: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            heading = stripped.lstrip("#").strip()
            if heading:
                return heading
    return fallback


def build_kompendium_tags(topic: str, relative_path: Path) -> list[str]:
    tags = {topic.lower(), "documentation"}
    stem = re.sub(r"^\d+_", "", relative_path.stem.lower())
    for token in stem.split("_"):
        if token:
            tags.add(token)
    return sorted(tags)


def detect_technical_tags(*parts: str) -> list[str]:
    haystack = "\n".join(part for part in parts if part).lower()
    tags: list[str] = []
    for tag, keywords in TECHNICAL_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            tags.append(tag)
    return sorted(set(tags))


def chunk_policy(doc_type: str, target_chars: int, overlap_chars: int) -> tuple[int, int]:
    if doc_type == "code":
        return 1400, 220
    if doc_type == "conversation":
        return 1800, 260
    if doc_type == "config":
        return 1200, 140
    return target_chars, overlap_chars


def validate_normalized_document(document: dict[str, Any]) -> None:
    required = ("doc_id", "source_archive", "source_kind", "title", "content", "tags", "metadata", "sanitized")
    for field in required:
        if field not in document:
            raise ValueError(f"Missing normalized document field: {field}")
    metadata = document["metadata"]
    for key in ("source_path", "doc_type", "section", "ingested_at", "workspace_root"):
        if key not in metadata:
            raise ValueError(f"Missing normalized document metadata field: {key}")


def validate_chunk(chunk: dict[str, Any]) -> None:
    required = ("chunk_id", "doc_id", "chunk_index", "content", "source_kind", "title", "tags", "metadata", "doc_type")
    for field in required:
        if field not in chunk:
            raise ValueError(f"Missing chunk field: {field}")


def extract_kompendium_documents(zip_path: Path, extract_dir: Path) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []
    with zipfile.ZipFile(zip_path) as archive:
        for entry in sorted(archive.infolist(), key=lambda item: item.filename):
            if entry.is_dir() or not entry.filename.lower().endswith(".md"):
                continue
            relative_path = Path(entry.filename)
            topic = relative_path.parts[0] if len(relative_path.parts) > 1 else "root"
            content = normalize_text(archive.read(entry).decode("utf-8", errors="replace"))
            destination = extract_dir / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(content, encoding="utf-8")
            title = first_markdown_heading(content, relative_path.stem)
            document = {
                "doc_id": stable_id("kompendium_doc", entry.filename),
                "source_archive": zip_path.name,
                "source_kind": "kompendium_doc",
                "title": title,
                "content": content,
                "tags": build_kompendium_tags(topic, relative_path),
                "metadata": {
                    "topic": topic,
                    "relative_path": relative_path.as_posix(),
                    "original_filename": relative_path.name,
                    "source_path": entry.filename,
                    "doc_type": "documentation",
                    "section": topic,
                    "ingested_at": INGESTED_AT,
                    "workspace_root": None,
                    "source_bucket": "knowledge_base",
                },
                "sanitized": True,
            }
            validate_normalized_document(document)
            documents.append(document)
    return documents


def extract_fragment_text(message: dict[str, Any], fragment_type: str) -> str:
    fragments = message.get("fragments") or []
    parts = [str(fragment.get("content", "")) for fragment in fragments if fragment.get("type") == fragment_type and fragment.get("content")]
    return normalize_text("\n".join(parts))


def find_parent_request(mapping: dict[str, Any], parent_id: str | None) -> str | None:
    current = parent_id
    while current:
        node = mapping.get(current) or {}
        message = node.get("message") or {}
        request_text = extract_fragment_text(message, "REQUEST")
        if request_text:
            return request_text
        current = node.get("parent")
    return None


def deepseek_nodes_in_order(conversation: dict[str, Any]) -> list[dict[str, Any]]:
    mapping = conversation.get("mapping") or {}
    return sorted(mapping.values(), key=lambda node: str(((node or {}).get("message") or {}).get("inserted_at") or ""))


def extract_deepseek_documents(zip_path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    with zipfile.ZipFile(zip_path) as archive:
        conversations = json.loads(archive.read("conversations.json").decode("utf-8"))

    documents: list[dict[str, Any]] = []
    summary = {
        "conversation_count": len(conversations),
        "retained_records": 0,
        "dropped_nontechnical": 0,
        "user_json_indexed": False,
        "sanitization_replacements": {},
    }
    replacement_totals: Counter[str] = Counter()

    for conversation in conversations:
        mapping = conversation.get("mapping") or {}
        raw_title = str(conversation.get("title") or "Untitled conversation")
        title, title_replacements = sanitize_text(raw_title)
        replacement_totals.update(title_replacements)
        for node in deepseek_nodes_in_order(conversation):
            message = (node or {}).get("message") or {}
            response_text = extract_fragment_text(message, "RESPONSE")
            if not response_text or len(response_text.split()) < 25:
                continue
            parent_prompt = find_parent_request(mapping, node.get("parent"))
            sanitized_response, replacements = sanitize_text(response_text)
            replacement_totals.update(replacements)
            sanitized_parent = None
            if parent_prompt:
                sanitized_parent, parent_replacements = sanitize_text(parent_prompt)
                replacement_totals.update(parent_replacements)
            tags = detect_technical_tags(title, sanitized_response, sanitized_parent or "")
            if not tags:
                summary["dropped_nontechnical"] += 1
                continue
            document = {
                "doc_id": stable_id("deepseek_conversation", str(conversation.get("id")), str(node.get("id"))),
                "source_archive": zip_path.name,
                "source_kind": "deepseek_conversation",
                "title": title,
                "content": sanitized_response,
                "tags": tags,
                "metadata": {
                    "conversation_id": str(conversation.get("id")),
                    "conversation_title": title,
                    "message_role": "assistant",
                    "created_at": str(message.get("inserted_at") or conversation.get("updated_at") or ""),
                    "parent_prompt": sanitized_parent,
                    "source_path": f"conversations/{conversation.get('id')}/{node.get('id')}",
                    "doc_type": "conversation",
                    "section": title,
                    "ingested_at": INGESTED_AT,
                    "workspace_root": None,
                    "source_bucket": "conversation_export",
                },
                "sanitized": True,
            }
            validate_normalized_document(document)
            documents.append(document)
            summary["retained_records"] += 1

    summary["sanitization_replacements"] = dict(replacement_totals)
    return documents, summary


def build_chunks(documents: list[dict[str, Any]], target_chars: int, overlap_chars: int) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for document in documents:
        doc_type = str(document["metadata"]["doc_type"])
        doc_target, doc_overlap = chunk_policy(doc_type, target_chars, overlap_chars)
        for index, content in enumerate(chunk_text_by_chars(document["content"], doc_target, doc_overlap)):
            chunk_hash = stable_id(document["doc_id"], content)
            metadata = dict(document["metadata"])
            metadata.update({
                "chunk_index": index,
                "chunk_hash": chunk_hash,
            })
            chunk = {
                "chunk_id": stable_id(document["doc_id"], str(index), chunk_hash),
                "doc_id": document["doc_id"],
                "chunk_index": index,
                "content": content,
                "source_kind": document["source_kind"],
                "title": document["title"],
                "tags": list(document["tags"]),
                "metadata": metadata,
                "doc_type": doc_type,
                "relative_path": document["metadata"].get("relative_path", document["metadata"]["source_path"]),
                "source_path": document["metadata"]["source_path"],
            }
            validate_chunk(chunk)
            chunks.append(chunk)
    return chunks


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def pii_patterns_found(text: str) -> bool:
    return any(pattern.search(text) for pattern in (EMAIL_RE, PHONE_RE, UUID_RE, GOOGLE_PROFILE_ID_RE, AVATAR_URL_RE))


def deepseek_documents_are_clean(documents: list[dict[str, Any]]) -> bool:
    for document in documents:
        if document["source_kind"] != "deepseek_conversation":
            continue
        if pii_patterns_found(document["title"]) or pii_patterns_found(document["content"]):
            return False
    return True


def prepare_dataset(
    kompendium_zip: Path,
    duplicate_candidates: list[Path],
    deepseek_zip: Path,
    output_dir: Path,
    chunk_target_chars: int,
    chunk_overlap_chars: int,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    extract_dir = output_dir / "extracted" / "kompendium"
    canonical_hash = sha256_file(kompendium_zip)
    duplicates = [candidate.name for candidate in duplicate_candidates if candidate.exists() and sha256_file(candidate) == canonical_hash]
    kompendium_documents = extract_kompendium_documents(kompendium_zip, extract_dir)
    deepseek_documents, deepseek_summary = extract_deepseek_documents(deepseek_zip)
    documents = [*kompendium_documents, *deepseek_documents]
    chunks = build_chunks(documents, chunk_target_chars, chunk_overlap_chars)

    normalized_path = output_dir / "normalized" / "normalized_documents.jsonl"
    chunk_path = output_dir / "normalized" / "document_chunks.jsonl"
    report_path = output_dir / "reports" / "ingestion_report.json"

    write_jsonl(normalized_path, documents)
    write_jsonl(chunk_path, chunks)
    report = {
        "canonical_kompendium": kompendium_zip.name,
        "excluded_duplicates": duplicates,
        "document_count": len(documents),
        "chunk_count": len(chunks),
        "source_breakdown": {
            "kompendium_doc": len(kompendium_documents),
            "deepseek_conversation": len(deepseek_documents),
        },
        "deepseek": deepseek_summary,
        "acceptance_checks": {
            "duplicate_kompendium_excluded": bool(duplicates),
            "user_json_excluded": True,
            "deepseek_records_clean": deepseek_documents_are_clean(deepseek_documents),
            "kompendium_topics_preserved": all(bool(doc["metadata"].get("topic")) for doc in kompendium_documents),
            "deepseek_technical_only": all(bool(doc["tags"]) for doc in deepseek_documents),
            "normalized_documents_valid": True,
            "chunks_valid": True,
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


def main() -> None:
    args = parse_args()
    report = prepare_dataset(
        kompendium_zip=args.kompendium_zip,
        duplicate_candidates=args.duplicate_candidate,
        deepseek_zip=args.deepseek_zip,
        output_dir=args.output_dir,
        chunk_target_chars=args.chunk_target_chars,
        chunk_overlap_chars=args.chunk_overlap_chars,
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
