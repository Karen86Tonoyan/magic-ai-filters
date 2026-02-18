// ============================================================
// CLAW BOT — Syntezator Mowy (TTS)
// Obsługuje wiele backendów: Piper (lokalne), espeak, ElevenLabs
// ============================================================

import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger/index.js";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS_CACHE_DIR = path.resolve(__dirname, "../../data/tts-cache");

// Upewnij się że katalog istnieje
if (!existsSync(TTS_CACHE_DIR)) {
  mkdirSync(TTS_CACHE_DIR, { recursive: true });
}

export type TTSBackend = "piper" | "espeak" | "elevenlabs" | "disabled";

export interface TTSConfig {
  backend: TTSBackend;
  // Piper
  piperBinary?: string;        // ścieżka do piper.exe / piper
  piperModel?: string;         // ścieżka do modelu .onnx
  // espeak
  espeakLang?: string;         // np. "pl", "en"
  espeakVoice?: string;        // np. "pl+m3"
  // ElevenLabs
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
}

class TTSManager {
  private config: TTSConfig;
  private backend: TTSBackend;

  constructor() {
    this.config = this.loadConfig();
    this.backend = this.config.backend;
    logger.info("TTS initialized", { backend: this.backend });
  }

  private loadConfig(): TTSConfig {
    const backend = (process.env.TTS_BACKEND ?? "espeak") as TTSBackend;

    return {
      backend,
      // Piper
      piperBinary: process.env.TTS_PIPER_BINARY ?? "piper",
      piperModel: process.env.TTS_PIPER_MODEL,
      // espeak
      espeakLang: process.env.TTS_ESPEAK_LANG ?? "pl",
      espeakVoice: process.env.TTS_ESPEAK_VOICE ?? "pl+m3",
      // ElevenLabs
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
      elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",
    };
  }

  // Główna metoda syntezy — zwraca ścieżkę do pliku audio lub null
  async synthesize(text: string): Promise<string | null> {
    if (this.backend === "disabled") return null;

    // Ogranicz tekst (TTS ma limity)
    const cleanText = this.cleanText(text);
    if (!cleanText) return null;

    const filename = `tts-${Date.now()}.wav`;
    const outputPath = path.join(TTS_CACHE_DIR, filename);

    try {
      switch (this.backend) {
        case "piper":
          return await this.synthesizePiper(cleanText, outputPath);
        case "espeak":
          return await this.synthesizeEspeak(cleanText, outputPath);
        case "elevenlabs":
          return await this.synthesizeElevenLabs(cleanText, outputPath);
        default:
          return null;
      }
    } catch (err) {
      logger.error("TTS synthesis failed", {
        backend: this.backend,
        error: String(err),
      });
      return null;
    }
  }

  // Piper TTS — najlepsza jakość lokalnie, obsługuje polski
  // Instalacja: https://github.com/rhasspy/piper
  private async synthesizePiper(text: string, outputPath: string): Promise<string | null> {
    if (!this.config.piperModel) {
      logger.warn("Piper model not configured (TTS_PIPER_MODEL)");
      return null;
    }

    const cmd = `echo "${text.replace(/"/g, '\\"')}" | "${this.config.piperBinary}" --model "${this.config.piperModel}" --output_file "${outputPath}"`;

    await execAsync(cmd);

    if (existsSync(outputPath)) {
      logger.debug("Piper TTS generated", { outputPath });
      return outputPath;
    }
    return null;
  }

  // espeak-ng — dostępny na Windows/Linux, jakość niższa ale działa od razu
  // Instalacja Windows: https://github.com/espeak-ng/espeak-ng/releases
  // Linux: apt install espeak-ng
  private async synthesizeEspeak(text: string, outputPath: string): Promise<string | null> {
    const voice = this.config.espeakVoice ?? "pl+m3";
    const speed = 150; // słów na minutę
    const pitch = 50;

    const cmd = `espeak-ng -v "${voice}" -s ${speed} -p ${pitch} -w "${outputPath}" "${text.replace(/"/g, '\\"')}"`;

    await execAsync(cmd);

    if (existsSync(outputPath)) {
      logger.debug("espeak-ng TTS generated", { outputPath });
      return outputPath;
    }
    return null;
  }

  // ElevenLabs — najwyższa jakość, wymaga klucza API
  // Dokumentacja: https://elevenlabs.io/docs/api-reference
  private async synthesizeElevenLabs(text: string, outputPath: string): Promise<string | null> {
    if (!this.config.elevenLabsApiKey) {
      logger.warn("ElevenLabs API key not configured (ELEVENLABS_API_KEY)");
      return null;
    }

    const { writeFileSync } = await import("fs");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenLabsVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.config.elevenLabsApiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      logger.error("ElevenLabs API error", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const buffer = await response.arrayBuffer();
    const mp3Path = outputPath.replace(".wav", ".mp3");
    writeFileSync(mp3Path, Buffer.from(buffer));

    logger.debug("ElevenLabs TTS generated", { outputPath: mp3Path });
    return mp3Path;
  }

  // Wyczyść tekst dla TTS
  private cleanText(text: string): string {
    return text
      // Usuń markdown
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/```[\s\S]*?```/g, "[blok kodu]")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Usuń nadmiar białych znaków
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim()
      // Ogranicz długość (TTS ma limity)
      .substring(0, 500);
  }

  // Sprawdź dostępność backendu
  async healthCheck(): Promise<{ available: boolean; backend: TTSBackend }> {
    if (this.backend === "disabled") {
      return { available: false, backend: "disabled" };
    }

    try {
      if (this.backend === "espeak") {
        await execAsync("espeak-ng --version");
        return { available: true, backend: "espeak" };
      }

      if (this.backend === "piper") {
        await execAsync(`"${this.config.piperBinary}" --version`);
        return { available: true, backend: "piper" };
      }

      if (this.backend === "elevenlabs") {
        return {
          available: Boolean(this.config.elevenLabsApiKey),
          backend: "elevenlabs",
        };
      }
    } catch {
      return { available: false, backend: this.backend };
    }

    return { available: false, backend: this.backend };
  }

  getBackend(): TTSBackend {
    return this.backend;
  }
}

export const tts = new TTSManager();
export default tts;
