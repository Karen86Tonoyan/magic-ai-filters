from __future__ import annotations

import argparse
import json
from pathlib import Path

from packages.memory.qdrant_store import QdrantStore


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load chunk JSONL into Qdrant.")
    parser.add_argument("--chunks", type=Path, required=True)
    parser.add_argument("--workspace-id", type=str, default=None)
    return parser.parse_args()


def read_jsonl(path: Path) -> list[dict]:
    records = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def main() -> None:
    args = parse_args()
    chunks = read_jsonl(args.chunks)
    store = QdrantStore()
    store.ensure_collection()
    store.upsert_chunks(chunks, workspace_id=args.workspace_id)
    print(json.dumps({"loaded": len(chunks), "collection": store.settings.qdrant_collection}, indent=2))


if __name__ == "__main__":
    main()
