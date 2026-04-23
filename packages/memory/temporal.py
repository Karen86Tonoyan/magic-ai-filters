from __future__ import annotations

import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal, Optional

log = logging.getLogger("alfa.memory")

TimePartition = Literal["historical", "active", "planned"]
MemoryKind = Literal["state", "decision", "task", "summary", "warning", "fact", "blocker"]
MemoryStatus = Literal["active", "done", "deferred", "cancelled", "archived"]

RETRIEVAL_PRIORITY: dict[str, list[TimePartition]] = {
    "current_state": ["active", "historical", "planned"],
    "history": ["historical", "active"],
    "plan": ["active", "planned", "historical"],
}


@dataclass(slots=True)
class MemoryRecord:
    title: str
    content: str
    kind: MemoryKind
    time_partition: TimePartition = "active"
    effective_date: str = field(default_factory=lambda: date.today().isoformat())
    tags: list[str] = field(default_factory=list)
    status: MemoryStatus = "active"
    source: str = "system"
    memory_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict) -> "MemoryRecord":
        allowed = {key: value for key, value in payload.items() if key in cls.__dataclass_fields__}
        return cls(**allowed)

    def summary(self) -> str:
        return f"[{self.time_partition.upper()}] [{self.kind}] {self.title}"


class MemoryStore:
    def __init__(self, base_path: str | Path = "alfa_memory") -> None:
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)
        self.paths: dict[TimePartition, Path] = {
            "historical": self.base / "yesterday.json",
            "active": self.base / "today.json",
            "planned": self.base / "tomorrow.json",
        }
        self._data: dict[TimePartition, list[dict]] = {
            "historical": [],
            "active": [],
            "planned": [],
        }
        self._load_all()

    def _load_all(self) -> None:
        for partition, path in self.paths.items():
            if path.exists():
                with path.open("r", encoding="utf-8") as handle:
                    self._data[partition] = json.load(handle)
                log.info("Loaded %s: %s records", partition, len(self._data[partition]))
            else:
                self._data[partition] = []

    def _save(self, partition: TimePartition) -> None:
        with self.paths[partition].open("w", encoding="utf-8") as handle:
            json.dump(self._data[partition], handle, ensure_ascii=False, indent=2)

    def add(self, record: MemoryRecord) -> str:
        self._data[record.time_partition].append(record.to_dict())
        self._save(record.time_partition)
        log.info("ADD %s", record.summary())
        return record.memory_id

    def get(self, memory_id: str) -> Optional[MemoryRecord]:
        for partition in self._data.values():
            for record in partition:
                if record["memory_id"] == memory_id:
                    return MemoryRecord.from_dict(record)
        return None

    def update_status(self, memory_id: str, status: MemoryStatus) -> None:
        for partition_name, partition in self._data.items():
            for record in partition:
                if record["memory_id"] == memory_id:
                    record["status"] = status
                    record["updated_at"] = datetime.now(timezone.utc).isoformat()
                    self._save(partition_name)
                    log.info("UPDATE %s -> %s", memory_id, status)
                    return
        log.warning("Record %s not found", memory_id)

    def query(
        self,
        partition: Optional[TimePartition] = None,
        kind: Optional[MemoryKind] = None,
        tags: Optional[list[str]] = None,
        status: Optional[MemoryStatus] = None,
        limit: int = 20,
    ) -> list[MemoryRecord]:
        results: list[MemoryRecord] = []
        partitions_to_search = [partition] if partition else list(self._data.keys())
        for partition_name in partitions_to_search:
            for record in self._data[partition_name]:
                if kind and record.get("kind") != kind:
                    continue
                if status and record.get("status") != status:
                    continue
                if tags:
                    record_tags = record.get("tags", [])
                    if not any(tag in record_tags for tag in tags):
                        continue
                results.append(MemoryRecord.from_dict(record))
        return results[:limit]

    def retrieve(self, query_type: Literal["current_state", "history", "plan"] = "current_state", limit_per_partition: int = 5) -> list[MemoryRecord]:
        priority_order = RETRIEVAL_PRIORITY[query_type]
        results: list[MemoryRecord] = []
        for partition in priority_order:
            if query_type == "history" and partition == "historical":
                partition_records = [MemoryRecord.from_dict(record) for record in self._data[partition]]
            else:
                partition_records = [
                    MemoryRecord.from_dict(record)
                    for record in self._data[partition]
                    if record.get("status") in ("active", "deferred")
                ]
            results.extend(partition_records[:limit_per_partition])
        return results

    def stats(self) -> dict:
        return {
            partition: {
                "total": len(records),
                "active": sum(1 for record in records if record.get("status") == "active"),
                "done": sum(1 for record in records if record.get("status") == "done"),
            }
            for partition, records in self._data.items()
        }


class MemoryRollover:
    def __init__(self, store: MemoryStore) -> None:
        self.store = store

    def run(self, dry_run: bool = False) -> dict:
        log.info("ROLLOVER %s", "[DRY RUN]" if dry_run else "[LIVE]")
        moved_to_active = 0
        moved_to_historical = 0
        archived = 0
        today_str = date.today().isoformat()

        new_active: list[dict] = []
        keep_planned: list[dict] = []
        for record_dict in self.store._data["planned"]:
            record = MemoryRecord.from_dict(record_dict)
            if record.status in ("active", "deferred"):
                record.time_partition = "active"
                record.effective_date = today_str
                record.updated_at = datetime.now(timezone.utc).isoformat()
                new_active.append(record.to_dict())
                moved_to_active += 1
                log.info("  planned->active: %s", record.title)
            else:
                keep_planned.append(record_dict)

        new_historical = list(self.store._data["historical"])
        keep_active: list[dict] = []
        for record_dict in self.store._data["active"]:
            record = MemoryRecord.from_dict(record_dict)
            if record.status in ("done", "cancelled"):
                record.time_partition = "historical"
                record.updated_at = datetime.now(timezone.utc).isoformat()
                new_historical.append(record.to_dict())
                moved_to_historical += 1
                log.info("  active->historical: %s", record.title)
            else:
                keep_active.append(record_dict)

        keep_active.extend(new_active)

        if not dry_run:
            self.store._data["planned"] = keep_planned
            self.store._data["active"] = keep_active
            self.store._data["historical"] = new_historical
            for partition in ("planned", "active", "historical"):
                self.store._save(partition)

        result = {
            "moved_to_active": moved_to_active,
            "moved_to_historical": moved_to_historical,
            "archived": archived,
            "dry_run": dry_run,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        log.info("ROLLOVER DONE: %s", result)
        return result


class MemoryManager:
    def __init__(self, base_path: str | Path = "alfa_memory") -> None:
        self.store = MemoryStore(base_path)
        self.rollover = MemoryRollover(self.store)

    def remember(
        self,
        title: str,
        content: str,
        kind: MemoryKind = "state",
        partition: TimePartition = "active",
        tags: Optional[list[str]] = None,
        source: str = "system",
    ) -> str:
        record = MemoryRecord(
            title=title,
            content=content,
            kind=kind,
            time_partition=partition,
            tags=tags or [],
            source=source,
        )
        return self.store.add(record)

    def remember_today(self, title: str, content: str, kind: MemoryKind = "state", tags: Optional[list[str]] = None) -> str:
        return self.remember(title, content, kind, "active", tags)

    def remember_yesterday(self, title: str, content: str, kind: MemoryKind = "summary", tags: Optional[list[str]] = None) -> str:
        return self.remember(title, content, kind, "historical", tags)

    def remember_tomorrow(self, title: str, content: str, kind: MemoryKind = "task", tags: Optional[list[str]] = None) -> str:
        return self.remember(title, content, kind, "planned", tags)

    def close_task(self, memory_id: str) -> None:
        self.store.update_status(memory_id, "done")

    def defer_task(self, memory_id: str) -> None:
        self.store.update_status(memory_id, "deferred")

    def what_now(self) -> list[MemoryRecord]:
        return self.store.retrieve("current_state")

    def what_happened(self) -> list[MemoryRecord]:
        return self.store.retrieve("history")

    def whats_next(self) -> list[MemoryRecord]:
        return self.store.retrieve("plan")

    def find(
        self,
        tags: Optional[list[str]] = None,
        kind: Optional[MemoryKind] = None,
        partition: Optional[TimePartition] = None,
    ) -> list[MemoryRecord]:
        return self.store.query(partition=partition, kind=kind, tags=tags)

    def status(self) -> str:
        stats = self.store.stats()
        today = date.today().isoformat()
        lines = [f"ALFA Memory - {today}", "-" * 40]
        labels = {
            "historical": "YESTERDAY",
            "active": "TODAY    ",
            "planned": "TOMORROW",
        }
        for partition, label in labels.items():
            summary = stats[partition]
            lines.append(f"  {label}  active:{summary['active']:3}  done:{summary['done']:3}  total:{summary['total']:3}")
        lines.append("-" * 40)
        return "\n".join(lines)

    def midnight_rollover(self, dry_run: bool = False) -> dict:
        return self.rollover.run(dry_run=dry_run)

    def build_context(self, query_type: Literal["current_state", "history", "plan"] = "current_state", max_records: int = 10) -> str:
        per_partition = max(1, max_records // 3)
        records = self.store.retrieve(query_type, limit_per_partition=per_partition)
        if not records:
            return "Brak aktywnej pamiÄ™ci operacyjnej."
        lines = ["=== ALFA MEMORY CONTEXT ==="]
        for record in records:
            lines.append(f"\n[{record.time_partition.upper()}] {record.title}")
            lines.append(f"Kind: {record.kind} | Status: {record.status} | Tags: {', '.join(record.tags)}")
            lines.append(record.content)
            lines.append("---")
        return "\n".join(lines)