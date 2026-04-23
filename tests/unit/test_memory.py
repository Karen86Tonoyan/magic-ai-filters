from packages.memory.chunking import chunk_text_by_chars
from packages.memory.index_workspace import build_workspace_documents
from packages.memory.prepare_dataset import sanitize_text


def test_chunking_uses_char_overlap():
    text = "a" * 2200
    chunks = chunk_text_by_chars(text, 1000, 200)
    assert len(chunks) >= 3
    assert chunks[1].startswith(chunks[0][-200:])


def test_sanitize_text_redacts_pii():
    sanitized, replacements = sanitize_text("email test@example.com uuid 123e4567-e89b-12d3-a456-426614174000")
    assert "test@example.com" not in sanitized
    assert "123e4567-e89b-12d3-a456-426614174000" not in sanitized
    assert replacements


def test_workspace_index_includes_config_files(tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "main.py").write_text("print('ok')", encoding="utf-8")
    (tmp_path / ".env.example").write_text("KEY=value", encoding="utf-8")
    documents = build_workspace_documents(tmp_path)
    doc_types = {doc["metadata"]["doc_type"] for doc in documents}
    assert "code" in doc_types
    assert "config" in doc_types
