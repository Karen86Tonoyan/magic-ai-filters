from pathlib import Path

from fastapi.testclient import TestClient

from apps.api.main import create_app
from packages.core.errors import UpstreamServiceError
from packages.core.orchestrator import Orchestrator
from packages.core.prompting import PromptRegistry
from packages.core.settings import load_settings
from packages.llm.grok_client import GrokTimeoutError
from packages.llm.ollama_client import OllamaTimeoutError
from packages.router.router import Router
from packages.safety.policy import SafetyPolicy
from packages.telemetry.audit import AuditLogger


class FakeLLM:
    def __init__(self, response="Synthetic answer", error=None):
        self.response = response
        self.error = error

    def chat(self, messages):
        if self.error:
            raise self.error
        return self.response


class FakeRetrieval:
    def __init__(self, records=None, warnings=None, error=None):
        self.records = records or []
        self.warnings = warnings or []
        self.error = error

    def retrieve(self, request):
        if self.error:
            raise self.error
        return type("RetrievalResult", (), {"records": self.records, "warnings": self.warnings})()


def build_test_client(tmp_path, llm=None, retrieval=None):
    settings = load_settings()
    audit = AuditLogger(tmp_path)
    orchestrator = Orchestrator(
        router=Router(),
        safety_policy=SafetyPolicy(),
        llm_client=llm or FakeLLM(),
        retrieval_service=retrieval or FakeRetrieval(
            records=[{
                "doc_id": "doc-1",
                "title": "Guide",
                "relative_path": "docs/guide.md",
                "doc_type": "documentation",
                "chunk_index": 0,
                "score": 0.9,
                "content": "Relevant context",
                "source_kind": "knowledge_base",
                "tags": ["python"],
            }]
        ),
        audit_logger=audit,
        prompt_registry=PromptRegistry(settings.prompt_dir),
    )
    app = create_app(settings=settings, orchestrator=orchestrator)
    return TestClient(app)


def test_health_endpoint(tmp_path):
    client = build_test_client(tmp_path)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_route_endpoint_returns_decision(tmp_path):
    client = build_test_client(tmp_path)
    response = client.post("/route", json={"question": "should i refactor this?", "workspace_path": str(tmp_path)})
    assert response.status_code == 200
    assert response.json()["decision"]


def test_ask_shape_is_stable(tmp_path):
    workspace = tmp_path / "ws"
    workspace.mkdir()
    response_file = workspace / "file.py"
    response_file.write_text("print('ok')", encoding="utf-8")
    client = build_test_client(tmp_path)
    payload = {
        "workspace_path": str(workspace),
        "question": "Explain this project.",
        "file_path": str(response_file),
        "language": "python",
        "selection": "print('ok')",
    }
    first = client.post("/ask", json=payload)
    second = client.post("/ask", json=payload)
    assert first.status_code == 200
    assert second.status_code == 200
    assert set(first.json().keys()) == set(second.json().keys()) == {"request_id", "mode", "decision", "answer", "citations", "warnings", "error"}


def test_missing_file_returns_404(tmp_path):
    workspace = tmp_path / "ws"
    workspace.mkdir()
    client = build_test_client(tmp_path)
    response = client.post(
        "/explain",
        json={
            "workspace_path": str(workspace),
            "file_path": str(workspace / "missing.py"),
            "language": "python",
            "selection": "print('missing')",
        },
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"


def test_ollama_timeout_maps_to_504(tmp_path):
    workspace = tmp_path / "ws"
    workspace.mkdir()
    file_path = workspace / "module.py"
    file_path.write_text("print('ok')", encoding="utf-8")
    client = build_test_client(tmp_path, llm=FakeLLM(error=OllamaTimeoutError("timeout")))
    response = client.post(
        "/ask",
        json={
            "workspace_path": str(workspace),
            "question": "Explain this project.",
            "file_path": str(file_path),
            "language": "python",
            "selection": "print('ok')",
        },
    )
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "OLLAMA_TIMEOUT"


def test_grok_timeout_maps_to_504(tmp_path):
    workspace = tmp_path / "ws"
    workspace.mkdir()
    file_path = workspace / "module.py"
    file_path.write_text("print('ok')", encoding="utf-8")
    client = build_test_client(tmp_path, llm=FakeLLM(error=GrokTimeoutError("timeout")))
    response = client.post(
        "/ask",
        json={
            "workspace_path": str(workspace),
            "question": "Explain this project.",
            "file_path": str(file_path),
            "language": "python",
            "selection": "print('ok')",
        },
    )
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "GROK_TIMEOUT"


def test_qdrant_error_maps_to_502(tmp_path):
    workspace = tmp_path / "ws"
    workspace.mkdir()
    file_path = workspace / "module.py"
    file_path.write_text("print('ok')", encoding="utf-8")
    client = build_test_client(tmp_path, retrieval=FakeRetrieval(error=UpstreamServiceError("qdrant failed")))
    response = client.post(
        "/ask",
        json={
            "workspace_path": str(workspace),
            "question": "Explain this project.",
            "file_path": str(file_path),
            "language": "python",
            "selection": "print('ok')",
        },
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_SERVICE_ERROR"
