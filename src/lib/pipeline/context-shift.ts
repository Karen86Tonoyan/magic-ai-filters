/**
 * Context Shift Detection — Cosine Similarity between turns
 * ALFA SHIELD v1.5
 * 
 * Detects sudden intent changes via TF-IDF vectorization + cosine similarity.
 * Alert when similarity drops below threshold → possible delayed injection.
 */

// ─── TOKENIZER ──────────────────────────────────────────────

/** Simple word tokenizer — lowercase, strip punctuation, min 2 chars */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-zàáâãäåąćęłńóśźżа-яё0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

// ─── TF-IDF VECTORIZER ─────────────────────────────────────

export interface TermVector {
  terms: Map<string, number>;
  magnitude: number;
}

/** Build term-frequency vector from tokens */
export function buildTermVector(tokens: string[]): TermVector {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  // Normalize by token count
  const total = tokens.length || 1;
  for (const [k, v] of tf) {
    tf.set(k, v / total);
  }
  let mag = 0;
  for (const v of tf.values()) mag += v * v;
  return { terms: tf, magnitude: Math.sqrt(mag) };
}

// ─── COSINE SIMILARITY ─────────────────────────────────────

/** Cosine similarity between two term vectors. Returns 0..1 */
export function cosineSimilarity(a: TermVector, b: TermVector): number {
  if (a.magnitude === 0 || b.magnitude === 0) return 0;

  let dot = 0;
  // Iterate over smaller set for efficiency
  const [smaller, larger] = a.terms.size <= b.terms.size ? [a, b] : [b, a];
  for (const [term, weight] of smaller.terms) {
    const otherWeight = larger.terms.get(term);
    if (otherWeight !== undefined) {
      dot += weight * otherWeight;
    }
  }
  return dot / (a.magnitude * b.magnitude);
}

// ─── CONTEXT SHIFT DETECTOR ────────────────────────────────

export interface ContextShiftResult {
  /** Cosine similarity to previous turn (0..1, lower = bigger shift) */
  similarity: number;
  /** Whether shift exceeds threshold */
  shift_detected: boolean;
  /** Risk bonus to add to scan score */
  shift_penalty: number;
  /** How many consecutive shifts detected */
  consecutive_shifts: number;
  /** Category of shift */
  shift_type: 'none' | 'mild' | 'significant' | 'radical';
}

export interface ContextShiftConfig {
  /** Similarity below this = significant shift (default 0.15) */
  radical_threshold: number;
  /** Similarity below this = mild shift (default 0.35) */
  significant_threshold: number;
  /** Similarity below this = mild shift (default 0.55) */
  mild_threshold: number;
  /** Min turns before detection activates */
  min_turns: number;
  /** Max penalty applied */
  max_penalty: number;
}

const DEFAULT_CONFIG: ContextShiftConfig = {
  radical_threshold: 0.15,
  significant_threshold: 0.35,
  mild_threshold: 0.55,
  min_turns: 2,
  max_penalty: 0.25,
};

export class ContextShiftDetector {
  private history: TermVector[] = [];
  private consecutiveShifts = 0;
  private config: ContextShiftConfig;

  constructor(config?: Partial<ContextShiftConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Analyze current input against conversation history */
  analyze(input: string): ContextShiftResult {
    const tokens = tokenize(input);
    const current = buildTermVector(tokens);

    // Not enough history — store and return neutral
    if (this.history.length < this.config.min_turns) {
      this.history.push(current);
      this.consecutiveShifts = 0;
      return {
        similarity: 1.0,
        shift_detected: false,
        shift_penalty: 0,
        consecutive_shifts: 0,
        shift_type: 'none',
      };
    }

    // Compare against last turn AND average of last 3
    const prev = this.history[this.history.length - 1];
    const simToPrev = cosineSimilarity(current, prev);

    // Weighted average with recent context window
    const windowSize = Math.min(3, this.history.length);
    const recentVectors = this.history.slice(-windowSize);
    const avgSim = recentVectors.reduce((sum, v) => sum + cosineSimilarity(current, v), 0) / windowSize;

    // Use the lower of both signals (conservative)
    const similarity = Math.min(simToPrev, avgSim);

    // Classify shift type
    let shift_type: ContextShiftResult['shift_type'] = 'none';
    let shift_penalty = 0;

    if (similarity < this.config.radical_threshold) {
      shift_type = 'radical';
      shift_penalty = this.config.max_penalty;
      this.consecutiveShifts++;
    } else if (similarity < this.config.significant_threshold) {
      shift_type = 'significant';
      shift_penalty = this.config.max_penalty * 0.6;
      this.consecutiveShifts++;
    } else if (similarity < this.config.mild_threshold) {
      shift_type = 'mild';
      shift_penalty = this.config.max_penalty * 0.25;
      this.consecutiveShifts = 0; // mild doesn't count as consecutive
    } else {
      this.consecutiveShifts = 0;
    }

    // Consecutive shift amplifier
    if (this.consecutiveShifts >= 2) {
      shift_penalty = Math.min(shift_penalty * 1.5, this.config.max_penalty);
    }

    this.history.push(current);

    return {
      similarity: parseFloat(similarity.toFixed(4)),
      shift_detected: shift_type !== 'none' && shift_type !== 'mild',
      shift_penalty: parseFloat(shift_penalty.toFixed(4)),
      consecutive_shifts: this.consecutiveShifts,
      shift_type,
    };
  }

  /** Get full similarity matrix for visualization */
  getSimilarityHistory(): number[] {
    if (this.history.length < 2) return [];
    const sims: number[] = [];
    for (let i = 1; i < this.history.length; i++) {
      sims.push(parseFloat(cosineSimilarity(this.history[i - 1], this.history[i]).toFixed(4)));
    }
    return sims;
  }

  reset(): void {
    this.history = [];
    this.consecutiveShifts = 0;
  }
}
