# ALFA-CORE (Canonical Migration in Progress)

ALFA-CORE is the new Python-first backend core for ALFA: routing, safety, telemetry, local-model orchestration, and project memory.

## Status

This repository is in a staged migration.

- `E:\CLAW BOT` remains the canonical repo.
- The legacy TypeScript runtime in `src/` stays alive in compatibility mode.
- New backend logic now belongs in `apps/` and `packages/`.
- `ALFA-GPT` is being absorbed into the Python core instead of growing as a separate product.

## What Is Canonical Now

- `apps/api` - FastAPI backend
- `apps/cli` - operator commands
- `packages/core` - domain models, settings, orchestration, prompt loading
- `packages/router` - ACCEPT / VERIFY / SIMULATE / ESCALATE / BLOCK routing
- `packages/safety` - risk policy and guardrails
- `packages/llm` - local Ollama client
- `packages/memory` - ingestion, chunking, workspace indexing, retrieval
- `packages/telemetry` - runtime and audit logs
- `packages/schemas` - API models and JSON-schema-capable Pydantic types

## What Remains Compatibility-Only

- `src/agent`
- `src/security`
- `src/logger`
- `src/mcp`

These modules remain operational while the Python core takes over. New domain logic should not be added there.

## Repo Policy

- One main repo only.
- No new repo copies like `-new`, `-v2`, or `-final-final`.
- Experiments go to branches or `labs/`, not duplicate roots.
- Public docs must describe only working behavior.
- `.venv`, local archives, generated outputs, and local model artifacts stay out of git.

## Current Startup Paths

### Legacy compatibility runtime

```bash
npm install
npm run dev
```

### New ALFA-CORE API

```bash
python -m pip install -e .[dev]
python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
```

## MVP Flow

```text
Input -> Router -> Safety -> LLM/Action -> Output
```

## ALFA Slice Execution (New)

Python core now includes ALFA-style bounded execution primitives in `packages/core/alfa_execution.py`:

- `MarketPlanner` - curates executable plan proposals
- `BigHeadSelector` - selects the best plan using proof vs risk scoring
- `AlfaBrain` - injects minimal memory for the next checkpoint
- `SliceExecutor` - splits a chosen plan into short checkpoint slices
- `AlfaExecutionPlanner` - orchestrates market + selection + slice construction

Example:

```python
from packages.core import AlfaExecutionPlanner, PlanCandidate

planner = AlfaExecutionPlanner()
execution = planner.plan(
	[
		PlanCandidate(
			candidate_id='plan-a',
			summary='Deliver result in bounded steps',
			steps=['Collect facts', 'Choose tactic', 'Run step', 'Report checkpoint'],
			proof_score=0.82,
			risk_score=0.12,
		)
	],
	prior_memory=['State B verified'],
	max_steps_per_slice=2,
)

for checkpoint_slice in execution.slices:
	print(checkpoint_slice.checkpoint_id, checkpoint_slice.steps)
```

Validation tests for this module are in `tests/unit/test_alfa_execution.py`.

## Docs

- `docs/architecture.md`
- `docs/routing.md`
- `docs/safety-model.md`
- `docs/threat-model.md`
- `docs/knowledge/README.md`
- `docs/knowledge/gamma/README.md`