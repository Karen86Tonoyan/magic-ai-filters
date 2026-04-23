from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from packages.core.models import AnswerResult, Citation, ErrorInfo


class CitationModel(BaseModel):
    doc_id: str
    title: str
    relative_path: str
    doc_type: str
    chunk_index: int
    score: float


class ErrorInfoModel(BaseModel):
    code: str
    message: str


class AnswerEnvelopeModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    request_id: str
    mode: str
    decision: str
    answer: str
    citations: list[CitationModel] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    error: ErrorInfoModel | None = None


class RouteRequestModel(BaseModel):
    workspace_path: str | None = None
    file_path: str | None = None
    language: str | None = None
    question: str | None = None
    selection: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class AskRequestModel(BaseModel):
    workspace_path: str
    question: str
    file_path: str | None = None
    language: str | None = None
    selection: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class CodeActionRequestModel(BaseModel):
    workspace_path: str
    file_path: str
    language: str
    selection: str
    question: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


def _citation_model(citation: Citation) -> CitationModel:
    return CitationModel(
        doc_id=citation.doc_id,
        title=citation.title,
        relative_path=citation.relative_path,
        doc_type=citation.doc_type,
        chunk_index=citation.chunk_index,
        score=citation.score,
    )


def _error_model(error: ErrorInfo | None) -> ErrorInfoModel | None:
    if error is None:
        return None
    return ErrorInfoModel(code=error.code, message=error.message)


def from_domain_result(result: AnswerResult) -> AnswerEnvelopeModel:
    return AnswerEnvelopeModel(
        request_id=result.request_id,
        mode=result.mode.value,
        decision=result.decision.value,
        answer=result.answer,
        citations=[_citation_model(item) for item in result.citations],
        warnings=list(result.warnings),
        error=_error_model(result.error),
    )
