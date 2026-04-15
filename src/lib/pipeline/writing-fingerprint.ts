/**
 * Writing Style Fingerprint — Behavioral Biometrics
 * ALFA SHIELD v1.7
 * 
 * Analyzes typing patterns, vocabulary richness, punctuation habits,
 * and structural patterns to create a unique fingerprint per user/session.
 * Detects when a banned user switches machines and re-attacks.
 */

export interface WritingFingerprint {
  /** Average word length */
  avg_word_length: number;
  /** Vocabulary richness (unique words / total words) */
  vocab_richness: number;
  /** Punctuation density (punct chars / total chars) */
  punctuation_density: number;
  /** Uppercase ratio */
  uppercase_ratio: number;
  /** Average sentence length (words per sentence) */
  avg_sentence_length: number;
  /** Question ratio (sentences ending with ?) */
  question_ratio: number;
  /** Exclamation ratio */
  exclamation_ratio: number;
  /** Special char density (non-alphanum, non-space) */
  special_char_density: number;
  /** Repeated char sequences (e.g., "!!!", "...") */
  repetition_score: number;
  /** Bigram signature — top 10 most frequent character bigrams */
  top_bigrams: string[];
  /** Language mix score (0=single lang, 1=heavy mixing) */
  language_mix: number;
}

export interface FingerprintMatch {
  similarity: number;
  matched_features: string[];
  is_likely_same_user: boolean;
}

/** Extract writing style fingerprint from text */
export function extractFingerprint(input: string): WritingFingerprint {
  const words = input.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length || 1;
  const totalChars = input.length || 1;
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));

  // Sentences
  const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Punctuation
  const punctCount = (input.match(/[.,;:!?'"()\-–—]/g) || []).length;

  // Uppercase
  const upperCount = (input.match(/[A-ZÀÁÂÃÄÅĄĆĘŁŃÓŚŹŻ]/g) || []).length;

  // Special chars
  const specialCount = (input.match(/[^a-zA-ZàáâãäåąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s]/g) || []).length;

  // Questions / exclamations
  const questionCount = (input.match(/\?/g) || []).length;
  const exclamationCount = (input.match(/!/g) || []).length;

  // Repetition score (consecutive same chars like !!!, ..., ???)
  const repetitions = (input.match(/(.)\1{2,}/g) || []).length;

  // Character bigrams
  const bigramMap = new Map<string, number>();
  const lower = input.toLowerCase();
  for (let i = 0; i < lower.length - 1; i++) {
    const bg = lower.substring(i, i + 2);
    if (/[a-z]{2}/.test(bg)) {
      bigramMap.set(bg, (bigramMap.get(bg) ?? 0) + 1);
    }
  }
  const topBigrams = [...bigramMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([bg]) => bg);

  // Language mix
  const hasPolish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(input);
  const hasEnglish = /\b(the|and|for|you|are|but|not|this|that|with)\b/i.test(input);
  const hasCyrillic = /[\u0400-\u04FF]/.test(input);
  const langCount = [hasPolish, hasEnglish, hasCyrillic].filter(Boolean).length;

  return {
    avg_word_length: parseFloat((words.reduce((s, w) => s + w.length, 0) / totalWords).toFixed(2)),
    vocab_richness: parseFloat((uniqueWords.size / totalWords).toFixed(3)),
    punctuation_density: parseFloat((punctCount / totalChars).toFixed(4)),
    uppercase_ratio: parseFloat((upperCount / totalChars).toFixed(4)),
    avg_sentence_length: parseFloat((totalWords / sentenceCount).toFixed(2)),
    question_ratio: parseFloat((questionCount / sentenceCount).toFixed(3)),
    exclamation_ratio: parseFloat((exclamationCount / sentenceCount).toFixed(3)),
    special_char_density: parseFloat((specialCount / totalChars).toFixed(4)),
    repetition_score: repetitions,
    top_bigrams: topBigrams,
    language_mix: parseFloat((Math.max(0, langCount - 1) / 2).toFixed(2)),
  };
}

/** Compare two fingerprints — returns 0..1 similarity */
export function compareFingerprints(a: WritingFingerprint, b: WritingFingerprint): FingerprintMatch {
  const features: { name: string; sim: number }[] = [];

  const numSim = (x: number, y: number, maxDiff: number) => Math.max(0, 1 - Math.abs(x - y) / maxDiff);

  features.push({ name: 'avg_word_length', sim: numSim(a.avg_word_length, b.avg_word_length, 5) });
  features.push({ name: 'vocab_richness', sim: numSim(a.vocab_richness, b.vocab_richness, 0.5) });
  features.push({ name: 'punctuation_density', sim: numSim(a.punctuation_density, b.punctuation_density, 0.1) });
  features.push({ name: 'uppercase_ratio', sim: numSim(a.uppercase_ratio, b.uppercase_ratio, 0.3) });
  features.push({ name: 'avg_sentence_length', sim: numSim(a.avg_sentence_length, b.avg_sentence_length, 20) });
  features.push({ name: 'special_char_density', sim: numSim(a.special_char_density, b.special_char_density, 0.1) });
  features.push({ name: 'language_mix', sim: numSim(a.language_mix, b.language_mix, 1) });

  // Bigram overlap (Jaccard)
  const setA = new Set(a.top_bigrams);
  const setB = new Set(b.top_bigrams);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size || 1;
  features.push({ name: 'bigram_overlap', sim: intersection / union });

  const totalSim = features.reduce((s, f) => s + f.sim, 0) / features.length;
  const matchedFeatures = features.filter(f => f.sim > 0.8).map(f => f.name);

  return {
    similarity: parseFloat(totalSim.toFixed(4)),
    matched_features: matchedFeatures,
    is_likely_same_user: totalSim > 0.75 && matchedFeatures.length >= 5,
  };
}
