from __future__ import annotations

import hashlib
import json

from packages.schemas.nocode import GuardianValidationModel, NoCodeAppSchemaModel

ALLOWED_ACTIONS = frozenset({
    'log_event',
    'notify_user',
    'quiet_phone',
    'raise_alarm',
    'require_passcode',
    'revoke_token',
    'send_cloud_signal',
    'sleep_mode',
    'lock_safe',
})

BLOCKED_ACTIONS = frozenset({
    'unlock_device',
    'disable_lockscreen',
    'bypass_biometric',
    'open_safe',
    'unencrypt_keys',
    'export_raw_tokens',
})

ACTION_PERMISSIONS = {
    'log_event': 'audit.write',
    'notify_user': 'notification.send',
    'quiet_phone': 'device.audio.modify',
    'raise_alarm': 'alarm.local',
    'require_passcode': 'auth.policy.write',
    'revoke_token': 'auth.token.revoke',
    'send_cloud_signal': 'cloud.signal.write',
    'sleep_mode': 'device.power.manage',
    'lock_safe': 'safe.lock',
}

BLOCKED_PERMISSIONS = frozenset({
    'device.unlock',
    'biometric.override',
    'safe.open',
    'credential.export',
})


class GuardianSecurityLayer:
    def sanitize_actions(self, schema: NoCodeAppSchemaModel) -> list[str]:
        issues: list[str] = []
        for binding in schema.bindings:
            for action in binding.actions:
                if action.type in BLOCKED_ACTIONS:
                    issues.append(f'Action "{action.type}" is blocked by guardian policy.')
                elif action.type not in ALLOWED_ACTIONS:
                    issues.append(f'Action "{action.type}" is not in the runtime allowlist.')
        return issues

    def check_permissions(self, schema: NoCodeAppSchemaModel, action_types: set[str]) -> list[str]:
        issues: list[str] = []
        declared = set(schema.permissions)

        for permission in sorted(declared & BLOCKED_PERMISSIONS):
            issues.append(f'Permission "{permission}" is blocked by guardian policy.')

        for action_type in sorted(action_types):
            required_permission = ACTION_PERMISSIONS.get(action_type)
            if required_permission and required_permission not in declared:
                issues.append(f'Action "{action_type}" requires permission "{required_permission}".')

        return issues

    def sign_payload(self, schema: NoCodeAppSchemaModel) -> str:
        payload = json.dumps(schema.model_dump(mode='json'), ensure_ascii=False, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()

    def validate_schema(self, schema: NoCodeAppSchemaModel) -> GuardianValidationModel:
        action_types = {action.type for binding in schema.bindings for action in binding.actions}
        blocked_reasons = self.sanitize_actions(schema)
        blocked_reasons.extend(self.check_permissions(schema, action_types))

        warnings: list[str] = []
        observed_sources = self._collect_sources(schema)

        if not schema.components:
            warnings.append('Schema has no visual components yet.')
        if not schema.bindings:
            warnings.append('Schema has no event bindings yet.')
        if len(action_types) > 6:
            warnings.append('Schema exposes many runtime actions; review least privilege carefully.')

        if any(token in source for token in ('heart', 'pulse', 'sleep', 'watch', 'wearable') for source in observed_sources):
            warnings.append('Wearable and sleep telemetry is treated as assistive only and must not be used for medical conclusions.')

        if any(token in source for token in ('biometric', 'finger', 'face', 'eye') for source in observed_sources):
            warnings.append('Biometric signals may inform alerts only and cannot weaken authentication requirements.')

        if 'lock_safe' in action_types or 'safe.lock' in schema.permissions:
            warnings.append('Physical security integrations should fail closed and require attested coordination.')

        signature = self.sign_payload(schema)

        return GuardianValidationModel(
            is_valid=not blocked_reasons,
            blocked_reasons=blocked_reasons,
            warnings=warnings,
            required_permissions=sorted({ACTION_PERMISSIONS[action] for action in action_types if action in ACTION_PERMISSIONS}),
            declared_permissions=sorted(set(schema.permissions)),
            signature=signature,
        )

    @staticmethod
    def _collect_sources(schema: NoCodeAppSchemaModel) -> set[str]:
        values: set[str] = set()
        for binding in schema.bindings:
            values.add(binding.event.lower())
            for condition in binding.conditions:
                values.add(condition.source.lower())
            for action in binding.actions:
                if action.target:
                    values.add(action.target.lower())
        return values
