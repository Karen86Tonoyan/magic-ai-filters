from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from packages.core.models import AnswerResult, RequestContext, RouteResult, SafetyAssessment


class AuditLogger:
    def __init__(self, log_dir: Path) -> None:
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.runtime_path = self.log_dir / "alfa-core-runtime.log"
        self.audit_path = self.log_dir / "alfa-core-audit.log"

    def log_runtime(self, event: str, **payload: Any) -> None:
        self._write(self.runtime_path, {"event": event, **payload})

    def log_decision(
        self,
        request: RequestContext,
        route_result: RouteResult,
        safety: SafetyAssessment,
        result: AnswerResult,
    ) -> None:
        payload = {
            "request_id": request.request_id,
            "mode": request.mode.value,
            "request": self._redact_request(request),
            "route": self._to_json(route_result),
            "safety": self._to_json(safety),
            "result": {
                "decision": result.decision.value,
                "warnings": list(result.warnings),
                "citation_count": len(result.citations),
                "has_error": result.error is not None,
                "answer_length": len(result.answer),
            },
        }
        self._write(self.audit_path, payload)

    def _redact_request(self, request: RequestContext) -> dict[str, Any]:
        return {
            "workspace_path": request.workspace_path,
            "file_path": request.file_path,
            "language": request.language,
            "question_length": len(request.question or ""),
            "selection_length": len(request.selection or ""),
            "metadata_keys": sorted(request.metadata.keys()),
        }

    def _write(self, path: Path, payload: dict[str, Any]) -> None:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **payload,
        }
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    @staticmethod
    def _to_json(value: Any) -> Any:
        if is_dataclass(value):
            result = asdict(value)
        else:
            result = value
        if isinstance(result, dict):
            for key, item in list(result.items()):
                if hasattr(item, "value"):
                    result[key] = item.value
        return result
