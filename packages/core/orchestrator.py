from __future__ import annotations

from packages.core.models import AnswerResult, Citation, RequestContext, RouteDecision


class Orchestrator:
    def __init__(self, router, safety_policy, llm_client, retrieval_service, audit_logger, prompt_registry) -> None:
        self.router = router
        self.safety_policy = safety_policy
        self.llm_client = llm_client
        self.retrieval_service = retrieval_service
        self.audit_logger = audit_logger
        self.prompt_registry = prompt_registry

    def route_only(self, request: RequestContext) -> AnswerResult:
        route_result = self.router.route(request)
        safety = self.safety_policy.evaluate(request, route_result)
        answer = "; ".join(safety.reasons) or f"Decision: {safety.decision.value}"
        result = AnswerResult(
            request_id=request.request_id,
            mode=request.mode,
            decision=safety.decision,
            answer=answer,
            warnings=list(safety.warnings),
        )
        self.audit_logger.log_decision(request, route_result, safety, result)
        return result

    def answer(self, request: RequestContext) -> AnswerResult:
        route_result = self.router.route(request)
        safety = self.safety_policy.evaluate(request, route_result)
        if safety.decision in {RouteDecision.BLOCK, RouteDecision.ESCALATE}:
            answer = "; ".join(safety.reasons) or "Request requires manual review."
            result = AnswerResult(
                request_id=request.request_id,
                mode=request.mode,
                decision=safety.decision,
                answer=answer,
                warnings=list(safety.warnings),
            )
            self.audit_logger.log_decision(request, route_result, safety, result)
            return result

        retrieval_result = self.retrieval_service.retrieve(request)
        messages = self.prompt_registry.build_messages(request.mode, request, retrieval_result.records)
        llm_answer = self.llm_client.chat(messages)
        citations = [
            Citation(
                doc_id=str(record["doc_id"]),
                title=str(record["title"]),
                relative_path=str(record["relative_path"]),
                doc_type=str(record["doc_type"]),
                chunk_index=int(record["chunk_index"]),
                score=float(record["score"]),
            )
            for record in retrieval_result.records
        ]
        warnings = list(dict.fromkeys([*safety.warnings, *retrieval_result.warnings]))
        result = AnswerResult(
            request_id=request.request_id,
            mode=request.mode,
            decision=safety.decision,
            answer=llm_answer,
            citations=citations,
            warnings=warnings,
            error=None,
        )
        self.audit_logger.log_decision(request, route_result, safety, result)
        return result
