// ============================================================
// CLAW BOT — Kanał Telegram (grammY)
// ============================================================

import { Bot, Context, session, type SessionFlavor } from "grammy";
import { logger } from "../../logger/index.js";
import { config } from "../../config/index.js";
import { security } from "../../security/index.js";
import { agent } from "../../agent/index.js";
import { sessionManager } from "../../gateway/sessions.js";
import { tts } from "../../tts/index.js";
import type { ChannelAdapter } from "../../types/index.js";

// Komendy dostępne dla wszystkich
const PUBLIC_COMMANDS = ["/start", "/help", "/status"];

// Komendy wymagające autoryzacji
const ADMIN_COMMANDS = ["/clear", "/whitelist", "/stats", "/voice"];

type ClawSessionData = { pairingAttempts: number };
type ClawContext = Context & SessionFlavor<ClawSessionData>;

export class TelegramChannel implements ChannelAdapter {
  type = "telegram" as const;
  private bot: Bot<ClawContext> | null = null;

  async start(): Promise<void> {
    if (!config.telegram.enabled || !config.telegram.token) {
      logger.warn("Telegram disabled (no token configured)");
      return;
    }

    this.bot = new Bot<ClawContext>(config.telegram.token);

    // Session middleware
    this.bot.use(
      session({
        initial: (): ClawSessionData => ({ pairingAttempts: 0 }),
      })
    );

    this.setupCommands();
    this.setupMessageHandler();
    this.setupErrorHandler();

    await this.bot.start({
      onStart: (info) => {
        logger.info(`Telegram bot started: @${info.username}`);
      },
    });
  }

  async stop(): Promise<void> {
    await this.bot?.stop();
    logger.info("Telegram bot stopped");
  }

  async sendMessage(chatId: string, content: string): Promise<void> {
    if (!this.bot) return;
    await this.bot.api.sendMessage(parseInt(chatId), content, {
      parse_mode: "Markdown",
    });
  }

  private setupCommands(): void {
    if (!this.bot) return;

    // /start — powitanie i weryfikacja dostępu
    this.bot.command("start", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      const username = ctx.from?.username ?? ctx.from?.first_name ?? "Unknown";
      const isAuth = security.isWhitelisted("telegram", userId);

      logger.info("Telegram /start", { userId, username, isAuth });

      if (isAuth) {
        await ctx.reply(
          `Cześć, ${username}! Jestem CLAW, Twój asystent AI.\n\n` +
          `Model: \`${config.ollama.model}\`\n` +
          `Komendy: /help`,
          { parse_mode: "Markdown" }
        );
      } else {
        // Pokaż ID użytkownika właścicielowi (w logach)
        logger.info(`Unauthorized Telegram user — add to whitelist: ${userId}`, {
          userId,
          username,
        });

        await ctx.reply(
          "Brak dostępu. Skontaktuj się z administratorem.\n\n" +
          `Twoje ID: \`${userId}\``,
          { parse_mode: "Markdown" }
        );
      }
    });

    // /help
    this.bot.command("help", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      if (!security.isWhitelisted("telegram", userId)) {
        await ctx.reply("Brak dostępu.");
        return;
      }

      await ctx.reply(
        "*Komendy CLAW:*\n\n" +
        "• /start — powitanie\n" +
        "• /help — ta wiadomość\n" +
        "• /clear — wyczyść historię rozmowy\n" +
        "• /voice — odpowiedź głosowa (TTS)\n" +
        "• /stats — statystyki bota\n" +
        "• /status — status systemu\n\n" +
        "Po prostu napisz wiadomość, żeby porozmawiać!",
        { parse_mode: "Markdown" }
      );
    });

    // /clear — wyczyść historię
    this.bot.command("clear", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      const chatId = String(ctx.chat.id);

      if (!security.isWhitelisted("telegram", userId)) {
        await ctx.reply("Brak dostępu.");
        return;
      }

      const sess = sessionManager.getOrCreate(
        "telegram", userId, chatId,
        ctx.from?.first_name ?? "User", true
      );
      agent.clearHistory(sess);
      await ctx.reply("Historia rozmowy wyczyszczona.");
    });

    // /status
    this.bot.command("status", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      if (!security.isWhitelisted("telegram", userId)) {
        await ctx.reply("Brak dostępu.");
        return;
      }

      const ollamaOk = await agent.healthCheck();
      await ctx.reply(
        `*Status CLAW:*\n\n` +
        `• Ollama: ${ollamaOk ? "✓ działa" : "✗ błąd"}\n` +
        `• Model: \`${config.ollama.model}\`\n` +
        `• Sesje: ${sessionManager.stats().total}`,
        { parse_mode: "Markdown" }
      );
    });

    // /voice — wysyła odpowiedź jako plik audio
    this.bot.command("voice", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      if (!security.isWhitelisted("telegram", userId)) {
        await ctx.reply("Brak dostępu.");
        return;
      }

      const text = ctx.match;
      if (!text) {
        await ctx.reply("Użycie: /voice <tekst do przeczytania>");
        return;
      }

      const chatId = String(ctx.chat.id);
      await ctx.replyWithChatAction("record_voice");

      const audioPath = await tts.synthesize(text);
      if (audioPath) {
        await ctx.replyWithVoice({ source: audioPath });
      } else {
        await ctx.reply("TTS niedostępny. Sprawdź konfigurację.");
      }
    });

    // /stats
    this.bot.command("stats", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      if (!security.isWhitelisted("telegram", userId)) {
        await ctx.reply("Brak dostępu.");
        return;
      }

      const stats = sessionManager.stats();
      await ctx.reply(
        `*Statystyki:*\n\n` +
        `• Sesje: ${stats.total}\n` +
        `• Autoryzowane: ${stats.authorized}\n` +
        `• Aktywne 24h: ${stats.active24h}`,
        { parse_mode: "Markdown" }
      );
    });
  }

  private setupMessageHandler(): void {
    if (!this.bot) return;

    this.bot.on("message:text", async (ctx) => {
      const userId = String(ctx.from?.id ?? "");
      const chatId = String(ctx.chat.id);
      const text = ctx.message.text;
      const displayName = ctx.from?.first_name ?? "User";

      // Pomiń komendy (obsługiwane wyżej)
      if (text.startsWith("/")) return;

      // Sprawdź bezpieczeństwo
      const secCtx = await security.evaluate("telegram", userId, ctx.from?.username);

      if (!secCtx.isWhitelisted) {
        logger.warn("Unauthorized Telegram message", { userId });
        await ctx.reply("Brak dostępu. Twoje ID: `" + userId + "`", {
          parse_mode: "Markdown",
        });
        return;
      }

      if (secCtx.isRateLimited) {
        await ctx.reply("Zbyt wiele wiadomości. Poczekaj chwilę.");
        return;
      }

      // Sanityzacja
      const { safe, threats } = security.sanitizeInput(text);

      const session = sessionManager.getOrCreate(
        "telegram", userId, chatId, displayName, true
      );

      // Audit log
      security.audit({
        channelType: "telegram",
        userId,
        action: "message",
        message: safe.substring(0, 200),
        threatLevel: threats.length > 0 ? "medium" : "none",
      });

      if (threats.length > 0) {
        logger.warn("Potential prompt injection detected", {
          userId,
          threats,
        });
        await ctx.reply(
          "Wykryto potencjalną próbę manipulacji. Wiadomość zostanie przetworzona jako zwykły tekst."
        );
      }

      // Wskaźnik pisania
      await ctx.replyWithChatAction("typing");

      // Dodaj do historii i generuj odpowiedź
      agent.addToHistory(session, "user", safe);
      const startTime = Date.now();

      const response = await agent.chat(session, safe);

      const duration = Date.now() - startTime;
      agent.addToHistory(session, "assistant", response.content);

      // Audit response
      security.audit({
        channelType: "telegram",
        userId,
        action: "response",
        response: response.content.substring(0, 200),
        threatLevel: "none",
        duration,
      });

      // Wyślij odpowiedź (z obsługą długich wiadomości)
      const chunks = splitMessage(response.content, 4096);
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(async () => {
          // Jeśli Markdown nie działa, wyślij zwykły tekst
          await ctx.reply(chunk);
        });
      }
    });
  }

  private setupErrorHandler(): void {
    if (!this.bot) return;

    this.bot.catch((err) => {
      logger.error("Telegram bot error", {
        error: err.message,
        ctx: err.ctx?.update?.update_id,
      });
    });
  }
}

// Podziel długą wiadomość na kawałki
function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen / 2) splitAt = maxLen;

    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }

  return chunks;
}

export const telegramChannel = new TelegramChannel();
export default telegramChannel;
