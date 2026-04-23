# Safety Model

## Core principles

- No high-impact action without explicit escalation.
- No secret or credential handling in clear text.
- No raw prompt or selection payloads in audit logs.
- No domain logic duplication across API, MCP, or editor integrations.

## Risk levels

- `LOW` - normal read-only analysis
- `MEDIUM` - incomplete context or ambiguous request
- `HIGH` - potential environment mutation, rollout, or sensitive system scope
- `CRITICAL` - prompt injection, credential exposure, or disallowed exfiltration behavior

## Enforcement

The router proposes a decision.
The safety layer is authoritative and may upgrade the request to `VERIFY`, `ESCALATE`, or `BLOCK`.
