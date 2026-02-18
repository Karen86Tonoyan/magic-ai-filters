// ============================================================
// CLAW BOT — System Bezpieczeństwa
// Whitelist, rate limiting, prompt injection defense
// ============================================================

import { RateLimiterMemory } from "rate-limiter-flexible";
import { auditLogger, logger } from "../logger/index.js";
import { config } from "../config/index.js";
import type { ChannelType, SecurityContext, AuditLogEntry } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

// ——— Rate Limiters ———————————————————————————————————————————

const rateLimiterPerMinute = new RateLimiterMemory({
  points: config.security.rateLimitPerMinute,
  duration: 60,
  blockDuration: 60,
});

const rateLimiterPerDay = new RateLimiterMemory({
  points: config.security.rateLimitPerDay,
  duration: 86400,
  blockDuration: 3600,
});

// ——— Prompt Injection Patterns ——————————————————————————————

const INJECTION_PATTERNS: RegExp[] = [
  // Próby nadpisania systemu
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(everything|all)\s+(you|i)\s+(know|told)/gi,
  /you\s+are\s+now\s+(a\s+)?(?!CLAW)/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?(?!an?\s+assistant)/gi,
  /pretend\s+(you\s+are|to\s+be)\s+(?!helpful)/gi,
  /\[SYSTEM\]/gi,
  /\[ADMIN\]/gi,
  /\[OVERRIDE\]/gi,
  /\[JAILBREAK\]/gi,
  /DAN\s+mode/gi,
  /developer\s+mode/gi,
  /do\s+anything\s+now/gi,
  /bez\s+(cenzury|ogranicze[nń])/gi,
  /wy[lł][aą]cz\s+(filtr|zasad|limit)/gi,
  /pomi[nń]\s+zasad/gi,
];

// ——— Główna klasa bezpieczeństwa ————————————————————————————

export class SecurityManager {
  private whitelists: Map<ChannelType, Set<string>> = new Map();

  constructor() {
    // Załaduj whitelisty z konfiguracji
    this.whitelists.set(
      "telegram",
      new Set(config.telegram.whitelist.map(String))
    );
    this.whitelists.set(
      "discord",
      new Set(config.discord.whitelist.map(String))
    );

    logger.info("SecurityManager initialized", {
      telegramWhitelist: config.telegram.whitelist.length,
      discordWhitelist: config.discord.whitelist.length,
      rateLimitPerMinute: config.security.rateLimitPerMinute,
    });
  }

  // Sprawdź uprawnienia użytkownika
  async evaluate(
    channelType: ChannelType,
    userId: string,
    username?: string
  ): Promise<SecurityContext> {
    const whitelist = this.whitelists.get(channelType);
    const isWhitelisted = config.security.requireWhitelist
      ? (whitelist?.has(userId) ?? false)
      : true;

    let isRateLimited = false;
    if (isWhitelisted) {
      isRateLimited = !(await this.checkRateLimit(userId));
    }

    return {
      channelType,
      userId,
      username,
      isWhitelisted,
      isRateLimited,
      threatLevel: "none",
    };
  }

  // Sprawdź rate limit
  private async checkRateLimit(userId: string): Promise<boolean> {
    try {
      await rateLimiterPerMinute.consume(userId);
      await rateLimiterPerDay.consume(userId);
      return true;
    } catch {
      logger.warn("Rate limit exceeded", { userId });
      return false;
    }
  }

  // Sanityzacja i ochrona przed prompt injection
  sanitizeInput(input: string): { safe: string; threats: string[] } {
    const threats: string[] = [];
    let safe = input;

    // Sprawdź długość
    if (input.length > config.security.maxMessageLength) {
      safe = input.substring(0, config.security.maxMessageLength);
      threats.push("message_too_long");
    }

    if (config.security.enablePromptInjectionDefense) {
      for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(safe)) {
          threats.push(`injection_pattern: ${pattern.source.substring(0, 30)}`);
          // Nie usuwamy, tylko oznaczamy — decyzja należy do agenta
        }
        pattern.lastIndex = 0; // reset dla flag /g
      }
    }

    // Usuń zero-width characters (ukryte instrukcje)
    safe = safe.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");

    // Normalize whitespace
    safe = safe.trim();

    return { safe, threats };
  }

  // Dodaj użytkownika do whitelisty (runtime)
  addToWhitelist(channelType: ChannelType, userId: string): void {
    if (!this.whitelists.has(channelType)) {
      this.whitelists.set(channelType, new Set());
    }
    this.whitelists.get(channelType)!.add(userId);
    logger.info("User added to whitelist", { channelType, userId });
  }

  // Usuń użytkownika z whitelisty (runtime)
  removeFromWhitelist(channelType: ChannelType, userId: string): void {
    this.whitelists.get(channelType)?.delete(userId);
    logger.info("User removed from whitelist", { channelType, userId });
  }

  // Sprawdź czy user jest na whiteliście
  isWhitelisted(channelType: ChannelType, userId: string): boolean {
    if (!config.security.requireWhitelist) return true;
    return this.whitelists.get(channelType)?.has(userId) ?? false;
  }

  // Logowanie audytu
  audit(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    if (!config.logging.auditEnabled) return;

    const full: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };

    auditLogger.info("audit", full);

    if (entry.threatLevel !== "none") {
      logger.warn("Security threat detected", {
        userId: entry.userId,
        channelType: entry.channelType,
        threatLevel: entry.threatLevel,
        action: entry.action,
      });
    }
  }
}

// Singleton
export const security = new SecurityManager();
export default security;
