// ============================================================
// CLAW BOT — Agent Ollama
// Zarządza rozmowami z lokalnym LLM
// ============================================================

import { Ollama } from "ollama";
import { logger } from "../logger/index.js";
import { config } from "../config/index.js";
import { llmRouter } from "./llm-router.js";
import { cerber } from "../security/cerber.js";
import type { Session, AgentResponse, Message } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OllamaAgent {
  private client: Ollama;
  private model: string;

  constructor() {
    this.client = new Ollama({ host: config.ollama.host });
    this.model = config.ollama.model;
    logger.info("OllamaAgent initialized", {
      host: config.ollama.host,
      model: this.model,
    });
  }

  // Sprawdź połączenie z Ollama
  async healthCheck(): Promise<boolean> {
    try {
      const models = await this.client.list();
      const available = models.models.map((m) => m.name);
      const hasModel = available.some(
        (name) =>
          name === this.model ||
          name.startsWith(this.model.split(":")[0])
      );

      if (!hasModel) {
        logger.warn(`Model "${this.model}" not found. Available: ${available.join(", ")}`);
        logger.warn(`Run: ollama pull ${this.model}`);
      } else {
        logger.info("Ollama connected", { model: this.model });
      }

      return true;
    } catch (err) {
      logger.error("Ollama connection failed", {
        host: config.ollama.host,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  // Generuj odpowiedź (z Cerber Guardian)
  async chat(
    session: Session,
    userMessage: string
  ): Promise<AgentResponse> {
    // CERBER: Sprawdź czy prompt jest bezpieczny
    const cerberRuling = cerber.judge(userMessage);

    if (cerberRuling.decision === "BLOCK") {
      logger.warn("Cerber blocked prompt", {
        sessionId: session.id,
        reason: cerberRuling.blockedReason,
      });
      return {
        content: `🐕 Cerber Guardian odrzucił to zapytanie.\n\n**Powód:** ${cerberRuling.blockedReason || "Nieznany"}`,
      };
    }

    // Jeśli MODIFY — zmień prompt
    const safeMessage =
      cerberRuling.decision === "MODIFY"
        ? cerberRuling.modification || userMessage
        : userMessage;

    const messages = this.buildMessages(session, safeMessage);
    const startTime = Date.now();

    try {
      logger.debug("Sending to LLM Router", {
        model: this.model,
        sessionId: session.id,
        historyLength: session.history.length,
        cerberDecision: cerberRuling.decision,
      });

      const response = await this.client.chat({
        model: this.model,
        messages,
        options: {
          temperature: config.ollama.temperature,
          num_predict: config.ollama.maxTokens,
        },
      });

      const content = response.message.content;
      const duration = Date.now() - startTime;

      logger.debug("LLM response received", {
        sessionId: session.id,
        duration,
        tokens: response.eval_count,
      });

      return {
        content,
        usage: {
          promptTokens: response.prompt_eval_count ?? 0,
          completionTokens: response.eval_count ?? 0,
        },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("LLM chat error", {
        sessionId: session.id,
        error: error.message,
      });

      if (error.message.includes("model") && error.message.includes("not found")) {
        return {
          content: `Błąd: Model "${this.model}" nie jest zainstalowany w Ollama.\n\nUruchom: \`ollama pull ${this.model}\``,
        };
      }

      if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
        return {
          content: "Błąd: Nie mogę połączyć się z Ollama. Upewnij się że Ollama jest uruchomiona (`ollama serve`).",
        };
      }

      return {
        content: "Przepraszam, wystąpił błąd podczas przetwarzania. Spróbuj ponownie.",
      };
    }
  }

  // Buduj historię wiadomości dla Ollama
  private buildMessages(session: Session, userMessage: string): OllamaMessage[] {
    const messages: OllamaMessage[] = [
      {
        role: "system",
        content: config.ollama.systemPrompt,
      },
    ];

    // Ogranicz historię do maxHistoryLength
    const history = session.history.slice(-config.security.maxHistoryLength);

    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }

  // Dodaj wiadomość do historii sesji
  addToHistory(session: Session, role: "user" | "assistant", content: string): Message {
    const message: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      channelType: session.channelType,
      channelUserId: session.channelUserId,
      sessionId: session.id,
    };

    session.history.push(message);
    session.lastActiveAt = new Date();

    // Przytnij historię jeśli za długa
    if (session.history.length > config.security.maxHistoryLength * 2) {
      session.history = session.history.slice(-config.security.maxHistoryLength);
    }

    return message;
  }

  // Wyczyść historię sesji
  clearHistory(session: Session): void {
    session.history = [];
    logger.info("Session history cleared", { sessionId: session.id });
  }
}

export const agent = new OllamaAgent();
export default agent;
