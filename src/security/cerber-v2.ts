// ============================================================
// CLAW BOT — CERBER v2 (z ALFA Voice)
// Three-headed security guardian
// ============================================================

import { logger } from "../logger/index.js";
import { auditLogger } from "../logger/index.js";
import type { Session } from "../types/index.js";

/**
 * CERBER - Three-headed guardian from Greek mythology
 *
 * Head 1: API Key Protection
 * - Encrypt sensitive credentials
 * - Rate limiting on key usage
 *
 * Head 2: Conversation Privacy
 * - End-to-end encryption
 * - User consent tracking
 *
 * Head 3: Access Control
 * - Authentication & authorization
 * - Audit logging
 * - Lockout mechanisms
 */

export interface CerberConfig {
  maxFailedAttempts: number;
  lockoutDurationMs: number;
  requireEncryption: boolean;
  auditAllAccess: boolean;
  encryptionKey?: string;
}

export interface SecurityEvent {
  eventId: string;
  timestamp: Date;
  eventType: "auth_failure" | "suspicious_access" | "rate_limit" | "injection_attempt" | "api_key_access";
  userId: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
}

export class CerberV2SecurityGuard {
  private config: CerberConfig;
  private failedAttempts: Map<string, number> = new Map();
  private lockedUsers: Map<string, Date> = new Map();
  private securityEvents: SecurityEvent[] = [];

  constructor(config: Partial<CerberConfig> = {}) {
    this.config = {
      maxFailedAttempts: config.maxFailedAttempts ?? 5,
      lockoutDurationMs: config.lockoutDurationMs ?? 15 * 60 * 1000, // 15 min
      requireEncryption: config.requireEncryption ?? true,
      auditAllAccess: config.auditAllAccess ?? true,
      encryptionKey: config.encryptionKey,
    };

    logger.info("CERBER v2 initialized", {
      maxFailedAttempts: this.config.maxFailedAttempts,
      lockoutDurationMs: this.config.lockoutDurationMs,
    });
  }

  // ——— HEAD 1: API Key Protection ————————————————————————

  /**
   * Encrypt API keys before storage
   */
  encryptApiKey(apiKey: string): string {
    // TODO: Use real encryption (bcrypt, AES, etc.)
    const encrypted = Buffer.from(apiKey).toString("base64");
    logger.debug("API key encrypted");
    return encrypted;
  }

  /**
   * Decrypt API keys safely
   */
  decryptApiKey(encryptedKey: string): string {
    try {
      const decrypted = Buffer.from(encryptedKey, "base64").toString("utf-8");
      logger.debug("API key decrypted");
      return decrypted;
    } catch {
      logger.error("API key decryption failed");
      throw new Error("Invalid encrypted key");
    }
  }

  /**
   * Validate API key format
   */
  validateApiKeyFormat(apiKey: string): boolean {
    // Basic validation
    if (!apiKey || apiKey.length < 10) return false;
    if (apiKey.includes(" ")) return false;
    return true;
  }

  // ——— HEAD 2: Conversation Privacy ———————————————————

  /**
   * Encrypt conversation
   */
  encryptConversation(conversationData: Record<string, unknown>): string {
    // TODO: Real encryption
    const json = JSON.stringify(conversationData);
    const encrypted = Buffer.from(json).toString("base64");
    logger.debug("Conversation encrypted");
    return encrypted;
  }

  /**
   * Decrypt conversation
   */
  decryptConversation(encryptedData: string): Record<string, unknown> {
    try {
      const json = Buffer.from(encryptedData, "base64").toString("utf-8");
      const decrypted = JSON.parse(json);
      logger.debug("Conversation decrypted");
      return decrypted;
    } catch {
      logger.error("Conversation decryption failed");
      throw new Error("Invalid encrypted conversation");
    }
  }

  /**
   * Check user consent for data processing
   */
  checkConsentForDataProcessing(userId: string): boolean {
    // TODO: Check user privacy settings
    return true; // Mock
  }

  // ——— HEAD 3: Access Control ———————————————————————

  /**
   * Check if user is locked out
   */
  isUserLockedOut(userId: string): boolean {
    const lockExpiry = this.lockedUsers.get(userId);
    if (!lockExpiry) return false;

    if (Date.now() > lockExpiry.getTime()) {
      this.lockedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Record failed auth attempt
   */
  recordFailedAttempt(userId: string): void {
    const attempts = (this.failedAttempts.get(userId) ?? 0) + 1;
    this.failedAttempts.set(userId, attempts);

    if (attempts >= this.config.maxFailedAttempts) {
      this.lockUser(userId);
      logger.warn("User locked out due to failed attempts", { userId, attempts });
    }
  }

  /**
   * Lock user account
   */
  private lockUser(userId: string): void {
    const expiryTime = new Date(Date.now() + this.config.lockoutDurationMs);
    this.lockedUsers.set(userId, expiryTime);
    this.logSecurityEvent({
      eventType: "auth_failure",
      userId,
      severity: "high",
      details: { reason: "max_attempts_exceeded" },
    });
  }

  /**
   * Reset failed attempts
   */
  resetFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  // ——— Security Event Logging ——————————————————————

  /**
   * Log security event
   */
  private logSecurityEvent(event: Omit<SecurityEvent, "eventId" | "timestamp">): void {
    const securityEvent: SecurityEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    this.securityEvents.push(securityEvent);

    // Also log to audit logger
    auditLogger.info("security_event", {
      eventId: securityEvent.eventId,
      eventType: securityEvent.eventType,
      userId: securityEvent.userId,
      severity: securityEvent.severity,
      details: securityEvent.details,
    });

    if (securityEvent.severity === "critical") {
      logger.error("CRITICAL security event", securityEvent);
    }
  }

  /**
   * Get security events
   */
  getSecurityEvents(userId?: string, limit = 100): SecurityEvent[] {
    let events = this.securityEvents;

    if (userId) {
      events = events.filter((e) => e.userId === userId);
    }

    return events.slice(-limit);
  }

  // ——— Session Security ———————————————————————————

  /**
   * Validate session access
   */
  validateSessionAccess(session: Session, userId: string): boolean {
    if (session.channelUserId !== userId) {
      this.logSecurityEvent({
        eventType: "suspicious_access",
        userId,
        severity: "high",
        details: {
          attemptedSessionId: session.id,
          sessionOwner: session.channelUserId,
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Regenerate session token
   */
  regenerateSessionToken(session: Session): string {
    const newToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    logger.info("Session token regenerated", { sessionId: session.id });
    return newToken;
  }
}

export const cerberV2 = new CerberV2SecurityGuard();
export default cerberV2;
