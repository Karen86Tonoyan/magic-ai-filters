import json

from packages.core.models import ActionIntent, AnswerResult, Mode, RequestContext, RiskLevel, RouteDecision, RouteResult, SafetyAssessment
from packages.telemetry.audit import AuditLogger


def test_audit_log_redacts_full_payload(tmp_path):
    logger = AuditLogger(tmp_path)
    request = RequestContext(
        request_id="req-1",
        mode=Mode.ASK,
        workspace_path="E:/CLAW BOT",
        question="explain",
        selection="SECRET_SELECTION_CONTENT",
    )
    route = RouteResult(RouteDecision.ACCEPT, RiskLevel.LOW, ActionIntent.ASK, ["ok"])
    safety = SafetyAssessment(RouteDecision.ACCEPT, RiskLevel.LOW, ["ok"], [])
    result = AnswerResult(request_id="req-1", mode=Mode.ASK, decision=RouteDecision.ACCEPT, answer="done")
    logger.log_decision(request, route, safety, result)
    payload = json.loads((tmp_path / "alfa-core-audit.log").read_text(encoding="utf-8").strip())
    assert payload["request"]["selection_length"] == len("SECRET_SELECTION_CONTENT")
    assert "SECRET_SELECTION_CONTENT" not in (tmp_path / "alfa-core-audit.log").read_text(encoding="utf-8")
