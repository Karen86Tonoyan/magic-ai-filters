from __future__ import annotations

import re

from packages.core.models import RequestContext, RiskLevel, RouteDecision, RouteResult, SafetyAssessment

SECRET_PATTERNS = (
    re.compile(r"sk-[A-Za-z0-9_-]{10,}"),
    re.compile(r"OPENAI_API_KEY", re.IGNORECASE),
    re.compile(r"api[_-]?key", re.IGNORECASE),
)


class SafetyPolicy:
    def evaluate(self, request: RequestContext, route_result: RouteResult) -> SafetyAssessment:
        reasons = list(route_result.reasons)
        warnings: list[str] = []
        decision = route_result.decision
        risk_level = route_result.risk_level
        text = request.combined_text

        if any(pattern.search(text) for pattern in SECRET_PATTERNS):
            decision = RouteDecision.BLOCK
            risk_level = RiskLevel.CRITICAL
            reasons.append("Request appears to contain credential-like material.")

        if request.selection and len(request.selection) > 12000:
            warnings.append("LARGE_SELECTION_TRUNCATED")

        if decision == RouteDecision.SIMULATE:
            warnings.append("SIMULATION_ONLY")

        if decision == RouteDecision.ACCEPT and request.mode.value in {"find-bug", "next-step"} and not request.language:
            warnings.append("LANGUAGE_NOT_PROVIDED")

        if decision == RouteDecision.ACCEPT and request.file_path and "system32" in request.file_path.lower():
            decision = RouteDecision.ESCALATE
            risk_level = RiskLevel.HIGH
            reasons.append("System-scope file path requires escalation.")

        return SafetyAssessment(
            decision=decision,
            risk_level=risk_level,
            reasons=reasons,
            warnings=warnings,
        )
