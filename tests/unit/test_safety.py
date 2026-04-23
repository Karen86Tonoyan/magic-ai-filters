from packages.core.models import ActionIntent, Mode, RequestContext, RiskLevel, RouteDecision, RouteResult
from packages.safety.policy import SafetyPolicy


def test_high_risk_request_is_blocked_or_escalated():
    policy = SafetyPolicy()
    request = RequestContext(request_id="1", mode=Mode.ASK, workspace_path="E:/CLAW BOT", question="OPENAI_API_KEY=sk-test-123456789")
    route = RouteResult(RouteDecision.ACCEPT, RiskLevel.LOW, ActionIntent.ASK, ["read path"])
    result = policy.evaluate(request, route)
    assert result.decision in {RouteDecision.BLOCK, RouteDecision.ESCALATE}


def test_low_risk_request_can_stay_accept_or_verify():
    policy = SafetyPolicy()
    request = RequestContext(request_id="2", mode=Mode.ASK, workspace_path="E:/CLAW BOT", question="Explain routing decisions.")
    route = RouteResult(RouteDecision.ACCEPT, RiskLevel.LOW, ActionIntent.ASK, ["read path"])
    result = policy.evaluate(request, route)
    assert result.decision in {RouteDecision.ACCEPT, RouteDecision.VERIFY}
