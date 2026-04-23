from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Any

import httpx

from packages.core.errors import UpstreamServiceError
from packages.core.settings import Settings, load_settings


class QdrantError(UpstreamServiceError):
    code = "QDRANT_ERROR"


class QdrantConnectionError(QdrantError):
    code = "QDRANT_CONNECTION_ERROR"


class QdrantTimeoutError(QdrantError):
    code = "QDRANT_TIMEOUT"
    status_code = 502


@dataclass(slots=True)
class RetrievalHit:
    doc_id: str
    title: str
    relative_path: str
    doc_type: str
    chunk_index: int
    score: float
    content: str
    source_kind: str
    tags: list[str]


class HashEmbeddingModel:
    def __init__(self, dimension: int) -> None:
        self.dimension = dimension

    def encode(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        tokens = [token for token in text.lower().split() if token]
        if not tokens:
            return vector
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]


class EmbeddingService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()
        self.backend = "hash"
        self.model = HashEmbeddingModel(self.settings.hash_embedding_dim)
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            return
        self.backend = "sentence-transformers"
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    @property
    def dimension(self) -> int:
        if self.backend == "hash":
            return self.settings.hash_embedding_dim
        sample = self.encode("dimension probe")
        return len(sample)

    def encode(self, text: str) -> list[float]:
        if self.backend == "hash":
            return self.model.encode(text)
        return [float(value) for value in self.model.encode(text).tolist()]


class QdrantStore:
    def __init__(self, settings: Settings | None = None, embedding_service: EmbeddingService | None = None) -> None:
        self.settings = settings or load_settings()
        self.embedding_service = embedding_service or EmbeddingService(self.settings)

    def ensure_collection(self) -> None:
        payload = {
            "vectors": {
                "size": self.embedding_service.dimension,
                "distance": "Cosine",
            }
        }
        try:
            with httpx.Client(timeout=self.settings.qdrant_timeout_seconds) as client:
                response = client.put(f"{self.settings.qdrant_url}/collections/{self.settings.qdrant_collection}", json=payload)
                response.raise_for_status()
        except httpx.ReadTimeout as exc:
            raise QdrantTimeoutError("Qdrant collection setup timed out.") from exc
        except httpx.ConnectError as exc:
            raise QdrantConnectionError("Could not connect to Qdrant.") from exc
        except httpx.HTTPError as exc:
            raise QdrantError("Failed to ensure Qdrant collection.") from exc

    def upsert_chunks(self, chunks: list[dict[str, Any]], workspace_id: str | None = None) -> None:
        points = []
        for chunk in chunks:
            metadata = dict(chunk.get("metadata") or {})
            effective_workspace_id = workspace_id or metadata.get("workspace_id") or "shared"
            payload = {
                "doc_id": chunk["doc_id"],
                "title": chunk["title"],
                "relative_path": chunk.get("relative_path") or metadata.get("relative_path", ""),
                "doc_type": chunk["doc_type"],
                "chunk_index": chunk["chunk_index"],
                "source_kind": chunk["source_kind"],
                "workspace_id": effective_workspace_id,
                "tags": chunk["tags"],
                "content": chunk["content"],
                "source_path": chunk.get("source_path") or metadata.get("source_path", ""),
            }
            points.append({
                "id": chunk["chunk_id"],
                "vector": self.embedding_service.encode(chunk["content"]),
                "payload": payload,
            })
        try:
            with httpx.Client(timeout=self.settings.qdrant_timeout_seconds) as client:
                response = client.put(
                    f"{self.settings.qdrant_url}/collections/{self.settings.qdrant_collection}/points?wait=true",
                    json={"points": points},
                )
                response.raise_for_status()
        except httpx.ReadTimeout as exc:
            raise QdrantTimeoutError("Qdrant upsert timed out.") from exc
        except httpx.ConnectError as exc:
            raise QdrantConnectionError("Could not connect to Qdrant.") from exc
        except httpx.HTTPError as exc:
            raise QdrantError("Failed to upsert chunks into Qdrant.") from exc

    def search(self, query: str, workspace_id: str | None, limit: int) -> list[RetrievalHit]:
        vector = self.embedding_service.encode(query)
        should = [{"key": "workspace_id", "match": {"value": "shared"}}]
        if workspace_id:
            should.append({"key": "workspace_id", "match": {"value": workspace_id}})
        payload = {
            "vector": vector,
            "limit": limit,
            "with_payload": True,
            "filter": {"should": should},
        }
        try:
            with httpx.Client(timeout=self.settings.qdrant_timeout_seconds) as client:
                response = client.post(
                    f"{self.settings.qdrant_url}/collections/{self.settings.qdrant_collection}/points/search",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.ReadTimeout as exc:
            raise QdrantTimeoutError("Qdrant search timed out.") from exc
        except httpx.ConnectError as exc:
            raise QdrantConnectionError("Could not connect to Qdrant.") from exc
        except httpx.HTTPError as exc:
            raise QdrantError("Failed to query Qdrant.") from exc

        results: list[RetrievalHit] = []
        for item in data.get("result", []):
            payload = item.get("payload") or {}
            results.append(
                RetrievalHit(
                    doc_id=str(payload.get("doc_id", "")),
                    title=str(payload.get("title", "unknown")),
                    relative_path=str(payload.get("relative_path", "")),
                    doc_type=str(payload.get("doc_type", "unknown")),
                    chunk_index=int(payload.get("chunk_index", 0)),
                    score=float(item.get("score", 0.0)),
                    content=str(payload.get("content", "")),
                    source_kind=str(payload.get("source_kind", "unknown")),
                    tags=list(payload.get("tags") or []),
                )
            )
        return results
