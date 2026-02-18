// ============================================================
// CLAW BOT — Kanał Discord (discord.js)
// ============================================================

import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { logger } from "../../logger/index.js";
import { config } from "../../config/index.js";
import { security } from "../../security/index.js";
import { agent } from "../../agent/index.js";
import { sessionManager } from "../../gateway/sessions.js";
import { tts } from "../../tts/index.js";
import type { ChannelAdapter } from "../../types/index.js";

export class DiscordChannel implements ChannelAdapter {
  type = "discord" as const;
  private client: Client | null = null;

  async start(): Promise<void> {
    if (!config.discord.enabled || !config.discord.token) {
      logger.warn("Discord disabled (no token configured)");
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupEventHandlers();

    await this.client.login(config.discord.token);

    // Zarejestruj slash commands
    if (config.discord.clientId) {
      await this.registerSlashCommands();
    }
  }

  async stop(): Promise<void> {
    await this.client?.destroy();
    logger.info("Discord bot stopped");
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.client) return;
    const channel = await this.client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await channel.send(content);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.once(Events.ClientReady, (c) => {
      logger.info(`Discord bot ready: ${c.user.tag}`);
    });

    // Obsługa slash commands
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleSlashCommand(interaction);
    });

    // Obsługa wiadomości
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignoruj własne wiadomości
      if (message.author.bot) return;

      // W kanałach — wymagaj @mention
      if (!message.channel.isDMBased()) {
        if (!message.mentions.has(this.client!.user!)) return;
      }

      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    const userId = message.author.id;
    const chatId = message.channelId;
    const displayName = message.author.displayName ?? message.author.username;

    // Sprawdź bezpieczeństwo
    const secCtx = await security.evaluate(
      "discord",
      userId,
      message.author.username
    );

    if (!secCtx.isWhitelisted) {
      logger.warn("Unauthorized Discord message", { userId, username: displayName });
      await message.reply(
        `Brak dostępu. Twoje ID: \`${userId}\`\nSkontaktuj się z administratorem.`
      );
      return;
    }

    if (secCtx.isRateLimited) {
      await message.reply("Zbyt wiele wiadomości. Poczekaj chwilę.");
      return;
    }

    // Usuń @mention z tekstu
    let text = message.content
      .replace(`<@${this.client!.user!.id}>`, "")
      .trim();

    if (!text) {
      await message.reply("Napisz coś, na co mam odpowiedzieć.");
      return;
    }

    // Sanityzacja
    const { safe, threats } = security.sanitizeInput(text);

    const sess = sessionManager.getOrCreate(
      "discord", userId, chatId, displayName, true
    );

    // Audit
    security.audit({
      channelType: "discord",
      userId,
      action: "message",
      message: safe.substring(0, 200),
      threatLevel: threats.length > 0 ? "medium" : "none",
    });

    if (threats.length > 0) {
      await message.reply(
        "Wykryto potencjalną próbę manipulacji. Wiadomość przetworzona jako zwykły tekst."
      );
    }

    // Wskaźnik pisania
    await message.channel.sendTyping();

    agent.addToHistory(sess, "user", safe);
    const startTime = Date.now();

    const response = await agent.chat(sess, safe);
    const duration = Date.now() - startTime;

    agent.addToHistory(sess, "assistant", response.content);

    security.audit({
      channelType: "discord",
      userId,
      action: "response",
      response: response.content.substring(0, 200),
      threatLevel: "none",
      duration,
    });

    // Wyślij odpowiedź (Discord limit: 2000 znaków)
    const chunks = splitMessage(response.content, 1900);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply(chunks[i]);
      } else {
        await message.channel.send(chunks[i]);
      }
    }
  }

  private async handleSlashCommand(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const userId = interaction.user.id;

    switch (interaction.commandName) {
      case "status": {
        const ollamaOk = await agent.healthCheck();
        await interaction.reply({
          content:
            `**Status CLAW:**\n\n` +
            `• Ollama: ${ollamaOk ? "✓ działa" : "✗ błąd"}\n` +
            `• Model: \`${config.ollama.model}\`\n` +
            `• Sesje: ${sessionManager.stats().total}`,
          ephemeral: true,
        });
        break;
      }

      case "clear": {
        if (!security.isWhitelisted("discord", userId)) {
          await interaction.reply({ content: "Brak dostępu.", ephemeral: true });
          return;
        }
        const chatId = interaction.channelId;
        const sess = sessionManager.getOrCreate(
          "discord", userId, chatId,
          interaction.user.username, true
        );
        agent.clearHistory(sess);
        await interaction.reply({ content: "Historia wyczyszczona.", ephemeral: true });
        break;
      }

      case "voice": {
        if (!security.isWhitelisted("discord", userId)) {
          await interaction.reply({ content: "Brak dostępu.", ephemeral: true });
          return;
        }
        const text = interaction.options.getString("text", true);
        await interaction.deferReply();

        const audioPath = await tts.synthesize(text);
        if (audioPath) {
          const attachment = new AttachmentBuilder(audioPath, { name: "voice.wav" });
          await interaction.editReply({ files: [attachment] });
        } else {
          await interaction.editReply("TTS niedostępny.");
        }
        break;
      }

      case "help": {
        await interaction.reply({
          content:
            "**Komendy CLAW:**\n\n" +
            "• `/status` — status systemu\n" +
            "• `/clear` — wyczyść historię\n" +
            "• `/voice <tekst>` — synteza mowy\n" +
            "• `/help` — ta wiadomość\n\n" +
            "Lub po prostu wspomnij mnie @CLAW w kanale albo napisz DM.",
          ephemeral: true,
        });
        break;
      }
    }
  }

  private async registerSlashCommands(): Promise<void> {
    const commands = [
      new SlashCommandBuilder()
        .setName("status")
        .setDescription("Sprawdź status CLAW"),
      new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Wyczyść historię rozmowy"),
      new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Synteza mowy (TTS)")
        .addStringOption((opt) =>
          opt.setName("text").setDescription("Tekst do przeczytania").setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName("help")
        .setDescription("Pomoc"),
    ].map((cmd) => cmd.toJSON());

    const rest = new REST().setToken(config.discord.token!);

    try {
      await rest.put(Routes.applicationCommands(config.discord.clientId!), {
        body: commands,
      });
      logger.info("Discord slash commands registered");
    } catch (err) {
      logger.error("Failed to register Discord commands", { error: String(err) });
    }
  }
}

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

export const discordChannel = new DiscordChannel();
export default discordChannel;
