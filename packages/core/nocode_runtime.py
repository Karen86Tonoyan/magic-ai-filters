from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from packages.schemas.nocode import (
    AppActionModel,
    AppConditionModel,
    AppDeploymentResponseModel,
    AppExecutionResponseModel,
    AppStateResponseModel,
    DeployAppRequestModel,
    ExecuteAppRequestModel,
    GuardianValidationModel,
    NoCodeAppSchemaModel,
)


@dataclass(slots=True)
class DeployedNoCodeApp:
    app_id: str
    schema: NoCodeAppSchemaModel
    guardian: GuardianValidationModel
    state: dict[str, Any] = field(default_factory=dict)


class NoCodeAppRuntime:
    def __init__(self) -> None:
        self._apps: dict[str, DeployedNoCodeApp] = {}

    def deploy(
        self,
        request: DeployAppRequestModel,
        guardian: GuardianValidationModel,
    ) -> AppDeploymentResponseModel:
        app_id = f'app-{uuid4().hex[:12]}'
        state = self._initial_state(request.app_schema)
        deployed = DeployedNoCodeApp(
            app_id=app_id,
            schema=request.app_schema,
            guardian=guardian,
            state=state,
        )
        self._apps[app_id] = deployed
        return AppDeploymentResponseModel(
            app_id=app_id,
            name=request.app_schema.name,
            status='deployed',
            guardian=guardian,
            state=dict(state),
        )

    def get_state(self, app_id: str) -> AppStateResponseModel:
        deployed = self._apps[app_id]
        return AppStateResponseModel(
            app_id=deployed.app_id,
            name=deployed.schema.name,
            status='running',
            state=dict(deployed.state),
        )

    def execute(self, app_id: str, request: ExecuteAppRequestModel) -> AppExecutionResponseModel:
        deployed = self._apps[app_id]
        warnings: list[str] = []

        if self._requires_token_validation(deployed.schema) and not self._valid_token(request.token):
            warnings.append('TOKEN_VALIDATION_FAILED')
            return AppExecutionResponseModel(
                app_id=app_id,
                status='blocked',
                event=request.event,
                executed_actions=[],
                warnings=warnings,
                state=dict(deployed.state),
            )

        if self._requires_cloud_attestation(deployed.schema) and not request.cloud_attested:
            warnings.append('CLOUD_ATTESTATION_REQUIRED')
            return AppExecutionResponseModel(
                app_id=app_id,
                status='blocked',
                event=request.event,
                executed_actions=[],
                warnings=warnings,
                state=dict(deployed.state),
            )

        event_context = dict(request.input)
        event_context.update(request.metadata)
        deployed.state['last_event'] = request.event
        executed_actions: list[dict[str, Any]] = []

        for binding in deployed.schema.bindings:
            if binding.event != request.event:
                continue
            if not self._conditions_match(binding.conditions, event_context, deployed.state):
                continue
            for action in binding.actions:
                executed_actions.append(self._apply_action(action, deployed.state, request))

        return AppExecutionResponseModel(
            app_id=app_id,
            status='ok',
            event=request.event,
            executed_actions=executed_actions,
            warnings=warnings,
            state=dict(deployed.state),
        )

    @staticmethod
    def _initial_state(schema: NoCodeAppSchemaModel) -> dict[str, Any]:
        state = {field.name: field.default for field in schema.state}
        state.setdefault('app_status', 'running')
        return state

    @staticmethod
    def _requires_token_validation(schema: NoCodeAppSchemaModel) -> bool:
        return bool(schema.metadata.get('require_token_validation', False))

    @staticmethod
    def _requires_cloud_attestation(schema: NoCodeAppSchemaModel) -> bool:
        return bool(schema.metadata.get('cloud_required', False))

    @staticmethod
    def _valid_token(token: str | None) -> bool:
        return bool(token and len(token.strip()) >= 8)

    def _conditions_match(
        self,
        conditions: list[AppConditionModel],
        event_context: dict[str, Any],
        state: dict[str, Any],
    ) -> bool:
        if not conditions:
            return True

        for condition in conditions:
            current = self._resolve_source(condition.source, event_context, state)
            if not self._match_condition(current, condition.operator, condition.value):
                return False
        return True

    def _resolve_source(self, source: str, event_context: dict[str, Any], state: dict[str, Any]) -> Any:
        if source in event_context:
            return event_context[source]
        if source in state:
            return state[source]

        nested_event = self._nested_lookup(event_context, source)
        if nested_event is not None:
            return nested_event

        return self._nested_lookup(state, source)

    @staticmethod
    def _nested_lookup(root: dict[str, Any], dotted_path: str) -> Any:
        current: Any = root
        for part in dotted_path.split('.'):
            if not isinstance(current, dict) or part not in current:
                return None
            current = current[part]
        return current

    @staticmethod
    def _match_condition(current: Any, operator: str, expected: Any) -> bool:
        if operator == 'equals':
            return current == expected
        if operator == 'not_equals':
            return current != expected
        if operator == 'exists':
            return current is not None
        if operator == 'truthy':
            return bool(current)
        if operator == 'contains':
            return expected in current if current is not None else False
        if operator in {'gt', 'gte', 'lt', 'lte'}:
            try:
                left = float(current)
                right = float(expected)
            except (TypeError, ValueError):
                return False
            if operator == 'gt':
                return left > right
            if operator == 'gte':
                return left >= right
            if operator == 'lt':
                return left < right
            return left <= right
        return False

    def _apply_action(
        self,
        action: AppActionModel,
        state: dict[str, Any],
        request: ExecuteAppRequestModel,
    ) -> dict[str, Any]:
        payload = dict(action.payload)

        if action.type == 'quiet_phone':
            state['phone_mode'] = 'silent'
        elif action.type == 'sleep_mode':
            state['device_mode'] = 'sleep'
        elif action.type == 'require_passcode':
            state['auth_mode'] = 'passcode_only'
        elif action.type == 'raise_alarm':
            state['alarm_status'] = 'triggered'
            if 'reason' in payload:
                state['alarm_reason'] = payload['reason']
        elif action.type == 'revoke_token':
            state['token_status'] = 'revoked'
        elif action.type == 'send_cloud_signal':
            state['cloud_last_signal'] = payload.get('signal', request.event)
        elif action.type == 'lock_safe':
            state['safe_status'] = 'locked'
        elif action.type == 'notify_user':
            state['last_notification'] = payload.get('message', 'notification_requested')
        elif action.type == 'log_event':
            state['last_log_message'] = payload.get('message', request.event)

        return {
            'type': action.type,
            'target': action.target,
            'payload': payload,
            'status': 'applied',
        }
