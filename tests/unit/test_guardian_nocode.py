from packages.core.nocode_runtime import NoCodeAppRuntime
from packages.safety.guardian import GuardianSecurityLayer
from packages.schemas.nocode import DeployAppRequestModel, ExecuteAppRequestModel


def _safe_payload() -> DeployAppRequestModel:
    return DeployAppRequestModel.model_validate(
        {
            'schema': {
                'name': 'Sleep Guardian',
                'components': [
                    {
                        'id': 'screen-1',
                        'type': 'container',
                        'name': 'Main Screen',
                    }
                ],
                'state': [
                    {'name': 'phone_mode', 'type': 'string', 'default': 'normal'},
                    {'name': 'auth_mode', 'type': 'string', 'default': 'biometric_or_passcode'},
                    {'name': 'safe_status', 'type': 'string', 'default': 'locked'},
                    {'name': 'token_status', 'type': 'string', 'default': 'active'},
                ],
                'bindings': [
                    {
                        'event': 'sleep_detected',
                        'conditions': [
                            {'source': 'sleep.deep', 'operator': 'equals', 'value': True},
                        ],
                        'actions': [
                            {'type': 'quiet_phone', 'payload': {}},
                            {'type': 'require_passcode', 'payload': {}},
                            {'type': 'send_cloud_signal', 'payload': {'signal': 'sleep-mode'}},
                        ],
                    }
                ],
                'permissions': [
                    'device.audio.modify',
                    'auth.policy.write',
                    'cloud.signal.write',
                ],
                'metadata': {
                    'cloud_required': True,
                    'require_token_validation': True,
                },
            }
        }
    )


def test_guardian_blocks_unsafe_unlock_actions():
    guardian = GuardianSecurityLayer()
    payload = _safe_payload()
    payload.app_schema.bindings[0].actions[0].type = 'unlock_device'
    payload.app_schema.permissions = ['device.unlock']

    result = guardian.validate_schema(payload.app_schema)

    assert result.is_valid is False
    assert any('unlock_device' in reason for reason in result.blocked_reasons)


def test_runtime_deploy_and_execute_safe_schema():
    guardian = GuardianSecurityLayer()
    runtime = NoCodeAppRuntime()
    payload = _safe_payload()

    validation = guardian.validate_schema(payload.app_schema)
    assert validation.is_valid is True

    deployment = runtime.deploy(payload, validation)
    execution = runtime.execute(
        deployment.app_id,
        ExecuteAppRequestModel(
            event='sleep_detected',
            input={'sleep': {'deep': True}},
            token='token-12345',
            cloud_attested=True,
        ),
    )

    assert execution.status == 'ok'
    assert len(execution.executed_actions) == 3
    assert execution.state['phone_mode'] == 'silent'
    assert execution.state['auth_mode'] == 'passcode_only'
    assert execution.state['cloud_last_signal'] == 'sleep-mode'
