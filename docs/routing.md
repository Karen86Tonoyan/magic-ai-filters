# Routing Model

## Decisions

- `ACCEPT` - safe, low-risk read or answer path
- `VERIFY` - more context is needed before a confident answer
- `SIMULATE` - answer as a dry-run or preview, never as a live action
- `ESCALATE` - high-impact path that needs extra review or human-in-the-loop
- `BLOCK` - disallowed request pattern

## Initial deterministic heuristics

The MVP router is rule-based.
It uses mode, intent clues, destructive keywords, prompt-injection patterns, and missing-code-context checks.
Later versions may add model-aware scoring, but the public decision contract stays the same.
