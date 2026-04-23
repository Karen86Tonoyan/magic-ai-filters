from __future__ import annotations

import httpx

from packages.core.errors import UpstreamServiceError, UpstreamTimeoutError
from packages.core.settings import Settings, load_settings


class OllamaError(UpstreamServiceError):
    code = "OLLAMA_ERROR"


class OllamaConnectionError(OllamaError):
    code = "OLLAMA_CONNECTION_ERROR"


class OllamaTimeoutError(UpstreamTimeoutError):
    code = "OLLAMA_TIMEOUT"


class OllamaClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()

    def health(self) -> bool:
        try:
            with httpx.Client(timeout=self.settings.ollama_timeout_seconds) as client:
                response = client.get(f"{self.settings.ollama_base_url}/api/tags")
                response.raise_for_status()
            return True
        except httpx.HTTPError:
            return False

    def chat(self, messages: list[dict[str, str]]) -> str:
        payload = {
            "model": self.settings.ollama_model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.2},
        }
        last_error: Exception | None = None
        for attempt in range(self.settings.ollama_retries + 1):
            try:
                with httpx.Client(timeout=self.settings.ollama_timeout_seconds) as client:
                    response = client.post(f"{self.settings.ollama_base_url}/api/chat", json=payload)
                    response.raise_for_status()
                    data = response.json()
                content = (data.get("message") or {}).get("content", "").strip()
                if not content:
                    raise OllamaError("Ollama returned an empty response.")
                return content
            except httpx.ReadTimeout as exc:
                last_error = exc
                if attempt >= self.settings.ollama_retries:
                    raise OllamaTimeoutError("Ollama request timed out.") from exc
            except httpx.ConnectError as exc:
                raise OllamaConnectionError("Could not connect to Ollama.") from exc
            except httpx.HTTPStatusError as exc:
                raise OllamaError(f"Ollama returned HTTP {exc.response.status_code}.") from exc
            except httpx.HTTPError as exc:
                raise OllamaError("Unexpected Ollama HTTP error.") from exc
        raise OllamaError(str(last_error) if last_error else "Unknown Ollama error.")
