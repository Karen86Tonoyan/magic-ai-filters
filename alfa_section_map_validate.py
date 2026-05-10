import json
import sys
from pathlib import Path


SCHEMA_VERSION = "RC2.1"
ALLOWED_SOURCES = {"pdfminer_offline", "pypdf_offline", "pageindex_online"}
REQUIRED_SECTION_FIELDS = ["id", "title", "level", "parent_id", "content_preview"]


def validate_section_map(path: str) -> int:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []

    if data.get("schema_version") != SCHEMA_VERSION:
        errors.append(
            f"schema_version must be '{SCHEMA_VERSION}', got '{data.get('schema_version')}'"
        )

    source = data.get("source")
    if source not in ALLOWED_SOURCES:
        errors.append(f"source must be one of {sorted(ALLOWED_SOURCES)}, got '{source}'")

    if not data.get("document_id"):
        errors.append("Missing document_id")

    sections = data.get("sections")
    if not isinstance(sections, list):
        errors.append("sections must be a list")
        sections = []

    section_count = data.get("section_count")
    if not isinstance(section_count, int):
        errors.append("section_count must be an integer")
    elif section_count != len(sections):
        errors.append(
            f"section_count mismatch: declared={section_count} actual={len(sections)}"
        )

    has_any_line = False
    has_any_page = False
    seen_ids: set[str] = set()

    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            errors.append(f"Section {index} is not an object")
            continue

        for field in REQUIRED_SECTION_FIELDS:
            value = section.get(field)
            if value is None:
                errors.append(f"Section {index} missing {field}")
            elif isinstance(value, str) and value.strip() == "":
                errors.append(f"Section {index} has empty {field}")

        section_id = section.get("id")
        if isinstance(section_id, str):
            if section_id in seen_ids:
                errors.append(f"Duplicate section id: {section_id}")
            else:
                seen_ids.add(section_id)

        line_start = section.get("line_start")
        line_end = section.get("line_end")
        page_start = section.get("page_start")
        page_end = section.get("page_end")

        if line_start is not None or line_end is not None:
            has_any_line = True
        if page_start is not None or page_end is not None:
            has_any_page = True

    if sections and not has_any_line and not has_any_page:
        warnings.append("No line/page coordinates found in sections")

    if errors:
        print("INVALID SECTION MAP")
        for error in errors:
            print(f"- {error}")
        for warning in warnings:
            print(f"! {warning}")
        return 1

    print("VALID SECTION MAP")
    print(f"schema_version: {data.get('schema_version')}")
    print(f"document_id: {data.get('document_id')}")
    print(f"section_count: {len(sections)}")
    for warning in warnings:
        print(f"! {warning}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python .\\alfa_section_map_validate.py .\\results\\<file>_alfa_section_map.json")
        raise SystemExit(2)
    raise SystemExit(validate_section_map(sys.argv[1]))
