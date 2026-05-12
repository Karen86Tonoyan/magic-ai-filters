# magic-ai-filters

ALFA RC2.1: warstwa bezpieczeństwa poznawczego dla AI.

## Fundament
Model nie zgaduje. Model uzasadnia.

Pipeline:

`input -> schema_gate -> evidence_gate -> confidence_gate -> decision(ALLOW/REJECT)`

## RC2.1 Safety Contract
Każdy run musi emitować:

- `decision`
- `failed_gate`
- `reject_type`
- `reject_reason`
- `schema_version`
- `evidence_count`
- `confidence`
- `latency_ms`

## RejectType
- `NONE`
- `INVALID_SCHEMA`
- `INSUFFICIENT_EVIDENCE`
- `LOW_CONFIDENCE`
- `MISSING_CONTEXT`
- `OUT_OF_SCOPE`
- `INTERNAL_ERROR`

## Gate Model
- `schema_gate`: walidacja struktury przed reasoning.
- `evidence_gate`: brak wymaganej liczby dowodów -> `REJECT`.
- `confidence_gate`: confidence poniżej progu -> `REJECT`.
- `strict_gate`: końcowa egzekucja polityki.

Zasada:

- `false_accept` = krytyczny błąd.
- `false_reject` = temat tuningu.

## Źródła Ingestion
- `pdfminer_offline`
- `pypdf_offline`
- `pageindex_online`

Bridge normalizuje wszystko do jednego kontraktu RC2.1.
Query layer nie widzi różnicy między backendami.

## Schema-Centric Architecture
Parser może się mylić.
Schema i bramki nie mogą zgadywać.

Wymagany top-level kontrakt section map:

```json
{
  "schema_version": "RC2.1",
  "source": "pdfminer_offline",
  "document_id": "example_doc",
  "section_count": 1,
  "sections": [
    {
      "id": "sec_001",
      "title": "Root",
      "level": 1,
      "parent_id": null,
      "content_preview": "...",
      "hierarchy": ["Root"],
      "evidence_path": "example.pdf > Root"
    }
  ]
}
```

## Grafy i Algorytmy (co już jest)
- Drzewo dokumentu (PageIndex tree / markdown tree).
- Normalizacja sekcji do `section_map`.
- Evidence path lineage (`source > section > subsection`).
- Lexical scoring sekcji (title/hierarchy/content).
- Token normalization (EN + PL suffix stripping).
- Semantic anchors (pomoc dla zapytań ogólnych, bez obchodzenia gate).
- Deduplikacja dopasowań po `id` / `evidence_path`.
- Confidence jako pokrycie tokenów.
- Strict rejection policy z audytowalnym powodem.

## Kluczowe Pliki
- `alfa_index_document.py` -> indexing, offline fallback, build structure.
- `alfa_pageindex_bridge.py` -> normalizacja do RC2.1 section map.
- `alfa_section_map_validate.py` -> standalone validator (`VALID/INVALID`).
- `alfa_rc2_query.py` -> scoring + gate + wynik kontraktu.
- `alfa_rc2_run_document.py` -> orchestracja end-to-end + run manifest.
- `alfa_rc2_smoke_test.py` -> szybkie testy regresyjne pipeline.

## Funkcje Operacyjne ("Manus/Operator")
- Jednokomendowy run dokumentu:

```powershell
python .\alfa_rc2_run_document.py --pdf_path ".\raport.pdf" --question "Jakie są główne tezy?" --min_confidence 0.6 --min_evidence_paths 2
```

- Walidacja section map:

```powershell
python .\alfa_section_map_validate.py .\results\raport_alfa_section_map.json
```

- Query strict:

```powershell
python .\alfa_rc2_query.py --section_map .\results\raport_alfa_section_map.json --question "Revenue Operating Income" --strict --min_confidence 0.6 --min_evidence_paths 2
```

## Oczekiwane Zachowanie
Valid input:
- `decision = ALLOW`
- `failed_gate = none`
- `reject_type = NONE`

Invalid schema:
- `decision = REJECT`
- `failed_gate = schema_gate`
- `reject_type = INVALID_SCHEMA`

## Benchmark Metrics (minimum)
- `reject_rate`
- `false_reject_rate`
- `false_accept_rate`
- `evidence_coverage`
- `schema_valid_rate`
- `avg_confidence`
- `avg_latency`

## Scope Freeze (RC2.1)
Na tym etapie nie rozszerzamy o:
- FastAPI
- Judge
- MCP runtime orchestration
- Lasuch chain
- async/distributed runtime

Najpierw: kontrakt danych + bezpieczeństwo inferencji.
