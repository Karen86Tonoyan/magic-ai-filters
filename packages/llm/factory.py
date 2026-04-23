from __future__ import annotations

from typing import Protocol

from packages.core.errors import RequestValidationError
from packages.core.settings import Settings
from packages.llm.grok_client import GrokClient
from packages.llm.ollama_client import OllamaClient


class ChatClient(Protocol):
    def chat(self, messages: list[dict[str, str]]) -> str:
        ...


def build_llm_client(settings: Settings) -> ChatClient:
    provider = settings.llm_provider.strip().lower()
    if provider == "ollama":
        return OllamaClient(settings)
    if provider in {"grok", "xai"}:
        return GrokClient(settings)
    raise RequestValidationError(
        f"Unsupported ALFA_CORE_LLM_PROVIDER '{settings.llm_provider}'. Use 'ollama' or 'grok'."
    )
