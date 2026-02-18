# CLAW BOT — Instrukcja instalacji

## 1. Node.js (wymagane)

Pobierz i zainstaluj: https://nodejs.org (wersja >= 22 LTS)

Sprawdź instalację:
```bash
node --version
npm --version
```

## 2. Ollama (lokalny LLM)

Pobierz: https://ollama.com

Po instalacji uruchom:
```bash
ollama serve
```

W drugim terminalu zainstaluj model:
```bash
ollama pull llama3.2
```

## 3. Piper TTS (WAŻNE — głos bota!)

### Windows:
1. Pobierz: https://github.com/rhasspy/piper/releases/download/2024.11.25-2/piper_windows_amd64.zip
2. Rozpakuj do `E:\CLAW BOT\piper\`
3. Pobierz model: https://huggingface.co/rhasspy/piper/resolve/main/voices/pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx
4. Umieść w: `E:\CLAW BOT\models\pl_PL-gosia-medium.onnx`

### Linux:
```bash
wget https://github.com/rhasspy/piper/releases/download/2024.11.25-2/piper_linux_x86_64.tar.gz
tar xzf piper_linux_x86_64.tar.gz
# Model:
wget https://huggingface.co/rhasspy/piper/resolve/main/voices/pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx -O models/pl_PL-gosia-medium.onnx
```

## 4. CLAW BOT

```bash
cd "E:\CLAW BOT"
npm install
cp .env.example .env
```

Edytuj `.env`:

### Telegram (opcjonalnie):
1. Napisz do @BotFather na Telegram: `/newbot`
2. Następuj instrukcje, skopiuj token
3. W `.env`: `TELEGRAM_BOT_TOKEN=tvoje_token_123`
4. Napisz `/start` do swojego bota
5. Sprawdź logi: będzie Twoje user ID
6. W `.env`: `TELEGRAM_WHITELIST=twoje_id_123`

### Discord (opcjonalnie):
1. Wejdź: https://discord.com/developers/applications
2. "New Application" → nazwa bota
3. "Token" → "Reset Token" → skopiuj
4. W `.env`: `DISCORD_BOT_TOKEN=tvoj_token_456`
5. Skopiuj "CLIENT ID" → `DISCORD_CLIENT_ID=789`
6. Włącz Developer Mode (Discord → User Settings → Advanced → Developer Mode)
7. Kliknij prawym na siebie → "Copy User ID"
8. W `.env`: `DISCORD_WHITELIST=twoje_discord_id_456`

### TTS (domyślnie Piper):
```env
TTS_BACKEND=piper
TTS_PIPER_BINARY=./piper.exe
TTS_PIPER_MODEL=./models/pl_PL-gosia-medium.onnx
```

## 5. Uruchom

```bash
# Development (hot-reload)
npm run dev

# Lub produkcja
npm run build
npm start
```

Bot powinien wyświetlić:
```
═══════════════════════════════════════
  CLAW BOT — Ready
  [Telegram] ✓ active
  [Discord]  ✓ active
═══════════════════════════════════════
```

## Troubleshooting

### "Ollama not available"
Upewnij się że `ollama serve` jest uruchomiona (drugi terminal)

### "Model not found"
```bash
ollama pull llama3.2
```

### TTS nie działa
Sprawdź czy Piper jest w katalogu: `E:\CLAW BOT\piper.exe`
Sprawdź czy model jest: `E:\CLAW BOT\models\pl_PL-gosia-medium.onnx`

```bash
# Test Piper
.\piper.exe --help
echo "Cześć" | .\piper.exe --model models/pl_PL-gosia-medium.onnx -o test.wav
```

### "Unauthorized"
Sprawdzaj logi (`logs/combined.log`) — będą tam user ID nieautoryzowanych użytkowników.
Dodaj je do WHITELIST w `.env`.

---

## Po zainstalowaniu

Bot jest **gotowy do użycia**. Domyślnie:
- ✅ Ollama (llama3.2) — 4-8GB RAM
- ✅ Telegram bot
- ✅ Discord bot
- ✅ Piper TTS — naturalny polski głos
- ✅ Skille: data/godzina, kalkulator, pamięć
- ✅ Bezpieczeństwo: whitelist, rate limit, injection defense
- ✅ Logi audytu

Wszystko lokalnie. Bez kosztów. 🎯
