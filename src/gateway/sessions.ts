// ============================================================
// CLAW BOT — Zarządzanie sesjami
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { logger } from "../logger/index.js";
import type { Session, ChannelType } from "../types/index.js";

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h

  // Pobierz lub stwórz sesję dla użytkownika
  getOrCreate(
    channelType: ChannelType,
    channelUserId: string,
    channelChatId: string,
    displayName: string,
    isAuthorized: boolean
  ): Session {
    const key = `${channelType}:${channelUserId}:${channelChatId}`;
    const existing = this.sessions.get(key);

    if (existing) {
      existing.lastActiveAt = new Date();
      existing.isAuthorized = isAuthorized;
      return existing;
    }

    const session: Session = {
      id: uuidv4(),
      channelType,
      channelUserId,
      channelChatId,
      displayName,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      history: [],
      isAuthorized,
      metadata: {},
    };

    this.sessions.set(key, session);
    logger.info("New session created", {
      sessionId: session.id,
      channelType,
      userId: channelUserId,
      displayName,
    });

    return session;
  }

  // Pobierz sesję po ID
  getById(sessionId: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.id === sessionId) return session;
    }
    return undefined;
  }

  // Usuń sesję
  delete(channelType: ChannelType, channelUserId: string, channelChatId: string): boolean {
    const key = `${channelType}:${channelUserId}:${channelChatId}`;
    const existed = this.sessions.has(key);
    this.sessions.delete(key);
    return existed;
  }

  // Lista wszystkich sesji
  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  // Statystyki
  stats(): { total: number; authorized: number; active24h: number } {
    const now = Date.now();
    let authorized = 0;
    let active24h = 0;

    for (const session of this.sessions.values()) {
      if (session.isAuthorized) authorized++;
      if (now - session.lastActiveAt.getTime() < this.SESSION_TIMEOUT_MS) active24h++;
    }

    return { total: this.sessions.size, authorized, active24h };
  }

  // Cleanup wygasłych sesji (uruchamiany co godzinę)
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt.getTime() > this.SESSION_TIMEOUT_MS * 7) {
        this.sessions.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`Cleaned up ${removed} expired sessions`);
    }
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;
