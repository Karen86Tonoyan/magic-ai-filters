import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from shutil import copy2


SCHEMA_VERSION = "RC2.1"


def run_step(command: list[str], label: str) -> int:
    print(f"[RC2] {label}")
    print(" ".join(command))

    result = subprocess.run(command, shell=False)

    if result.returncode != 0:
        print(f"[RC2] {label} failed with exit code {result.returncode}")

    return result.returncode


def stem_from_path(path: str) -> str:
    return Path(path).stem


def slugify(text: str, max_len: int = 48) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.lower()).strip("_")
    return slug[:max_len] or "query"


def detect_structure_mode(section_map_path: Path) -> str:
    data = json.loads(section_map_path.read_text(encoding="utf-8"))
    sections = data.get("sections", [])
    if not sections:
        return "normal"
    if any(str(s.get("fallback_reason", "")).strip() for s in sections if isinstance(s, dict)):
        return "fallback_root"
    return "normal"


def build_contract_manifest(
    *,
    run_id: str,
    document_stem: str,
    source_path: str,
    question: str,
    query_json: dict,
    section_map_json: dict,
    run_structure: Path,
    run_section_map: Path,
    run_query: Path,
    latency_ms: int,
) -> dict:
    confidence = float(query_json.get("confidence", 0.0) or 0.0)
    evidence_paths = query_json.get("evidence_paths", []) or []
    evidence_count = int(query_json.get("evidence_count", len(evidence_paths)) or 0)
    decision = str(query_json.get("decision", "REJECT"))
    failed_gate = str(query_json.get("failed_gate", "internal_gate"))
    reject_type = str(query_json.get("reject_type", "INTERNAL_ERROR"))
    reject_reason = str(query_json.get("reject_reason", ""))
    schema_version = str(query_json.get("schema_version") or section_map_json.get("schema_version") or SCHEMA_VERSION)

    false_accept_critical = decision == "ALLOW" and (evidence_count <= 0 or confidence <= 0.0)

    return {
        "run_id": run_id,
        "document_id": document_stem,
        "source_path": source_path,
        "question": question,
        "schema_version": schema_version,
        "structure_mode": detect_structure_mode(run_section_map),
        "structure_path": str(run_structure).replace("\\", "/"),
        "section_map_path": str(run_section_map).replace("\\", "/"),
        "query_result_path": str(run_query).replace("\\", "/"),
        "decision": decision,
        "failed_gate": failed_gate,
        "reject_type": reject_type,
        "reject_reason": reject_reason,
        "strict_passed": bool(query_json.get("strict", {}).get("passed", False)),
        "confidence": confidence,
        "evidence_count": evidence_count,
        "evidence_paths": evidence_paths,
        "section_count": int(section_map_json.get("section_count", 0) or 0),
        "latency_ms": int(query_json.get("latency_ms", latency_ms) or latency_ms),
        "exit_code": 0 if decision == "ALLOW" else 2,
        "false_accept_critical": false_accept_critical,
        "safety_note": "false_accept is critical failure; false_reject is tuning issue",
    }


def snapshot_run(
    run_id: str,
    document_stem: str,
    source_path: str,
    question: str,
    query_result_path: Path,
    structure_path: Path,
    section_map_path: Path,
    runs_dir: Path,
    latency_ms: int,
) -> Path:
    run_dir = runs_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    run_structure = run_dir / f"{document_stem}_structure.json"
    run_section_map = run_dir / f"{document_stem}_alfa_section_map.json"
    run_query = run_dir / f"{document_stem}_query_result.json"

    copy2(structure_path, run_structure)
    copy2(section_map_path, run_section_map)
    copy2(query_result_path, run_query)

    query_json = json.loads(query_result_path.read_text(encoding="utf-8"))
    section_map_json = json.loads(run_section_map.read_text(encoding="utf-8"))

    manifest = build_contract_manifest(
        run_id=run_id,
        document_stem=document_stem,
        source_path=source_path,
        question=question,
        query_json=query_json,
        section_map_json=section_map_json,
        run_structure=run_structure,
        run_section_map=run_section_map,
        run_query=run_query,
        latency_ms=latency_ms,
    )

    manifest_path = run_dir / "run_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest_path


def write_failure_manifest(
    run_id: str,
    document_stem: str,
    source_path: str,
    question: str,
    runs_dir: Path,
    failed_gate: str,
    reject_type: str,
    reject_reason: str,
    latency_ms: int,
) -> Path:
    run_dir = runs_dir / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = run_dir / "run_manifest.json"

    manifest = {
        "run_id": run_id,
        "document_id": document_stem,
        "source_path": source_path,
        "question": question,
        "schema_version": SCHEMA_VERSION,
        "structure_mode": "unknown",
        "structure_path": "",
        "section_map_path": "",
        "query_result_path": "",
        "decision": "REJECT",
        "failed_gate": failed_gate,
        "reject_type": reject_type,
        "reject_reason": reject_reason,
        "strict_passed": False,
        "confidence": 0.0,
        "evidence_count": 0,
        "evidence_paths": [],
        "section_count": 0,
        "latency_ms": latency_ms,
        "exit_code": 1,
        "false_accept_critical": False,
        "safety_note": "false_accept is critical failure; false_reject is tuning issue",
    }

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest_path


def main() -> int:
    start = time.perf_counter()
    parser = argparse.ArgumentParser(description="ALFA RC2 single-command document runner")

    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--pdf_path")
    source.add_argument("--md_path")

    parser.add_argument("--question", required=True)
    parser.add_argument("--min_confidence", type=float, default=0.6)
    parser.add_argument("--min_evidence_paths", type=int, default=1)

    args = parser.parse_args()

    source_path = args.pdf_path or args.md_path
    document_stem = stem_from_path(source_path)

    results_dir = Path("results")
    results_dir.mkdir(exist_ok=True)
    runs_dir = results_dir / "runs"
    runs_dir.mkdir(exist_ok=True)

    structure_path = results_dir / f"{document_stem}_structure.json"
    section_map_path = results_dir / f"{document_stem}_alfa_section_map.json"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = f"{document_stem}_{timestamp}"
    question_slug = slugify(args.question)
    query_result_path = results_dir / f"{document_stem}_query_{timestamp}_{question_slug}.json"

    index_command = [sys.executable, "alfa_index_document.py"]
    if args.pdf_path:
        index_command.extend(["--pdf_path", args.pdf_path])
    else:
        index_command.extend(["--md_path", args.md_path])

    index_exit = run_step(index_command, "index document")
    if index_exit != 0:
        manifest_path = write_failure_manifest(
            run_id=run_id,
            document_stem=document_stem,
            source_path=source_path,
            question=args.question,
            runs_dir=runs_dir,
            failed_gate="index_gate",
            reject_type="INTERNAL_ERROR",
            reject_reason=f"index document failed with exit code {index_exit}",
            latency_ms=int((time.perf_counter() - start) * 1000),
        )
        print(f"manifest: {manifest_path}")
        return 1

    validate_exit = run_step(
        [sys.executable, "alfa_section_map_validate.py", str(section_map_path)],
        "validate section map",
    )
    if validate_exit != 0:
        manifest_path = write_failure_manifest(
            run_id=run_id,
            document_stem=document_stem,
            source_path=source_path,
            question=args.question,
            runs_dir=runs_dir,
            failed_gate="schema_gate",
            reject_type="INVALID_SCHEMA",
            reject_reason=f"section map validation failed with exit code {validate_exit}",
            latency_ms=int((time.perf_counter() - start) * 1000),
        )
        print(f"manifest: {manifest_path}")
        return 1

    query_exit = run_step(
        [
            sys.executable,
            "alfa_rc2_query.py",
            "--section_map",
            str(section_map_path),
            "--question",
            args.question,
            "--json_out",
            str(query_result_path),
            "--strict",
            "--min_confidence",
            str(args.min_confidence),
            "--min_evidence_paths",
            str(args.min_evidence_paths),
        ],
        "strict RC2 query",
    )

    if query_exit in (0, 2) and query_result_path.exists():
        manifest_path = snapshot_run(
            run_id=run_id,
            document_stem=document_stem,
            source_path=source_path,
            question=args.question,
            query_result_path=query_result_path,
            structure_path=structure_path,
            section_map_path=section_map_path,
            runs_dir=runs_dir,
            latency_ms=int((time.perf_counter() - start) * 1000),
        )
        if query_exit == 0:
            print("ALFA_RC2_RUN_DONE")
        else:
            print("ALFA_RC2_STRICT_REJECT")
        print(f"query_result: {query_result_path}")
        print(f"manifest: {manifest_path}")
        return query_exit

    manifest_path = write_failure_manifest(
        run_id=run_id,
        document_stem=document_stem,
        source_path=source_path,
        question=args.question,
        runs_dir=runs_dir,
        failed_gate="query_gate",
        reject_type="INTERNAL_ERROR",
        reject_reason=f"query failed with exit code {query_exit}",
        latency_ms=int((time.perf_counter() - start) * 1000),
    )
    print(f"manifest: {manifest_path}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
