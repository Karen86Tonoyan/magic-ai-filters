from __future__ import annotations

import pytest

from packages.core.errors import RequestValidationError
from packages.core.settings import load_settings
from packages.llm.factory import build_llm_client
from packages.llm.grok_client import GrokClient
from packages.llm.ollama_client import OllamaClient


@pytest.fixture(autouse=True)
def clear_settings_cache():
    load_settings.cache_clear()
    yield
    load_settings.cache_clear()


def test_default_llm_provider_is_ollama(monkeypatch):
    monkeypatch.delenv("ALFA_CORE_LLM_PROVIDER", raising=False)

    client = build_llm_client(load_settings())

    assert isinstance(client, OllamaClient)


def test_grok_provider_builds_grok_client(monkeypatch):
    monkeypatch.setenv("ALFA_CORE_LLM_PROVIDER", "grok")
    monkeypatch.setenv("ALFA_CORE_GROK_API_KEY", "test-key")

    client = build_llm_client(load_settings())

    assert isinstance(client, GrokClient)


def test_grok_response_parser_reads_output_text():
    data = {
        "output": [
            {
                "type": "message",
                "content": [
                    {"type": "output_text", "text": "ALFA ready."},
                ],
            }
        ]
    }

    assert GrokClient._extract_response_text(data) == "ALFA ready."


def test_unknown_provider_is_rejected(monkeypatch):
    monkeypatch.setenv("ALFA_CORE_LLM_PROVIDER", "unknown")

    with pytest.raises(RequestValidationError):
        build_llm_client(load_settings())
