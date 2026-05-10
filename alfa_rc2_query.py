import argparse
import json
import re
import time
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "RC2.1"
REJECT_TYPES = {
    "NONE": "NONE",
    "INVALID_SCHEMA": "INVALID_SCHEMA",
    "INSUFFICIENT_EVIDENCE": "INSUFFICIENT_EVIDENCE",
    "LOW_CONFIDENCE": "LOW_CONFIDENCE",
    "MISSING_CONTEXT": "MISSING_CONTEXT",
    "OUT_OF_SCOPE": "OUT_OF_SCOPE",
    "INTERNAL_ERROR": "INTERNAL_ERROR",
}

SEMANTIC_ANCHORS = {
    "main": ["introduction", "abstract", "overview", "summary", "conclusion"],
    "topic": ["introduction", "abstract", "overview"],
    "finding": ["results", "conclusion", "summary", "discussion"],
    "findings": ["results", "conclusion", "summary", "discussion"],
    "key": ["abstract", "key", "main", "summary", "highlights"],
}


def expand_query_tokens(tokens: list[str]) -> list[str]:
    expanded = list(tokens)
    for token in tokens:
        t = token.lower().strip()
        if t in SEMANTIC_ANCHORS:
            expanded.extend(SEMANTIC_ANCHORS[t])
    return list(dict.fromkeys(expanded))


STOPWORDS = {
    "the", "are", "is", "what", "and", "of", "a", "an", "in", "for",
    "or", "to", "on", "with", "this", "that", "how", "when", "where", "why",
    "czy", "co", "jak", "kiedy", "gdzie", "dlaczego", "to", "jest", "i", "oraz", "na", "w", "z", "o",
    "są", "być", "czyli", "które", "który", "która", "jakie", "jaki", "jaką",
}


def normalize_token(token: str) -> str:
    t = token.lower()
    en_suffixes = ["ing", "es", "ed", "er", "s"]
    for suf in en_suffixes:
        if len(t) > len(suf) + 2 and t.endswith(suf):
            t = t[: -len(suf)]
            break

    pl_suffixes = ["ami", "ach", "owie", "ów", "om", "em", "ie", "y", "i", "ą", "ę", "a", "e", "u"]
    for suf in pl_suffixes:
        if len(t) > len(suf) + 2 and t.endswith(suf):
            t = t[: -len(suf)]
            break

    return t


def tokenize(text: str) -> list[str]:
    raw_tokens = re.findall(r"[A-Za-z0-9_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\-]+", text.lower())
    tokens = [t for t in raw_tokens if t not in STOPWORDS and len(t) > 1]
    normalized = [normalize_token(t) for t in tokens]
    return [t for t in normalized if t and t not in STOPWORDS and len(t) > 1]


def load_section_map(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def validate_rc21_schema(section_map: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if section_map.get("schema_version") != SCHEMA_VERSION:
        errors.append(
            f"schema_version must be '{SCHEMA_VERSION}', got '{section_map.get('schema_version')}'"
        )

    source = section_map.get("source")
    allowed_sources = {"pdfminer_offline", "pypdf_offline", "pageindex_online"}
    if source not in allowed_sources:
        errors.append(f"source must be one of {sorted(allowed_sources)}, got '{source}'")

    sections = section_map.get("sections")
    if not isinstance(sections, list):
        errors.append("sections must be a list")
        sections = []

    section_count = section_map.get("section_count")
    if not isinstance(section_count, int):
        errors.append("section_count must be an integer")
    elif section_count != len(sections):
        errors.append(f"section_count mismatch: declared={section_count} actual={len(sections)}")

    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            errors.append(f"sections[{index}] must be an object")
            continue
        for field in ("id", "title", "level", "parent_id", "content_preview"):
            if field not in section:
                errors.append(f"sections[{index}] missing required field '{field}'")
    return errors


def score_section(question_tokens: list[str], section: dict[str, Any]) -> tuple[int, list[str]]:
    title = str(section.get("title", ""))
    hierarchy = " ".join(section.get("hierarchy", []))
    content_preview = str(section.get("content_preview", ""))
    hay_raw = f"{title} {hierarchy} {content_preview}".lower()
    hay_tokens = tokenize(hay_raw)
    hay_set = set(hay_tokens)

    matched: list[str] = []
    score = 0
    title_tokens = set(tokenize(title))
    hierarchy_tokens = set(tokenize(hierarchy))

    for token in question_tokens:
        if token in hay_set:
            matched.append(token)
            if token in title_tokens:
                score += 2
            elif token in hierarchy_tokens:
                score += 1
            else:
                score += 1
    return score, matched


def build_answer(question: str, matches: list[dict[str, Any]], missing_context: list[str]) -> str:
    if not matches:
        return (
            f"Nie znalazłem wystarczającego pokrycia strukturalnego dla pytania: '{question}'. "
            "Dodaj więcej kontekstu albo wskaż konkretną sekcję dokumentu."
        )
    top_titles = ", ".join(m["title"] for m in matches[:3])
    return (
        f"Na podstawie mapy sekcji najbardziej trafne obszary to: {top_titles}. "
        "Odpowiedź powinna zostać rozwinięta z tych ścieżek dowodu."
    )


def query_section_map(section_map: dict[str, Any], question: str, top_k: int = 5) -> dict[str, Any]:
    sections = section_map.get("sections", [])
    q_tokens = tokenize(question)
    q_tokens = expand_query_tokens(q_tokens)

    scored: list[dict[str, Any]] = []
    all_matched_tokens: set[str] = set()

    for sec in sections:
        if not isinstance(sec, dict):
            continue
        score, matched = score_section(q_tokens, sec)
        if score > 0:
            all_matched_tokens.update(matched)
            scored.append(
                {
                    "id": sec.get("id"),
                    "title": sec.get("title"),
                    "level": sec.get("level"),
                    "line_start": sec.get("line_start"),
                    "line_end": sec.get("line_end"),
                    "hierarchy": sec.get("hierarchy"),
                    "evidence_path": sec.get("evidence_path"),
                    "score": score,
                    "matched_terms": sorted(set(matched)),
                }
            )

    deduped: dict[str, dict[str, Any]] = {}
    for item in scored:
        sec_id = str(item.get("id", ""))
        key = sec_id or str(item.get("evidence_path", ""))
        if not key:
            continue
        prev = deduped.get(key)
        if prev is None or int(item.get("score", 0)) > int(prev.get("score", 0)):
            deduped[key] = item

    scored = list(deduped.values())
    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:top_k]
    evidence_paths = [m["evidence_path"] for m in top if m.get("evidence_path")]
    missing = sorted(set(q_tokens) - all_matched_tokens)

    confidence = 0.0
    if q_tokens:
        confidence = round(len(all_matched_tokens) / len(set(q_tokens)), 3)

    return {
        "question": question,
        "answer": build_answer(question, top, missing),
        "evidence_paths": evidence_paths,
        "matched_sections": top,
        "confidence": confidence,
        "missing_context": missing,
    }


def main() -> int:
    t0 = time.perf_counter()
    parser = argparse.ArgumentParser(description="ALFA RC2 query layer over section map")
    parser.add_argument("--section_map", required=True, help="Path to *_alfa_section_map.json")
    parser.add_argument("--question", required=True, help="Question to query")
    parser.add_argument("--top_k", type=int, default=5, help="Top sections to return")
    parser.add_argument("--json_out", help="Optional path to write JSON result")
    parser.add_argument("--strict", action="store_true", help="Enable strict evidence gate")
    parser.add_argument("--min_confidence", type=float, default=0.6, help="Minimum confidence required in strict mode")
    parser.add_argument("--min_evidence_paths", type=int, default=1, help="Minimum evidence paths required in strict mode")
    args = parser.parse_args()

    try:
        smap = load_section_map(args.section_map)
    except Exception as exc:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        result = {
            "schema_version": SCHEMA_VERSION,
            "question": args.question,
            "answer": "Section map load error.",
            "evidence_paths": [],
            "matched_sections": [],
            "confidence": 0.0,
            "missing_context": [],
            "evidence_count": 0,
            "decision": "REJECT",
            "failed_gate": "schema_gate",
            "reject_type": REJECT_TYPES["INTERNAL_ERROR"],
            "reject_reason": f"Failed to load section_map: {exc}",
            "latency_ms": latency_ms,
            "strict": {
                "enabled": bool(args.strict),
                "passed": False,
                "min_confidence": args.min_confidence,
                "min_evidence_paths": args.min_evidence_paths,
            },
            "rejected_by_strict_gate": False,
        }
        if args.json_out:
            out_path = Path(args.json_out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 2

    schema_errors = validate_rc21_schema(smap)
    if schema_errors:
        latency_ms = int((time.perf_counter() - t0) * 1000)
        result = {
            "schema_version": SCHEMA_VERSION,
            "question": args.question,
            "answer": "Section map rejected by schema gate.",
            "evidence_paths": [],
            "matched_sections": [],
            "confidence": 0.0,
            "missing_context": [],
            "evidence_count": 0,
            "decision": "REJECT",
            "failed_gate": "schema_gate",
            "reject_type": REJECT_TYPES["INVALID_SCHEMA"],
            "reject_reason": "; ".join(schema_errors),
            "latency_ms": latency_ms,
            "strict": {
                "enabled": bool(args.strict),
                "passed": False,
                "min_confidence": args.min_confidence,
                "min_evidence_paths": args.min_evidence_paths,
            },
            "rejected_by_strict_gate": False,
        }
        if args.json_out:
            out_path = Path(args.json_out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 2

    result = query_section_map(smap, args.question, top_k=args.top_k)

    strict_passed = True
    rejected_reasons: list[str] = []
    failed_gate = "none"
    reject_type = REJECT_TYPES["NONE"]
    reject_reason = ""
    if args.strict:
        if result["confidence"] < args.min_confidence:
            strict_passed = False
            rejected_reasons.append("confidence_below_threshold")
        if len(result["evidence_paths"]) < args.min_evidence_paths:
            strict_passed = False
            rejected_reasons.append("insufficient_evidence_paths")

    if not strict_passed:
        failed_gate = "strict_gate"
        if "insufficient_evidence_paths" in rejected_reasons:
            reject_type = REJECT_TYPES["INSUFFICIENT_EVIDENCE"]
            reject_reason = "insufficient evidence paths"
        elif "confidence_below_threshold" in rejected_reasons:
            reject_type = REJECT_TYPES["LOW_CONFIDENCE"]
            reject_reason = "confidence below threshold"
        elif result.get("missing_context"):
            reject_type = REJECT_TYPES["MISSING_CONTEXT"]
            reject_reason = "missing context for query terms"
        else:
            reject_type = REJECT_TYPES["OUT_OF_SCOPE"]
            reject_reason = "query out of scope"

    result["strict"] = {
        "enabled": bool(args.strict),
        "passed": strict_passed,
        "min_confidence": args.min_confidence,
        "min_evidence_paths": args.min_evidence_paths,
    }
    result["schema_version"] = SCHEMA_VERSION
    result["evidence_count"] = len(result.get("evidence_paths", []))
    result["decision"] = "ALLOW" if strict_passed else "REJECT"
    result["failed_gate"] = failed_gate
    result["reject_type"] = reject_type
    result["reject_reason"] = reject_reason
    result["latency_ms"] = int((time.perf_counter() - t0) * 1000)
    if args.strict and not strict_passed:
        result["rejected_by_strict_gate"] = True
        result["strict_rejection_reasons"] = rejected_reasons
    else:
        result["rejected_by_strict_gate"] = False

    if args.json_out:
        out_path = Path(args.json_out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(result, ensure_ascii=False, indent=2))

    if args.strict and not strict_passed:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
