// ============================================================
// CLAW BOT — LLM Router (z ALFA)
// Obsługuje Ollama + OpenAI, routing między modelami
// ============================================================

import { Ollama } from "ollama";
import { logger } from "../logger/index.js";
import { config } from "../config/index.js";

export type LLMEngine = "ollama" | "openai";

interface LLMResponse {
  engine: LLMEngine;
  content: string;
  tokensUsed?: number;
}

export class LLMRouter {
  private ollama: Ollama;
  private openaiKey?: string;
  private preferredEngine: LLMEngine = "ollama";

  constructor() {
    this.ollama = new Ollama({ host: config.ollama.host });
    this.openaiKey = process.env.OPENAI_API_KEY;

    if (this.openaiKey) {
      logger.info("LLMRouter: OpenAI configured");
    }

    logger.info("LLMRouter initialized", {
      ollama: config.ollama.host,
      openaiAvailable: Boolean(this.openaiKey),
      preferred: this.preferredEngine,
    });
  }

  // Główna metoda — routing do wybranego silnika
  async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    engine?: LLMEngine,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const targetEngine = engine ?? this.preferredEngine;

    try {
      if (targetEngine === "openai") {
        return await this.chatOpenAI(messages, options);
      } else {
        return await this.chatOllama(messages, options);
      }
    } catch (err) {
      logger.error("LLM chat error", { engine: targetEngine, error: String(err) });
      // Fallback do drugiego silnika
      if (targetEngine === "openai") {
        logger.warn("OpenAI failed, falling back to Ollama");
        return await this.chatOllama(messages, options);
      }
      throw err;
    }
  }

  private async chatOllama(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    const response = await this.ollama.chat({
      model: config.ollama.model,
      messages,
      options: {
        temperature: options?.temperature ?? config.ollama.temperature,
        num_predict: options?.maxTokens ?? config.ollama.maxTokens,
      },
    });

    return {
      engine: "ollama",
      content: response.message.content,
      tokensUsed: response.eval_count,
    };
  }

  private async chatOpenAI(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LLMResponse> {
    if (!this.openaiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { completion_tokens: number };
    };

    return {
      engine: "openai",
      content: data.choices[0]?.message.content ?? "",
      tokensUsed: data.usage.completion_tokens,
    };
  }

  // Przełącz preferowany silnik
  setPreferred(engine: LLMEngine): void {
    this.preferredEngine = engine;
    logger.info("Preferred LLM engine set", { engine });
  }

  getPreferred(): LLMEngine {
    return this.preferredEngine;
  }

  // Sprawdź dostępność
  async healthCheck(): Promise<{ ollama: boolean; openai: boolean }> {
    let ollamaOk = false;
    let openaiOk = Boolean(this.openaiKey);

    try {
      const models = await this.ollama.list();
      ollamaOk = models.models.length > 0;
    } catch {
      ollamaOk = false;
    }

    return { ollama: ollamaOk, openai: openaiOk };
  }
}

export const llmRouter = new LLMRouter();
export default llmRouter;
