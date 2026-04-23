from __future__ import annotations


class AlfaCoreError(Exception):
    code = "ALFA_CORE_ERROR"
    status_code = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class RequestValidationError(AlfaCoreError):
    code = "REQUEST_VALIDATION_ERROR"
    status_code = 400


class ResourceNotFoundError(AlfaCoreError):
    code = "RESOURCE_NOT_FOUND"
    status_code = 404


class UpstreamServiceError(AlfaCoreError):
    code = "UPSTREAM_SERVICE_ERROR"
    status_code = 502


class UpstreamTimeoutError(AlfaCoreError):
    code = "UPSTREAM_TIMEOUT"
    status_code = 504
