import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"


def run_cmd(cmd: list[str]) -> dict[str, Any]:
    proc = subprocess.run(
        cmd,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return {
        "cmd": cmd,
        "exit_code": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }


def main() -> int:
    RESULTS.mkdir(parents=True, exist_ok=True)

    report: dict[str, Any] = {
        "pipeline": "RC2_EVIDENCE_GATE_SMOKE",
        "steps": [],
        "expected": {
            "positive_query_exit_code": 0,
            "negative_query_exit_code": 2,
        },
        "passed": False,
    }

    # 1) index README -> structure + section map
    step_index = run_cmd(
        [sys.executable, ".\\alfa_index_document.py", "--md_path", ".\\README.md"]
    )
    step_index["name"] = "index_readme"
    report["steps"].append(step_index)

    section_map = RESULTS / "README_alfa_section_map.json"

    # 2) validate section map
    step_validate = run_cmd(
        [sys.executable, ".\\alfa_section_map_validate.py", str(section_map)]
    )
    step_validate["name"] = "validate_section_map"
    report["steps"].append(step_validate)

    # 3) positive query (strict -> should pass, code 0)
    positive_out = RESULTS / "README_query_result.json"
    step_query_positive = run_cmd(
        [
            sys.executable,
            ".\\alfa_rc2_query.py",
            "--section_map",
            str(section_map),
            "--question",
            "PageIndex core features and deployment options",
            "--json_out",
            str(positive_out),
            "--strict",
            "--min_confidence",
            "0.6",
            "--min_evidence_paths",
            "1",
        ]
    )
    step_query_positive["name"] = "positive_query_strict"
    report["steps"].append(step_query_positive)

    # 4) negative query (strict -> should reject, code 2)
    negative_out = RESULTS / "README_query_rejected.json"
    step_query_negative = run_cmd(
        [
            sys.executable,
            ".\\alfa_rc2_query.py",
            "--section_map",
            str(section_map),
            "--question",
            "What is the tax policy of Poland?",
            "--json_out",
            str(negative_out),
            "--strict",
            "--min_confidence",
            "0.6",
            "--min_evidence_paths",
            "1",
        ]
    )
    step_query_negative["name"] = "negative_query_strict"
    report["steps"].append(step_query_negative)

    checks = {
        "index_exit_code_zero": step_index["exit_code"] == 0,
        "validate_exit_code_zero": step_validate["exit_code"] == 0,
        "positive_exit_code_zero": step_query_positive["exit_code"] == 0,
        "negative_exit_code_two": step_query_negative["exit_code"] == 2,
        "section_map_exists": section_map.exists(),
        "positive_json_exists": positive_out.exists(),
        "negative_json_exists": negative_out.exists(),
    }
    report["checks"] = checks
    report["passed"] = all(checks.values())

    report_path = RESULTS / "RC2_SMOKE_REPORT.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if report["passed"]:
        print("RC2_SMOKE_OK")
        print(str(report_path))
        return 0

    print("RC2_SMOKE_FAIL")
    print(str(report_path))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
