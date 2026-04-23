from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class RouteDecision(StrEnum):
    ACCEPT = "ACCEPT"
    VERIFY = "VERIFY"
    SIMULATE = "SIMULATE"
    ESCALATE = "ESCALATE"
    BLOCK = "BLOCK"


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Mode(StrEnum):
    ROUTE = "route"
    ASK = "ask"
    EXPLAIN = "explain"
    FIND_BUG = "find-bug"
    NEXT_STEP = "next-step"


class ActionIntent(StrEnum):
    ROUTE = "ROUTE"
    ASK = "ASK"
    EXPLAIN = "EXPLAIN"
    FIND_BUG = "FIND_BUG"
    NEXT_STEP = "NEXT_STEP"
    EXECUTE = "EXECUTE"
    UNKNOWN = "UNKNOWN"


@dataclass(slots=True)
class RequestContext:
    request_id: str
    mode: Mode
    workspace_path: str | None = None
    file_path: str | None = None
    language: str | None = None
    question: str | None = None
    selection: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def combined_text(self) -> str:
        return "\n".join(
            part
            for part in (
                self.question,
                self.selection,
                self.file_path,
                self.language,
            )
            if part
        )


@dataclass(slots=True)
class Citation:
    doc_id: str
    title: str
    relative_path: str
    doc_type: str
    chunk_index: int
    score: float


@dataclass(slots=True)
class ErrorInfo:
    code: str
    message: str


@dataclass(slots=True)
class RouteResult:
    decision: RouteDecision
    risk_level: RiskLevel
    action_intent: ActionIntent
    reasons: list[str] = field(default_factory=list)


@dataclass(slots=True)
class SafetyAssessment:
    decision: RouteDecision
    risk_level: RiskLevel
    reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class AnswerResult:
    request_id: str
    mode: Mode
    decision: RouteDecision
    answer: str
    citations: list[Citation] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    error: ErrorInfo | None = None
