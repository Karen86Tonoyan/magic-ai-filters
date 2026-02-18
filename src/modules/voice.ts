// ============================================================
// CLAW BOT — Voice Module (z ALFA Voice)
// Speech-to-text + Text-to-speech + Voice interface
// ============================================================

import { logger } from "../logger/index.js";
import { tts } from "../tts/index.js";

export interface VoiceConfig {
  language: string; // "pl-PL", "en-US"
  sttProvider: "google" | "whisper" | "local";
  ttsProvider: "piper" | "espeak" | "elevenlabs" | "native";
  sampleRate: number;
  audioFormat: "wav" | "mp3" | "ogg";
}

export interface STTResult {
  text: string;
  confidence: number;
  duration: number; // ms
  language: string;
}

export interface TTSResult {
  audioBase64: string;
  mimeType: string;
  duration: number; // ms
}

export class VoiceModule {
  private config: VoiceConfig;
  private isListening: boolean = false;

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      language: config.language ?? "pl-PL",
      sttProvider: config.sttProvider ?? "whisper",
      ttsProvider: config.ttsProvider ?? "piper",
      sampleRate: config.sampleRate ?? 16000,
      audioFormat: config.audioFormat ?? "wav",
    };
    logger.info("VoiceModule initialized", this.config);
  }

  // Speech-to-Text
  async transcribeAudio(audioBase64: string): Promise<STTResult> {
    logger.debug("Transcribing audio", { provider: this.config.sttProvider });

    // TODO: Integrate with real STT
    // - Google Cloud Speech-to-Text
    // - OpenAI Whisper API
    // - Local Whisper (self-hosted)

    const startTime = Date.now();

    // Mock implementation
    const text = "Mock transcription result";
    const duration = Date.now() - startTime;

    return {
      text,
      confidence: 0.95,
      duration,
      language: this.config.language,
    };
  }

  // Text-to-Speech using existing TTS module
  async synthesizeVoice(text: string): Promise<TTSResult> {
    logger.debug("Synthesizing voice", { provider: this.config.ttsProvider, textLength: text.length });

    try {
      const audioPath = await tts.synthesize(text);

      if (!audioPath) {
        throw new Error("TTS synthesis failed");
      }

      // TODO: Convert to base64 and get duration
      return {
        audioBase64: "base64encodedaudio",
        mimeType: "audio/wav",
        duration: Math.ceil((text.length / 140) * 1000), // Rough estimate
      };
    } catch (err) {
      logger.error("Voice synthesis failed", { error: String(err) });
      throw err;
    }
  }

  // Start listening mode
  async startListening(): Promise<void> {
    if (this.isListening) return;

    logger.info("Voice listening started");
    this.isListening = true;

    // TODO: Implement continuous listening
    // - Start audio capture
    // - Detect speech
    // - Auto-transcribe when speech ends
    // - Process through agent
  }

  // Stop listening
  async stopListening(): Promise<void> {
    logger.info("Voice listening stopped");
    this.isListening = false;
  }

  // Wake word detection
  async detectWakeWord(audioBase64: string, wakeWords: string[]): Promise<boolean> {
    logger.debug("Detecting wake word", { wakeWords });

    // TODO: Implement wake word detection
    // Common wake words: "hej agent", "Hey CLAW", etc.

    return false; // Mock
  }

  // Voice conversation mode (end-to-end)
  async processVoiceInput(audioBase64: string): Promise<{ response: string; audio: TTSResult }> {
    // 1. Transcribe
    const sttResult = await this.transcribeAudio(audioBase64);
    logger.info("Voice input transcribed", {
      text: sttResult.text.substring(0, 100),
      confidence: sttResult.confidence,
    });

    // 2. Process through agent (TODO: integrate with main agent)
    const agentResponse = `Response to: "${sttResult.text}"`;

    // 3. Synthesize response
    const ttsResult = await this.synthesizeVoice(agentResponse);

    return {
      response: agentResponse,
      audio: ttsResult,
    };
  }

  // Get configuration
  getConfig(): VoiceConfig {
    return this.config;
  }

  // Update configuration
  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info("VoiceModule config updated", this.config);
  }
}

export const voice = new VoiceModule();
export default voice;
