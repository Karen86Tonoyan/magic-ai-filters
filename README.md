# magic-ai-filters

Public repository for **ALFA RC2.1** safety-oriented AI filtering and evidence-gated reasoning.

## Core Idea
Model should not guess. Model must justify.

## RC2.1 Safety Contract
Every run emits:
- decision
- failed_gate
- reject_type
- reject_reason
- schema_version
- evidence_count
- confidence
- latency_ms

## Gates
- schema_gate -> validate before reasoning
- evidence_gate -> insufficient_evidence_paths => REJECT
- confidence_gate -> score below threshold => REJECT

## Sources
- pdfminer_offline
- pypdf_offline
- pageindex_online

## Notes
This repo contains the full program package and historical run artifacts used during RC2.1 hardening.
