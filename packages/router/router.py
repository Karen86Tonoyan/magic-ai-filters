from __future__ import annotations

from packages.core.models import ActionIntent, Mode, RequestContext, RiskLevel, RouteDecision, RouteResult

BLOCK_PATTERNS = (
    "ignore previous instructions",
    "bypass guardrails",
    "exfiltrate",
    "reveal secrets",
    "steal token",
    "disable safety",
    "prompt injection",
)

ESCALATE_PATTERNS = (
    "execute command",
    "run command",
    "deploy to production",
    "terraform apply",
    "kubectl delete",
    "rotate key",
    "delete database",
    "drop database",
)

SIMULATE_PATTERNS = (
    "simulate",
    "dry run",
    "what would happen",
    "preview only",
)

VERIFY_PATTERNS = (
    "not sure",
    "which one",
    "should i",
    "recommend",
)


class Router:
    def route(self, request: RequestContext) -> RouteResult:
        text = request.combined_text.lower()
        intent = self._infer_intent(request.mode)

        if any(pattern in text for pattern in BLOCK_PATTERNS):
            return RouteResult(
                decision=RouteDecision.BLOCK,
                risk_level=RiskLevel.CRITICAL,
                action_intent=intent,
                reasons=["Detected disallowed prompt-injection or exfiltration pattern."],
            )

        if request.mode in {Mode.EXPLAIN, Mode.FIND_BUG, Mode.NEXT_STEP} and (not request.file_path or not request.selection):
            return RouteResult(
                decision=RouteDecision.VERIFY,
                risk_level=RiskLevel.MEDIUM,
                action_intent=intent,
                reasons=["Code-specific mode requires both file_path and selection."],
            )

        if any(pattern in text for pattern in SIMULATE_PATTERNS):
            return RouteResult(
                decision=RouteDecision.SIMULATE,
                risk_level=RiskLevel.MEDIUM,
                action_intent=intent,
                reasons=["Request explicitly asks for a simulation-only path."],
            )

        if any(pattern in text for pattern in ESCALATE_PATTERNS):
            return RouteResult(
                decision=RouteDecision.ESCALATE,
                risk_level=RiskLevel.HIGH,
                action_intent=ActionIntent.EXECUTE,
                reasons=["Request implies a high-impact environment change."],
            )

        if request.mode == Mode.ROUTE and any(pattern in text for pattern in VERIFY_PATTERNS):
            return RouteResult(
                decision=RouteDecision.VERIFY,
                risk_level=RiskLevel.MEDIUM,
                action_intent=intent,
                reasons=["Request needs a clarification-style decision path."],
            )

        return RouteResult(
            decision=RouteDecision.ACCEPT,
            risk_level=RiskLevel.LOW,
            action_intent=intent,
            reasons=["Request is a read-focused analysis path."],
        )

    @staticmethod
    def _infer_intent(mode: Mode) -> ActionIntent:
        mapping = {
            Mode.ROUTE: ActionIntent.ROUTE,
            Mode.ASK: ActionIntent.ASK,
            Mode.EXPLAIN: ActionIntent.EXPLAIN,
            Mode.FIND_BUG: ActionIntent.FIND_BUG,
            Mode.NEXT_STEP: ActionIntent.NEXT_STEP,
        }
        return mapping.get(mode, ActionIntent.UNKNOWN)
