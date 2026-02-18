// ============================================================
// CLAW BOT — Multi-AI Router (z ALFA Bot)
// Intelligent routing between Ollama + OpenAI + other models
// ============================================================

import { llmRouter } from "./llm-router.js";
import { logger } from "../logger/index.js";
import type { Session } from "../types/index.js";

export interface ModelProfile {
  name: string;
  provider: "ollama" | "openai" | "other";
  strengths: string[]; // technical, creative, analytical, etc.
  maxTokens: number;
  costPer1kTokens: number; // in cents
}

export interface RoutingDecision {
  selectedModel: string;
  provider: "ollama" | "openai";
  reasoning: string;
  confidence: number; // 0-1
}

export class MultiAIRouter {
  private models: Map<string, ModelProfile> = new Map();

  constructor() {
    // Ollama models
    this.models.set("llama3.2", {
      name: "Llama 3.2",
      provider: "ollama",
      strengths: ["balanced", "reasoning", "coding"],
      maxTokens: 8192,
      costPer1kTokens: 0,
    });

    this.models.set("neural-chat", {
      name: "Neural Chat",
      provider: "ollama",
      strengths: ["conversation", "creative", "polish"],
      maxTokens: 4096,
      costPer1kTokens: 0,
    });

    // OpenAI models
    this.models.set("gpt-4o-mini", {
      name: "GPT-4 Mini",
      provider: "openai",
      strengths: ["coding", "analysis", "technical"],
      maxTokens: 4096,
      costPer1kTokens: 0.15,
    });

    this.models.set("gpt-4o", {
      name: "GPT-4",
      provider: "openai",
      strengths: ["complex reasoning", "analysis", "creative"],
      maxTokens: 128000,
      costPer1kTokens: 3.0,
    });

    logger.info("MultiAIRouter initialized", {
      models: this.models.size,
    });
  }

  // Intelligent routing
  async route(
    userMessage: string,
    context?: {
      sessionLength?: number;
      queryType?: "quick" | "complex" | "creative" | "technical";
      budget?: "free" | "premium";
    }
  ): Promise<RoutingDecision> {
    const msgLower = userMessage.toLowerCase();
    let selectedModel = "llama3.2";
    let provider: "ollama" | "openai" = "ollama";
    let reasoning = "Default routing to Ollama";
    let confidence = 0.7;

    // ——— Type Detection ————————————————————————————————————

    // Technical/coding queries → prefer Qwen or GPT
    if (
      msgLower.includes("kod") ||
      msgLower.includes("python") ||
      msgLower.includes("javascript") ||
      msgLower.includes("api") ||
      msgLower.includes("algorithm") ||
      msgLower.includes("code")
    ) {
      selectedModel = "gpt-4o-mini";
      provider = "openai";
      reasoning = "Technical query detected → GPT-4 Mini for code expertise";
      confidence = 0.95;
    }

    // Long conversations/analysis → prefer Kimi or GPT-4
    else if (
      msgLower.includes("wyjaśnij") ||
      msgLower.includes("analiz") ||
      msgLower.includes("opowiedz") ||
      msgLower.includes("historia") ||
      userMessage.length > 500
    ) {
      selectedModel = "gpt-4o";
      provider = "openai";
      reasoning = "Long/analytical query → GPT-4 for deep reasoning";
      confidence = 0.9;
    }

    // Creative writing
    else if (
      msgLower.includes("piszę") ||
      msgLower.includes("historia") ||
      msgLower.includes("powieść") ||
      msgLower.includes("poem")
    ) {
      selectedModel = "neural-chat";
      provider = "ollama";
      reasoning = "Creative content → Neural Chat for creative generation";
      confidence = 0.85;
    }

    // Quick questions → stay with Ollama (free)
    else if (context?.budget === "free" || userMessage.length < 100) {
      selectedModel = "llama3.2";
      provider = "ollama";
      reasoning = "Quick query + free tier → Ollama Llama 3.2";
      confidence = 0.8;
    }

    // ——— Session Length Heuristic ———————————————————————

    if (context?.sessionLength && context.sessionLength > 50) {
      // Long session → might want best model for consistency
      if (context.budget !== "free") {
        selectedModel = "gpt-4o-mini";
        provider = "openai";
        reasoning = "Long session → upgrading to GPT-4 Mini for consistency";
        confidence = 0.75;
      }
    }

    logger.info("AI routing decision", {
      userMessageLength: userMessage.length,
      selectedModel,
      provider,
      reasoning,
      confidence,
    });

    return {
      selectedModel,
      provider,
      reasoning,
      confidence,
    };
  }

  // Process query with intelligent routing
  async process(userMessage: string, session?: Session) {
    const decision = await this.route(userMessage, {
      sessionLength: session?.history.length,
      budget: "free", // TODO: Check user plan
    });

    logger.info("Processing with router", {
      model: decision.selectedModel,
      provider: decision.provider,
    });

    // Use LLM router to send to correct provider
    const response = await llmRouter.chat(
      [
        {
          role: "system",
          content: "You are a helpful AI assistant. Respond in Polish.",
        },
        { role: "user", content: userMessage },
      ],
      decision.provider
    );

    return {
      ...response,
      routingDecision: decision,
    };
  }

  // Get model info
  getModel(modelName: string): ModelProfile | undefined {
    return this.models.get(modelName);
  }

  // List all models
  listModels(): ModelProfile[] {
    return Array.from(this.models.values());
  }

  // Add custom model
  addModel(modelName: string, profile: ModelProfile): void {
    this.models.set(modelName, profile);
    logger.info("Model added to router", { modelName });
  }
}

export const multiAIRouter = new MultiAIRouter();
export default multiAIRouter;
