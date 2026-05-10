import json
from pathlib import Path
from typing import Any


def load_pageindex_structure(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def iter_children(node: dict[str, Any]) -> list[dict[str, Any]]:
    # PageIndex output observed in this repo uses "nodes" for children.
    for key in ("children", "nodes", "sections"):
        val = node.get(key)
        if isinstance(val, list):
            return [x for x in val if isinstance(x, dict)]
    return []


def normalize_section(
    node: dict[str, Any],
    source_path: str,
    parent_path: list[str] | None = None,
) -> list[dict[str, Any]]:
    parent_path = parent_path or []

    title = node.get("title") or node.get("heading") or "Untitled"
    level = node.get("level") or node.get("depth") or len(parent_path) + 1
    line_num = node.get("line_num")

    current_path = [*parent_path, title]
    stable_path = " > ".join(current_path)
    section_id = f"sec_{abs(hash((source_path, stable_path))) % 10_000_000:07d}"

    # Keep a lightweight textual payload for lexical RC2 scoring.
    preview = (
        node.get("content_preview")
        or node.get("text")
        or node.get("content")
        or ""
    )
    if not isinstance(preview, str):
        preview = str(preview)

    section = {
        "id": section_id,
        "title": title,
        "level": level,
        "line_start": line_num,
        "line_end": None,
        "hierarchy": current_path,
        "evidence_path": f"{source_path} > {stable_path}",
        "content_preview": preview[:4000],
    }

    sections = [section]
    for child in iter_children(node):
        sections.extend(normalize_section(child, source_path, current_path))
    return sections


def extract_pdf_preview(source_path: str, max_chars: int = 4000) -> str:
    # Offline fallback: extract plain text directly from PDF without LLM/API.
    try:
        from pypdf import PdfReader

        reader = PdfReader(source_path)
        chunks: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text:
                chunks.append(text)
            if sum(len(c) for c in chunks) >= max_chars:
                break
        return "\n".join(chunks)[:max_chars]
    except Exception:
        return ""


def build_root_fallback(raw: dict[str, Any], source_path: str) -> dict[str, Any]:
    source_text = ""
    suffix = Path(source_path).suffix.lower()

    if suffix == ".pdf":
        source_text = extract_pdf_preview(source_path)
    else:
        try:
            source_text = Path(source_path).read_text(encoding="utf-8", errors="ignore")
        except OSError:
            source_text = ""

    line_count = raw.get("line_count")
    if not isinstance(line_count, int) or line_count <= 0:
        line_count = max(1, source_text.count("\n") + 1 if source_text else 1)

    preview = source_text[:4000] if source_text else ""

    return {
        "id": f"sec_{abs(hash((source_path, 'Root'))) % 10_000_000:07d}",
        "title": "Root",
        "level": 1,
        "line_start": 1,
        "line_end": line_count,
        "hierarchy": ["Root"],
        "evidence_path": f"{source_path} > Root",
        "content_preview": preview,
        "fallback_reason": "no_structural_headings_detected",
    }


def normalize_pageindex_output(input_json: str, output_json: str, source_path: str) -> None:
    raw = load_pageindex_structure(input_json)

    # Support current PageIndex schema and a few fallback shapes.
    root_nodes = raw.get("structure") or raw.get("nodes") or raw.get("sections") or raw.get("children") or []
    sections: list[dict[str, Any]] = []

    if isinstance(root_nodes, list):
        for node in root_nodes:
            if isinstance(node, dict):
                sections.extend(normalize_section(node, source_path))

    if not sections:
        sections = [build_root_fallback(raw, source_path)]

    normalized = {
        "document_id": Path(source_path).stem,
        "source_path": source_path,
        "section_count": len(sections),
        "sections": sections,
    }

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    normalize_pageindex_output(
        input_json=r".\results\README_structure.json",
        output_json=r".\results\README_alfa_section_map.json",
        source_path=r".\README.md",
    )
