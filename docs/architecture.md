# ALFA-CORE Architecture

## Goal

Build one canonical backend core for ALFA inside the existing repository while keeping the legacy TypeScript runtime operational during migration.

## Runtime split

```text
Legacy compatibility layer
  src/*
    -> existing Telegram / Discord / MCP behavior
    -> no new domain logic

Canonical Python core
  apps/* + packages/*
    -> routing
    -> safety
    -> telemetry
    -> local LLM orchestration
    -> project memory and RAG
```

## Canonical backend flow

```text
Request
  -> router
  -> safety policy
  -> retrieval (workspace + shared knowledge)
  -> local model adapter
  -> answer envelope
  -> audit + runtime logs
```

## Source-of-truth rule

All new backend behavior lands in Python under `apps/` and `packages/`.
TypeScript integrations may call into the Python API but should not re-implement routing, safety, or memory logic.
