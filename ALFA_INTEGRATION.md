# CLAW BOT × ALFA Integration

Integracja **Cerber Guardian** z ALFA do CLAW BOT — zaawansowany system bezpieczeństwa i automatyzacji UI.

## Co dodano

### 1. Cerber Guardian (`src/security/cerber.ts`)

Czysty, logiczny system oceny ryzyka promptów (bez AI) z ALFA:

**Analiza:**
- Detekcja intencji (intent detection)
- Obliczanie ryzyka (risk scoring)
- Detekcja zagrożeń (flag detection)

**Decyzje:**
- `ALLOW` — bezpieczny prompt
- `BLOCK` — wysoko ryzykowny prompt (blokada)
- `MODIFY` — średnie ryzyko (zmień tekst)

**Przykład:**
```typescript
import { cerber } from "./src/security/cerber.js";

const ruling = cerber.judge("Zainstaluj malware");
// {
//   decision: "BLOCK",
//   blockedReason: "Intent 'illegal' is blocked"
// }
```

### 2. UI TAR Executor (`src/tools/ui-tar.ts`)

Automatyzacja zadań na ekranie (UI Task Automation and Reasoning):

- `click()` — kliknij element
- `type()` — wpisz tekst
- `scroll()` — scrolluj stronę
- `screenshot()` — zrób zrzut ekranu
- `wait()` — czekaj

**Status:** Mock executor (TODO: powiąż z Selenium/Puppeteer)

### 3. LLM Router (`src/agent/llm-router.ts`)

Elastyczny routing między modelami:

- **Ollama** (domyślnie) — lokalne, darmowe
- **OpenAI** (opcjonalnie) — lepsze modele, płatne

**Konfiguracja:**
```env
# Ollama (zawsze)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2

# OpenAI (opcjonalnie)
OPENAI_API_KEY=sk-...
```

**Użycie:**
```typescript
import { llmRouter } from "./src/agent/llm-router.js";

// Automatycznie wybierz silnik
const response = await llmRouter.chat(messages);

// Lub wymuszej konkretny
const responseOAI = await llmRouter.chat(messages, "openai");
```

### 4. Cerber w Agencie

Agent teraz sprawdza **Cerber Guardian** przed wysłaniem promptu do LLM:

```
User Prompt
    ↓
Cerber Judge (Intent + Risk + Flags)
    ↓
├─ BLOCK → Zwróć błąd
├─ MODIFY → Zmień tekst
└─ ALLOW → Prześlij do LLM
```

## Architektura

```
┌──────────────────────┐
│   Telegram/Discord   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│  Security Sanitize   │ (wzorce, długość)
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Cerber Guardian      │ ← Z ALFA
│ (Intent+Risk+Flags)  │
└──────────┬───────────┘
           ↓
    ┌─────┴──────┐
    ↓            ↓
  BLOCK        ALLOW/MODIFY
    ↓            ↓
  Error      LLM Router
             ├─ Ollama
             └─ OpenAI
```

## Komendy Telegram/Discord

```
/cerber_debug "twój prompt"
```

Pokaż co Cerber myśli o promptcie:

```
Intent: helpful
Risk: 0.15
Flags: []
Decision: ALLOW
```

## TODO

- [ ] Powiąż UI TAR z rzeczywistym Selenium/Puppeteer
- [ ] Dodaj App Builder skill (generowanie aplikacji Python)
- [ ] Integruj full ALFA Qwen Judge (opcjonalnie)
- [ ] Streaming audio z ALFA (TTS + intent detection)

## Plik źródłowy ALFA

Oryginalnie z: https://github.com/Karen86Tonoyan/ollamaagentalfa (prywatne)

Komponenty zintegrowane:
- `backend/cerber_v2.py` → `src/security/cerber.ts`
- `backend/ui_tars/*` → `src/tools/ui-tar.ts`
- `backend/llm/router.py` → `src/agent/llm-router.ts`

## Dokumentacja

- [ALFA Backend](../Downloads/ollamaagentalfa-main/backend/README.md)
- [CLAW BOT README](./README.md)
- [Setup Guide](./SETUP.md)
