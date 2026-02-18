# CLAW BOT

Etyczny, self-hosted asystent AI z obsługą Telegram, Discord i lokalnym LLM (Ollama).

## Wymagania

- Node.js >= 22
- [Ollama](https://ollama.com) — lokalny LLM
- (opcjonalnie) [espeak-ng](https://github.com/espeak-ng/espeak-ng/releases) — TTS

## Szybki start

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Skonfiguruj środowisko

```bash
cp .env.example .env
```

Edytuj `.env` i uzupełnij:
- `TELEGRAM_BOT_TOKEN` — od @BotFather
- `DISCORD_BOT_TOKEN` + `DISCORD_CLIENT_ID` — z Discord Developer Portal
- `TELEGRAM_WHITELIST` / `DISCORD_WHITELIST` — Twoje user ID

### 3. Uruchom Ollama

```bash
ollama serve
ollama pull llama3.2
```

### 4. Uruchom bota

```bash
# Development (z hot-reload)
npm run dev

# Production
npm run build && npm start
```

### 5. Znajdź swoje ID

**Telegram:** Napisz `/start` do bota — ID pojawi się w logach.
**Discord:** Włącz Developer Mode (Ustawienia → Zaawansowane), kliknij prawym na swój nick → "Kopiuj ID".

Dodaj ID do `.env`:
```
TELEGRAM_WHITELIST=123456789
DISCORD_WHITELIST=987654321
```

---

## Struktura projektu

```
src/
├── index.ts           # Punkt wejścia
├── config/            # Konfiguracja (zod)
├── logger/            # Logger (winston)
├── gateway/           # WebSocket hub + session manager
├── agent/             # Ollama agent
├── security/          # Whitelist, rate limit, injection defense
├── channels/
│   ├── telegram/      # Bot Telegram (grammY)
│   └── discord/       # Bot Discord (discord.js)
├── tts/               # Syntezator mowy (espeak/piper/elevenlabs)
├── skills/            # Rozszerzalne skille
└── types/             # Typy TypeScript
```

---

## Syntezator Mowy (TTS) — WAŻNE!

Bot musi mieć głos! Domyślnie ustawiony **Piper TTS** — najlepsza jakość.

### Piper TTS (DOMYŚLNY — najlepsza jakość, lokalny, darmowy)

**Wymagane do zainstalowania!**

1. Pobierz Piper: https://github.com/rhasspy/piper/releases
   - Windows: `piper_windows_amd64.zip`
   - Linux: `piper_linux_x86_64.tar.gz`

2. Rozpakuj do `E:\CLAW BOT\` (lub wybranego miejsca)

3. Pobierz model polski (400 MB):
   ```
   https://huggingface.co/rhasspy/piper/resolve/main/voices/pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx
   ```
   Umieść w: `E:\CLAW BOT\models\pl_PL-gosia-medium.onnx`

4. Zaktualizuj `.env`:
   ```
   TTS_BACKEND=piper
   TTS_PIPER_BINARY=./piper.exe
   TTS_PIPER_MODEL=./models/pl_PL-gosia-medium.onnx
   ```

**Alternatywa: espeak-ng** (słabsza jakość, ale działa od razu)
```
TTS_BACKEND=espeak
```
Zainstaluj: https://github.com/espeak-ng/espeak-ng/releases

### ElevenLabs (najwyższa jakość, wymaga API)

```
TTS_BACKEND=elevenlabs
ELEVENLABS_API_KEY=twoj_klucz
```

---

## Komendy botów

| Komenda         | Opis                          |
|-----------------|-------------------------------|
| `/start`        | Powitanie i sprawdzenie dostępu |
| `/help`         | Lista komend                  |
| `/clear`        | Wyczyść historię rozmowy      |
| `/voice <tekst>`| Synteza mowy                  |
| `/status`       | Status systemu                |
| `/stats`        | Statystyki sesji              |

---

## Bezpieczeństwo

- Whitelist użytkowników (tylko autoryzowani mają dostęp)
- Rate limiting (20 wiadomości/minutę, 500/dzień)
- Ochrona przed prompt injection (wykrywanie wzorców)
- Usuwanie ukrytych znaków Unicode
- Audyt log każdej wiadomości
- Gateway tylko na localhost
- Brak zewnętrznych połączeń bez jawnej konfiguracji

---

## Rozszerzanie

Dodaj własny skill w `src/skills/`:

```typescript
import type { Skill } from "../types/index.js";

export const mySkill: Skill = {
  name: "my-skill",
  description: "Opis",
  triggers: ["słowo kluczowe"],
  async handle(message, session) {
    if (!message.includes("słowo kluczowe")) return null;
    return "Odpowiedź z mojego skilla!";
  },
};
```

Zarejestruj w `src/skills/index.ts`:
```typescript
import { mySkill } from "./my-skill.js";
this.register(mySkill);
```
