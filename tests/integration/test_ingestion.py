import json
import zipfile
from pathlib import Path

from packages.memory.prepare_dataset import prepare_dataset


def test_prepare_dataset_handles_duplicate_and_sanitization(tmp_path):
    kompendium_zip = tmp_path / "kompendium.zip"
    duplicate_zip = tmp_path / "kompendium-copy.zip"
    deepseek_zip = tmp_path / "deepseek.zip"

    with zipfile.ZipFile(kompendium_zip, "w") as archive:
        archive.writestr("python/01_fastapi.md", "# FastAPI\n\nFastAPI handles Python APIs.")
    duplicate_zip.write_bytes(kompendium_zip.read_bytes())

    conversations = [
        {
            "id": "conv-1",
            "title": "FastAPI architecture",
            "updated_at": "2026-04-21T12:00:00Z",
            "mapping": {
                "user": {
                    "id": "user",
                    "parent": None,
                    "children": ["assistant"],
                    "message": {
                        "inserted_at": "2026-04-21T12:00:00Z",
                        "fragments": [{"type": "REQUEST", "content": "How should I structure a FastAPI backend?"}],
                    },
                },
                "assistant": {
                    "id": "assistant",
                    "parent": "user",
                    "children": [],
                    "message": {
                        "inserted_at": "2026-04-21T12:01:00Z",
                        "fragments": [{
                            "type": "RESPONSE",
                            "content": "Use a layered FastAPI structure with routing, safety, memory, and telemetry. Contact me at test@example.com if you need details, but keep request handling separated from retrieval and model access for cleaner architecture and testing."
                        }],
                    },
                },
            },
        }
    ]

    with zipfile.ZipFile(deepseek_zip, "w") as archive:
        archive.writestr("user.json", json.dumps({"email": "test@example.com"}))
        archive.writestr("conversations.json", json.dumps(conversations))

    report = prepare_dataset(
        kompendium_zip=kompendium_zip,
        duplicate_candidates=[duplicate_zip],
        deepseek_zip=deepseek_zip,
        output_dir=tmp_path / "output",
        chunk_target_chars=1400,
        chunk_overlap_chars=220,
    )

    assert report["acceptance_checks"]["duplicate_kompendium_excluded"] is True
    assert report["acceptance_checks"]["user_json_excluded"] is True
    assert report["acceptance_checks"]["deepseek_records_clean"] is True
    chunks = (tmp_path / "output" / "normalized" / "document_chunks.jsonl").read_text(encoding="utf-8").splitlines()
    assert chunks
    first_chunk = json.loads(chunks[0])
    assert "doc_type" in first_chunk
    assert "chunk_index" in first_chunk
