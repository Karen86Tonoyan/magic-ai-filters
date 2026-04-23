from __future__ import annotations

import httpx

from packages.core.errors import RequestValidationError, UpstreamServiceError, UpstreamTimeoutError
from packages.core.settings import Settings, load_settings


class GrokError(UpstreamServiceError):
    code = "GROK_ERROR"


class GrokAuthenticationError(GrokError):
    code = "GROK_AUTHENTICATION_ERROR"
    status_code = 502


class GrokConnectionError(GrokError):
    code = "GROK_CONNECTION_ERROR"


class GrokTimeoutError(UpstreamTimeoutError):
    code = "GROK_TIMEOUT"


class GrokClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()

    @property
    def _headers(self) -> dict[str, str]:
        api_key = self.settings.grok_api_key
        if not api_key:
            raise RequestValidationError(
                "ALFA_CORE_GROK_API_KEY or XAI_API_KEY is required when Grok provider is enabled."
            )
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def health(self) -> bool:
        try:
            with httpx.Client(timeout=self.settings.grok_timeout_seconds) as client:
                response = client.get(f"{self.settings.grok_base_url}/models", headers=self._headers)
                response.raise_for_status()
            return True
        except (RequestValidationError, httpx.HTTPError):
            return False

    def chat(self, messages: list[dict[str, str]]) -> str:
        payload = {
            "model": self.settings.grok_model,
            "input": messages,
            "stream": False,
            "store": False,
        }
        last_error: Exception | None = None
        for attempt in range(self.settings.grok_retries + 1):
            try:
                with httpx.Client(timeout=self.settings.grok_timeout_seconds) as client:
                    response = client.post(
                        f"{self.settings.grok_base_url}/responses",
                        headers=self._headers,
                        json=payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                content = self._extract_response_text(data)
                if not content:
                    raise GrokError("Grok returned an empty response.")
                return content
            except httpx.ReadTimeout as exc:
                last_error = exc
                if attempt >= self.settings.grok_retries:
                    raise GrokTimeoutError("Grok request timed out.") from exc
            except httpx.ConnectError as exc:
                raise GrokConnectionError("Could not connect to Grok/xAI.") from exc
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in {401, 403}:
                    raise GrokAuthenticationError("Grok/xAI rejected the API key or model access.") from exc
                raise GrokError(f"Grok returned HTTP {exc.response.status_code}.") from exc
            except httpx.HTTPError as exc:
                raise GrokError("Unexpected Grok HTTP error.") from exc
        raise GrokError(str(last_error) if last_error else "Unknown Grok error.")

    @staticmethod
    def _extract_response_text(data: dict[str, object]) -> str:
        output_text = data.get("output_text")
        if isinstance(output_text, str):
            return output_text.strip()

        output = data.get("output")
        if not isinstance(output, list):
            return ""

        chunks: list[str] = []
        for item in output:
            if not isinstance(item, dict) or item.get("type") != "message":
                continue
            content = item.get("content")
            if not isinstance(content, list):
                continue
            for part in content:
                if not isinstance(part, dict):
                    continue
                text = part.get("text")
                if part.get("type") == "output_text" and isinstance(text, str):
                    chunks.append(text)
        return "\n".join(chunks).strip()
