from packages.memory.temporal import MemoryManager, MemoryRecord, MemoryStore


def test_memory_record_roundtrip():
    record = MemoryRecord(title="Title", content="Content", kind="state", tags=["alpha"])
    restored = MemoryRecord.from_dict(record.to_dict())
    assert restored.title == "Title"
    assert restored.tags == ["alpha"]


def test_memory_manager_remember_and_retrieve(tmp_path):
    manager = MemoryManager(tmp_path)
    memory_id = manager.remember_today("Current task", "Working on ALFA-CORE", kind="task", tags=["core"])
    assert memory_id
    current = manager.what_now()
    assert any(item.title == "Current task" for item in current)


def test_memory_rollover_moves_planned_and_done(tmp_path):
    manager = MemoryManager(tmp_path)
    planned_id = manager.remember_tomorrow("Tomorrow task", "Run smoke-live", kind="task", tags=["smoke"])
    done_id = manager.remember_today("Finished task", "Smoke path scripted", kind="summary", tags=["done"])
    manager.close_task(done_id)
    result = manager.midnight_rollover(dry_run=False)
    assert result["moved_to_active"] == 1
    assert result["moved_to_historical"] == 1
    now_titles = [item.title for item in manager.what_now()]
    history_titles = [item.title for item in manager.what_happened()]
    assert "Tomorrow task" in now_titles
    assert "Finished task" in history_titles


def test_build_context_contains_partition_headers(tmp_path):
    manager = MemoryManager(tmp_path)
    manager.remember_today("Vision state", "Agent processed current session.", tags=["vision"])
    context = manager.build_context("current_state")
    assert "=== ALFA MEMORY CONTEXT ===" in context
    assert "[ACTIVE] Vision state" in context


def test_query_by_tags_and_partition(tmp_path):
    store = MemoryStore(tmp_path)
    store.add(MemoryRecord(title="A", content="one", kind="fact", time_partition="historical", tags=["brain"]))
    store.add(MemoryRecord(title="B", content="two", kind="task", time_partition="active", tags=["vision"]))
    results = store.query(partition="historical", tags=["brain"])
    assert len(results) == 1
    assert results[0].title == "A"