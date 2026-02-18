// ============================================================
// CLAW BOT — Long-term Memory Management (LangGraph-style)
// Short-term (session) + Long-term (persistent)
// ============================================================

import { logger } from "../logger/index.js";
import type { Session } from "../types/index.js";

// ——— Memory Types ————————————————————————————————————————————

export interface MemoryEntry {
  id: string;
  userId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
  ttl?: number; // Time to live in seconds
  importance: number; // 0-1, affects retrieval
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  lastNMessages: number; // Keep last N messages
  summary?: string; // Summarize old messages
}

// ——— Short-term Memory ———————————————————————————————————————

export class ShortTermMemory {
  private entries: Map<string, unknown> = new Map();

  set(key: string, value: unknown): void {
    this.entries.set(key, value);
  }

  get(key: string): unknown {
    return this.entries.get(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  all(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of this.entries) {
      obj[k] = v;
    }
    return obj;
  }
}

// ——— Long-term Memory ———————————————————————————————————————

export class LongTermMemory {
  private store: Map<string, MemoryEntry> = new Map();

  // Store memory
  save(userId: string, key: string, value: unknown, importance = 0.5): string {
    const id = `${userId}:${key}:${Date.now()}`;

    const entry: MemoryEntry = {
      id,
      userId,
      key,
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
      importance,
    };

    this.store.set(id, entry);
    logger.debug("Memory saved", { userId, key, id });

    return id;
  }

  // Retrieve by key
  retrieve(userId: string, key: string): MemoryEntry | undefined {
    for (const entry of this.store.values()) {
      if (entry.userId === userId && entry.key === key) {
        return entry;
      }
    }
    return undefined;
  }

  // Semantic search (simple keyword match)
  search(userId: string, query: string, limit = 10): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const entry of this.store.values()) {
      if (entry.userId !== userId) continue;

      const keyMatch = entry.key.toLowerCase().includes(queryLower);
      const valueMatch =
        typeof entry.value === "string" &&
        entry.value.toLowerCase().includes(queryLower);

      if (keyMatch || valueMatch) {
        results.push(entry);
      }
    }

    // Sort by importance + recency
    results.sort((a, b) => {
      const importanceDiff = (b.importance || 0) - (a.importance || 0);
      if (importanceDiff !== 0) return importanceDiff;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return results.slice(0, limit);
  }

  // Get all memories for user
  getAll(userId: string): MemoryEntry[] {
    return Array.from(this.store.values()).filter((e) => e.userId === userId);
  }

  // Delete memory
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  // Clear all (dangerous!)
  clearUser(userId: string): number {
    let count = 0;
    for (const [id, entry] of this.store) {
      if (entry.userId === userId) {
        this.store.delete(id);
        count++;
      }
    }
    logger.warn("User memory cleared", { userId, count });
    return count;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [id, entry] of this.store) {
      if (entry.ttl && entry.updatedAt.getTime() + entry.ttl * 1000 < now) {
        this.store.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`Memory cleanup: removed ${removed} expired entries`);
    }
  }

  // Statistics
  stats(): { total: number; byUser: Record<string, number> } {
    const byUser: Record<string, number> = {};

    for (const entry of this.store.values()) {
      byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;
    }

    return {
      total: this.store.size,
      byUser,
    };
  }
}

// ——— Checkpoint (State Persistence) ——————————————————————

export interface Checkpoint {
  id: string;
  sessionId: string;
  timestamp: Date;
  state: Record<string, unknown>;
  step: number;
}

export class CheckpointStore {
  private checkpoints: Map<string, Checkpoint> = new Map();

  save(sessionId: string, step: number, state: Record<string, unknown>): string {
    const id = `${sessionId}:${step}:${Date.now()}`;

    const checkpoint: Checkpoint = {
      id,
      sessionId,
      timestamp: new Date(),
      state,
      step,
    };

    this.checkpoints.set(id, checkpoint);
    logger.debug("Checkpoint saved", { sessionId, step });

    return id;
  }

  getLatest(sessionId: string): Checkpoint | undefined {
    const relevant = Array.from(this.checkpoints.values()).filter(
      (c) => c.sessionId === sessionId
    );

    if (relevant.length === 0) return undefined;

    return relevant.sort((a, b) => b.step - a.step)[0];
  }

  restore(sessionId: string, step: number): Record<string, unknown> | undefined {
    for (const checkpoint of this.checkpoints.values()) {
      if (checkpoint.sessionId === sessionId && checkpoint.step === step) {
        return checkpoint.state;
      }
    }
    return undefined;
  }
}

// ——— Singletons —————————————————————————————————————————

export const shortTermMemory = new ShortTermMemory();
export const longTermMemory = new LongTermMemory();
export const checkpointStore = new CheckpointStore();

// Cleanup periodic task
setInterval(() => {
  longTermMemory.cleanup();
}, 60 * 60 * 1000); // Every hour

export default {
  shortTermMemory,
  longTermMemory,
  checkpointStore,
};
