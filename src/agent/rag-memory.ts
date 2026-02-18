// ============================================================
// CLAW BOT — RAG Memory (Retrieval-Augmented Generation)
// Semantic memory search with embeddings
// ============================================================

import { logger } from "../logger/index.js";
import { longTermMemory } from "./memory.js";
import type { Session } from "../types/index.js";

export interface EmbeddingVector {
  id: string;
  text: string;
  embedding: number[]; // Vector representation
  metadata: Record<string, unknown>;
  similarity?: number;
}

export interface RAGResult {
  relevantMemories: EmbeddingVector[];
  augmentedContext: string;
  contextQuality: number; // 0-1
}

export class RAGMemory {
  private embeddings: Map<string, EmbeddingVector> = new Map();

  // Simple cosine similarity for embeddings
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Simple embedding (mock - normally use OpenAI embeddings API)
  private generateEmbedding(text: string): number[] {
    // Mock: generate random vector based on text
    // In production: call OpenAI embeddings API
    const words = text.split(" ");
    const vector: number[] = [];

    // Very basic: word frequency hash
    for (let i = 0; i < 384; i++) {
      let sum = 0;
      for (const word of words) {
        for (let j = 0; j < word.length; j++) {
          sum += word.charCodeAt(j) * (i + 1);
        }
      }
      vector.push((sum % 1000) / 1000);
    }

    return vector;
  }

  // Store embedding for future retrieval
  async storeEmbedding(text: string, metadata: Record<string, unknown>): Promise<string> {
    const id = `emb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const embedding = this.generateEmbedding(text);

    const vector: EmbeddingVector = {
      id,
      text,
      embedding,
      metadata,
    };

    this.embeddings.set(id, vector);
    logger.debug("Embedding stored", { id, textLength: text.length });

    return id;
  }

  // Retrieve relevant memories using semantic search
  async retrieveRelevant(query: string, limit = 5, threshold = 0.3): Promise<EmbeddingVector[]> {
    const queryEmbedding = this.generateEmbedding(query);
    const similarities: Array<{ vector: EmbeddingVector; score: number }> = [];

    for (const vector of this.embeddings.values()) {
      const similarity = this.cosineSimilarity(queryEmbedding, vector.embedding);

      if (similarity >= threshold) {
        similarities.push({ vector, score: similarity });
      }
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.score - a.score);

    const results = similarities.slice(0, limit).map((item) => ({
      ...item.vector,
      similarity: item.score,
    }));

    logger.debug("RAG retrieval", {
      query: query.substring(0, 50),
      resultsCount: results.length,
      topScore: results[0]?.similarity,
    });

    return results;
  }

  // Full RAG pipeline: augment query with relevant memories
  async augmentWithRAG(userQuery: string, session: Session): Promise<RAGResult> {
    // 1. Get user's long-term memories
    const userMemories = longTermMemory.getAll(session.channelUserId);

    // 2. Store recent ones in embedding index
    for (const memory of userMemories.slice(-10)) {
      const memoryText = `${memory.key}: ${typeof memory.value === "string" ? memory.value : JSON.stringify(memory.value)}`;
      await this.storeEmbedding(memoryText, { userId: session.channelUserId, source: "user_memory" });
    }

    // 3. Retrieve relevant memories
    const relevantMemories = await this.retrieveRelevant(userQuery, 5, 0.2);

    // 4. Build augmented context
    let augmentedContext = "";
    if (relevantMemories.length > 0) {
      augmentedContext = "### Relevant Context from Memory:\n";
      for (const memory of relevantMemories) {
        augmentedContext += `- ${memory.text}\n`;
      }
      augmentedContext += "\n";
    }

    const contextQuality =
      relevantMemories.length > 0
        ? Math.min(1, (relevantMemories[0].similarity ?? 0) * 1.2)
        : 0;

    logger.info("RAG augmentation complete", {
      queryLength: userQuery.length,
      relevantMemoriesCount: relevantMemories.length,
      contextQuality,
    });

    return {
      relevantMemories,
      augmentedContext,
      contextQuality,
    };
  }

  // Build enhanced system prompt with RAG
  async buildEnhancedPrompt(basePrompt: string, ragResult: RAGResult): Promise<string> {
    return `${basePrompt}

${ragResult.augmentedContext}

Użyj powyższego kontekstu z pamięci użytkownika, jeśli jest to istotne dla odpowiedzi.`;
  }

  // Clear embeddings (for privacy)
  clearEmbeddings(userId?: string): number {
    if (!userId) {
      const count = this.embeddings.size;
      this.embeddings.clear();
      logger.info("All embeddings cleared");
      return count;
    }

    let count = 0;
    for (const [id, vector] of this.embeddings) {
      if (vector.metadata.userId === userId) {
        this.embeddings.delete(id);
        count++;
      }
    }

    logger.info("User embeddings cleared", { userId, count });
    return count;
  }

  // Get embedding stats
  getStats(): { total: number; byUser: Record<string, number> } {
    const byUser: Record<string, number> = {};

    for (const vector of this.embeddings.values()) {
      const userId = (vector.metadata.userId as string) || "unknown";
      byUser[userId] = (byUser[userId] ?? 0) + 1;
    }

    return {
      total: this.embeddings.size,
      byUser,
    };
  }
}

export const ragMemory = new RAGMemory();
export default ragMemory;
