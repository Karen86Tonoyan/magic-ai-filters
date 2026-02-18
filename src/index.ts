// ============================================================
// CLAW BOT — Punkt wejścia
// ============================================================

import { logger } from "./logger/index.js";
import { config } from "./config/index.js";
import { gateway } from "./gateway/index.js";
import { agent } from "./agent/index.js";
import { telegramChannel } from "./channels/telegram/index.js";
import { discordChannel } from "./channels/discord/index.js";
import { tts } from "./tts/index.js";
import { skillRegistry } from "./skills/index.js";
import type { ChannelAdapter } from "./types/index.js";

async function main(): Promise<void> {
  logger.info("═══════════════════════════════════════");
  logger.info("  CLAW BOT — Starting up");
  logger.info(`  Env: ${config.env}`);
  logger.info(`  Model: ${config.ollama.model}`);
  logger.info("═══════════════════════════════════════");

  // 1. Sprawdź połączenie z Ollama
  const ollamaOk = await agent.healthCheck();
  if (!ollamaOk) {
    logger.warn("Ollama not available — make sure `ollama serve` is running");
  }

  // 2. Sprawdź TTS
  const ttsStatus = await tts.healthCheck();
  logger.info(`TTS: ${ttsStatus.backend} — ${ttsStatus.available ? "available" : "not available"}`);

  // 3. Zaloguj dostępne skille
  const skills = skillRegistry.list();
  logger.info(`Skills loaded: ${skills.map((s) => s.name).join(", ")}`);

  // 4. Uruchom Gateway
  await gateway.start();

  // 5. Uruchom kanały
  const channels: ChannelAdapter[] = [];

  if (config.telegram.enabled) {
    channels.push(telegramChannel);
  }

  if (config.discord.enabled) {
    channels.push(discordChannel);
  }

  if (channels.length === 0) {
    logger.warn(
      "No channels configured! Add TELEGRAM_BOT_TOKEN or DISCORD_BOT_TOKEN to .env"
    );
  }

  await Promise.all(channels.map((ch) => ch.start()));

  logger.info("═══════════════════════════════════════");
  logger.info("  CLAW BOT — Ready");

  if (config.telegram.enabled) {
    logger.info("  [Telegram] ✓ active");
  }
  if (config.discord.enabled) {
    logger.info("  [Discord]  ✓ active");
  }

  logger.info("  Press Ctrl+C to stop");
  logger.info("═══════════════════════════════════════");

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);

    await Promise.all([
      gateway.stop(),
      ...channels.map((ch) => ch.stop()),
    ]);

    logger.info("CLAW BOT stopped. Goodbye.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
