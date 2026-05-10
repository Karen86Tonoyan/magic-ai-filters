# ALFA PageIndex RC2
## Offline Document Evidence Gate

---

**Większość systemów AI odpowiada.**
**RC2 najpierw pyta: mam dowód?**

Jeśli nie ma — milczy. I to jest jego siła.

---

## Co to jest

PageIndex RC2 to lokalny silnik weryfikacji wiedzy z dokumentów.

Nie szuka „podobnego fragmentu".
Szuka ścieżki dowodu.
Nie generuje odpowiedzi z pamięci.
Wskazuje gdzie w dokumencie leży odpowiedź.
Nie halucynuje — bo gdy nie ma dowodu, zwraca odmowę.

```txt
ALFA RC2 nie odpowiada z pamięci.
ALFA RC2 odpowiada ze ścieżki dowodu.
```

---

## Architektura — jeden kierunek

```txt
PDF / MD
  ↓
alfa_index_document.py       — parsuje dokument, buduje strukturę
  ↓
alfa_pageindex_bridge.py     — normalizuje strukturę do section_map
  ↓
alfa_section_map_validate.py — waliduje mapę przed zapytaniem
  ↓
alfa_rc2_query.py            — zadaje pytanie, szuka evidence_paths
  ↓
Strict Gate                  — decyduje: PASS / REJECT
  ↓
run_manifest.json            — pełny zapis runu
```

Każdy krok ma wyjście. Każde wyjście jest sprawdzalne.

---

## Strict Gate — zasada

Gate nie jest opcjonalny. Gate jest rdzeniem.

| Warunek | Skutek |
|---|---|
| `confidence < min_confidence` | exit code 2, odmowa |
| `evidence_paths < min_evidence_paths` | exit code 2, odmowa |
| `section_count = 0` | exit code 2, odmowa |
| wszystkie warunki spełnione | exit code 0, `strict_passed: true` |

**Exit codes:**

```txt
0 — PASS: odpowiedź z dowodem
1 — ERROR: błąd pipeline (np. brak pliku)
2 — REJECT: gate odrzucił (za niska pewność lub brak dowodów)
```

---

## Tryby pracy

### Normal mode
Dokument ma naturalną hierarchię nagłówków.

```txt
min_confidence:     0.6
min_evidence_paths: 2
structure_mode:     normal
```

### Fallback Root mode
Dokument płaski — brak nagłówków strukturalnych.
Gate twardszy w confidence, łagodniejszy w evidence_paths.

```txt
min_confidence:     0.8
min_evidence_paths: 1
structure_mode:     fallback_root
```

System sam wykrywa tryb. `structure_mode` trafia do `run_manifest.json`.

---

## Offline — bez API, bez chmury

RC2 działa lokalnie. Nie wymaga:
- klucza OpenAI
- połączenia z internetem
- żadnego zewnętrznego serwisu

Gdy PageIndex nie może wywołać LLM (brak klucza) — odpala `ALFA_OFFLINE_PDF_FALLBACK` i kontynuuje lokalnie przez `pypdf`.

---

## Output runu

Każdy run zapisuje trzy pliki:

```txt
results/runs/{document}_{timestamp}/
  run_manifest.json          — pełny stan runu
  *_query_result.json        — wynik zapytania z evidence_paths
  *_alfa_section_map.json    — mapa sekcji dokumentu
```

**Przykład `run_manifest.json`:**

```json
{
  "run_id": "alfa_rc2_test1_20260510_132632",
  "source_path": "alfa_rc2_test1.pdf",
  "question": "Praktyki komunikacyjne Wprowadzenie",
  "exit_code": 0,
  "strict_passed": true,
  "confidence": 1.0,
  "evidence_paths": [
    "alfa_rc2_test1.pdf > Praktyki komunikacyjne",
    "alfa_rc2_test1.pdf > Wprowadzenie"
  ],
  "structure_mode": "normal",
  "section_count": 21
}
```

---

## Stemming — polska fleksja

RC2 zawiera lekki stemmer dla języka polskiego.
`tezy` → `tez`, `komunikacyjne` → `komunikacyjn`, `praktyki` → `praktyk`

Bez tego confidence na polskich dokumentach byłoby stale 0.0.
Stemmer nie zastępuje embeddings — obsługuje fleksję, nie semantykę.

---

## Kiedy używać RC2

RC2 jest właściwy gdy:
- odpowiedź musi być zakorzeniona w konkretnym dokumencie
- halucynacja jest nieakceptowalna
- system musi wiedzieć czego nie wie
- dokument jest lokalny i poufny

RC2 nie zastępuje:
- pełnego RAG z embeddingami (semantyczne podobieństwo)
- systemów pytań do bazy wiedzy z wielu dokumentów jednocześnie

---

## Status

```txt
PageIndex RC2
Version:  Minimum Viable Evidence Gate
Mode:     local / offline
Core rule: No evidence_path → no answer
Gate:     Strict — exit code 2 on reject
Tested:   PDF offline, MD, fallback_root, normal mode
```

---

## Następne kroki

```txt
1. Test corpus — 3-5 dokumentów: prosty, średni, trudny, OCR, długi PDF
2. LLM answer layer — generowanie odpowiedzi nad evidence_paths
3. Multi-document — zapytanie do wielu dokumentów jednocześnie
```

Wektory — jako dodatek do leksyki. Nie jako zamiana fundamentu.

---

*ALFA PageIndex RC2 — Karen Tonoyan*
*kontakt@karentonoyan.pl*
