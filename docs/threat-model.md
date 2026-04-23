# Threat Model

## Protected assets

- local source code
- local secrets and API keys
- private conversation-derived memory
- audit history
- local model runtime and workspace context

## Main threats

- prompt injection
- secret exfiltration
- accidental high-impact execution paths
- noisy or contaminated memory ingestion
- duplicated logic drifting between integrations and core

## Initial mitigations

- deterministic routing decisions
- safety override layer
- PII sanitization in conversation-derived memory
- workspace-scoped retrieval plus shared-knowledge allowlist
- audit logs that store metadata and timing, not full payloads
