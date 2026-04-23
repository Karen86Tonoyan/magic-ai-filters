from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

from packages.core.models import RequestContext
from packages.core.settings import Settings, load_settings
from packages.memory.qdrant_store import QdrantStore


@dataclass(slots=True)
class RetrievalResult:
    records: list[dict[str, object]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class RetrievalService:
    def __init__(self, settings: Settings | None = None, store: QdrantStore | None = None) -> None:
        self.settings = settings or load_settings()
        self.store = store or QdrantStore(self.settings)

    def retrieve(self, request: RequestContext) -> RetrievalResult:
        query = "\n\n".join(part for part in (request.question, request.selection, request.file_path, request.language) if part)
        if not query.strip():
            return RetrievalResult(records=[], warnings=["NO_QUERY_CONTEXT"])
        workspace_id = request.metadata.get("workspace_id") if request.metadata else None
        if not workspace_id and request.workspace_path:
            workspace_id = hashlib.sha256(str(Path(request.workspace_path).resolve()).encode("utf-8")).hexdigest()[:16]
        hits = self.store.search(query=query, workspace_id=str(workspace_id) if workspace_id else None, limit=self.settings.rag_top_k)
        warnings: list[str] = []
        if not hits:
            warnings.append("NO_RAG_HITS")
        elif max(hit.score for hit in hits) < self.settings.low_confidence_score:
            warnings.append("LOW_RETRIEVAL_CONFIDENCE")
        records = [
            {
                "doc_id": hit.doc_id,
                "title": hit.title,
                "relative_path": hit.relative_path,
                "doc_type": hit.doc_type,
                "chunk_index": hit.chunk_index,
                "score": hit.score,
                "content": hit.content,
                "source_kind": hit.source_kind,
                "tags": hit.tags,
            }
            for hit in hits
        ]
        return RetrievalResult(records=records, warnings=warnings)
