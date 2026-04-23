from __future__ import annotations

import hashlib
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from packages.core.errors import AlfaCoreError, RequestValidationError, ResourceNotFoundError
from packages.core.models import AnswerResult, ErrorInfo, Mode, RequestContext, RouteDecision
from packages.core.nocode_runtime import NoCodeAppRuntime
from packages.core.orchestrator import Orchestrator
from packages.core.prompting import PromptRegistry
from packages.core.settings import Settings, load_settings
from packages.llm.factory import build_llm_client
from packages.memory.retrieval import RetrievalService
from packages.router.router import Router
from packages.safety.guardian import GuardianSecurityLayer
from packages.safety.policy import SafetyPolicy
from packages.schemas.api import AskRequestModel, CodeActionRequestModel, RouteRequestModel, from_domain_result
from packages.schemas.nocode import DeployAppRequestModel, ExecuteAppRequestModel
from packages.telemetry.audit import AuditLogger


def build_default_orchestrator(settings: Settings) -> Orchestrator:
    audit_logger = AuditLogger(settings.log_dir)
    return Orchestrator(
        router=Router(),
        safety_policy=SafetyPolicy(),
        llm_client=build_llm_client(settings),
        retrieval_service=RetrievalService(settings=settings),
        audit_logger=audit_logger,
        prompt_registry=PromptRegistry(settings.prompt_dir),
    )


def _workspace_id(path: Path) -> str:
    return hashlib.sha256(str(path.resolve()).encode('utf-8')).hexdigest()[:16]


def _build_context(mode: Mode, payload, request_id: str) -> RequestContext:
    workspace_path = Path(payload.workspace_path).resolve() if getattr(payload, 'workspace_path', None) else None
    file_path = Path(payload.file_path).resolve() if getattr(payload, 'file_path', None) else None
    if mode != Mode.ROUTE and workspace_path is None:
        raise RequestValidationError('workspace_path is required.')
    if workspace_path and not workspace_path.exists():
        raise ResourceNotFoundError('workspace_path does not exist.')
    if file_path:
        if not file_path.exists():
            raise ResourceNotFoundError('file_path does not exist.')
        if workspace_path and not file_path.is_relative_to(workspace_path):
            raise ResourceNotFoundError('file_path must stay inside workspace_path.')
    metadata = dict(getattr(payload, 'metadata', {}) or {})
    if workspace_path:
        metadata.setdefault('workspace_id', _workspace_id(workspace_path))
    return RequestContext(
        request_id=request_id,
        mode=mode,
        workspace_path=str(workspace_path) if workspace_path else None,
        file_path=str(file_path) if file_path else None,
        language=getattr(payload, 'language', None),
        question=getattr(payload, 'question', None),
        selection=getattr(payload, 'selection', None),
        metadata=metadata,
    )


def _error_result(request_id: str, mode: Mode, exc: AlfaCoreError) -> AnswerResult:
    return AnswerResult(
        request_id=request_id,
        mode=mode,
        decision=RouteDecision.BLOCK if exc.status_code == 400 else RouteDecision.ESCALATE,
        answer=exc.message,
        warnings=[],
        error=ErrorInfo(code=exc.code, message=exc.message),
    )


def _error_response(audit_logger: AuditLogger, request_id: str, mode: Mode, exc: AlfaCoreError, event: str) -> JSONResponse:
    audit_logger.log_runtime(event, request_id=request_id, mode=mode.value, code=exc.code)
    body = from_domain_result(_error_result(request_id, mode, exc)).model_dump()
    return JSONResponse(status_code=exc.status_code, content=body)


def _handle_answer(orchestrator: Orchestrator, audit_logger: AuditLogger, mode: Mode, payload):
    request_id = str(uuid4())
    try:
        context = _build_context(mode, payload, request_id=request_id)
        result = orchestrator.answer(context)
        return from_domain_result(result)
    except AlfaCoreError as exc:
        return _error_response(audit_logger, request_id, mode, exc, 'api_error')


def create_app(settings: Settings | None = None, orchestrator: Orchestrator | None = None) -> FastAPI:
    settings = settings or load_settings()
    orchestrator = orchestrator or build_default_orchestrator(settings)
    audit_logger = orchestrator.audit_logger
    guardian = GuardianSecurityLayer()
    app_runtime = NoCodeAppRuntime()
    app = FastAPI(title='ALFA-CORE API', version='0.1.0')

    @app.get('/health')
    def health() -> dict[str, object]:
        return {
            'status': 'ok',
            'migration_status': 'canonical migration in progress',
            'canonical_backend': 'python-first',
            'api_host': settings.api_host,
            'api_port': settings.api_port,
            'llm_provider': settings.llm_provider,
            'llm_model': settings.grok_model if settings.llm_provider in {'grok', 'xai'} else settings.ollama_model,
            'ollama_base_url': settings.ollama_base_url,
            'grok_base_url': settings.grok_base_url,
            'qdrant_url': settings.qdrant_url,
        }

    @app.post('/route')
    def route_endpoint(payload: RouteRequestModel):
        request_id = str(uuid4())
        mode = Mode.ROUTE
        try:
            context = _build_context(mode, payload, request_id=request_id)
            result = orchestrator.route_only(context)
            return from_domain_result(result)
        except AlfaCoreError as exc:
            return _error_response(audit_logger, request_id, mode, exc, 'route_error')

    @app.post('/ask')
    def ask_endpoint(payload: AskRequestModel):
        return _handle_answer(orchestrator, audit_logger, Mode.ASK, payload)

    @app.post('/explain')
    def explain_endpoint(payload: CodeActionRequestModel):
        return _handle_answer(orchestrator, audit_logger, Mode.EXPLAIN, payload)

    @app.post('/find-bug')
    def find_bug_endpoint(payload: CodeActionRequestModel):
        return _handle_answer(orchestrator, audit_logger, Mode.FIND_BUG, payload)

    @app.post('/next-step')
    def next_step_endpoint(payload: CodeActionRequestModel):
        return _handle_answer(orchestrator, audit_logger, Mode.NEXT_STEP, payload)

    @app.post('/api/apps/deploy')
    def deploy_app(payload: DeployAppRequestModel):
        validation = guardian.validate_schema(payload.app_schema)
        if not validation.is_valid:
            audit_logger.log_runtime(
                'app_deploy_blocked',
                app_name=payload.app_schema.name,
                blocked_reason_count=len(validation.blocked_reasons),
            )
            return JSONResponse(
                status_code=400,
                content={
                    'status': 'blocked',
                    'guardian': validation.model_dump(),
                },
            )

        deployment = app_runtime.deploy(payload, validation)
        audit_logger.log_runtime(
            'app_deploy',
            app_id=deployment.app_id,
            app_name=deployment.name,
            component_count=len(payload.app_schema.components),
            binding_count=len(payload.app_schema.bindings),
        )
        return deployment

    @app.post('/api/apps/{app_id}/execute')
    def execute_app(app_id: str, payload: ExecuteAppRequestModel):
        try:
            result = app_runtime.execute(app_id, payload)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail='App not found.') from exc

        audit_logger.log_runtime(
            'app_execute',
            app_id=app_id,
            trigger_event=payload.event,
            status=result.status,
            action_count=len(result.executed_actions),
        )
        return result

    @app.get('/api/apps/{app_id}/state')
    def app_state(app_id: str):
        try:
            return app_runtime.get_state(app_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail='App not found.') from exc

    return app


app = create_app()
