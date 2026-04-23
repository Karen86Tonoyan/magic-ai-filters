# Knowledge Packs

This directory holds canonical reference knowledge imported into the main `E:\CLAW BOT` repository.

## Purpose

These packs are kept as:
- human-readable reference material,
- structured source material for later RAG ingestion,
- versioned knowledge with preserved provenance.

## Current Packs

- [GAMMA](./gamma/README.md) - realism, scene construction, ComfyUI workflow references, black/gold visual system, and commercial extensions.

## Import Rules

- Keep original source hierarchy under a `source/` subtree when practical.
- Add a local `README.md` explaining scope, provenance, and intended use.
- Add a machine-readable `index.json` for later ingestion and tagging.
- Do not treat imported packs as production code unless explicitly reviewed and promoted.