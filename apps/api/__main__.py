from __future__ import annotations

import uvicorn

from packages.core.settings import load_settings


def main() -> None:
    settings = load_settings()
    uvicorn.run("apps.api.main:app", host=settings.api_host, port=settings.api_port, reload=False)


if __name__ == "__main__":
    main()
