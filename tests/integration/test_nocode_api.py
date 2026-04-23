from fastapi.testclient import TestClient

from apps.api.main import create_app
from packages.core.orchestrator import Orchestrator
from packages.core.prompting import PromptRegistry
from packages.core.settings import load_settings
from packages.router.router import Router
from packages.safety.policy import SafetyPolicy
from packages.telemetry.audit import AuditLogger


class FakeLLM:
    def __init__(self, response='Synthetic answer'):
        self.response = response

    def chat(self, messages):
        return self.response


class FakeRetrieval:
    def __init__(self, records=None, warnings=None):
        self.records = records or []
        self.warnings = warnings or []

    def retrieve(self, request):
        return type('RetrievalResult', (), {'records': self.records, 'warnings': self.warnings})()


def build_test_client(tmp_path):
    settings = load_settings()
    audit = AuditLogger(tmp_path)
    orchestrator = Orchestrator(
        router=Router(),
        safety_policy=SafetyPolicy(),
        llm_client=FakeLLM(),
        retrieval_service=FakeRetrieval(
            records=[
                {
                    'doc_id': 'doc-1',
                    'title': 'Guide',
                    'relative_path': 'docs/guide.md',
                    'doc_type': 'documentation',
                    'chunk_index': 0,
                    'score': 0.9,
                    'content': 'Relevant context',
                    'source_kind': 'knowledge_base',
                    'tags': ['python'],
                }
            ]
        ),
        audit_logger=audit,
        prompt_registry=PromptRegistry(settings.prompt_dir),
    )
    app = create_app(settings=settings, orchestrator=orchestrator)
    return TestClient(app)


def _deploy_payload() -> dict[str, object]:
    return {
        'schema': {
            'name': 'Sleep Guardian',
            'components': [{'id': 'screen-1', 'type': 'container'}],
            'state': [
                {'name': 'phone_mode', 'type': 'string', 'default': 'normal'},
                {'name': 'auth_mode', 'type': 'string', 'default': 'biometric_or_passcode'},
            ],
            'bindings': [
                {
                    'event': 'sleep_detected',
                    'conditions': [{'source': 'sleep.deep', 'operator': 'equals', 'value': True}],
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


def test_deploy_execute_and_get_state(tmp_path):
    client = build_test_client(tmp_path)

    deploy_response = client.post('/api/apps/deploy', json=_deploy_payload())
    assert deploy_response.status_code == 200
    app_id = deploy_response.json()['app_id']

    execute_response = client.post(
        f'/api/apps/{app_id}/execute',
        json={
            'event': 'sleep_detected',
            'input': {'sleep': {'deep': True}},
            'token': 'token-12345',
            'cloud_attested': True,
        },
    )
    assert execute_response.status_code == 200
    assert execute_response.json()['status'] == 'ok'
    assert execute_response.json()['state']['phone_mode'] == 'silent'

    state_response = client.get(f'/api/apps/{app_id}/state')
    assert state_response.status_code == 200
    assert state_response.json()['state']['auth_mode'] == 'passcode_only'


def test_unsafe_deploy_is_blocked(tmp_path):
    client = build_test_client(tmp_path)
    payload = _deploy_payload()
    payload['schema']['bindings'][0]['actions'][0]['type'] = 'unlock_device'
    payload['schema']['permissions'] = ['device.unlock']

    response = client.post('/api/apps/deploy', json=payload)

    assert response.status_code == 400
    assert response.json()['status'] == 'blocked'
    assert response.json()['guardian']['is_valid'] is False
