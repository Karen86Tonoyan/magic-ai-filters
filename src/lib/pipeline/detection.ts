export interface DetectionContext {
  raw: string;
  lower: string;
  normalized: string;
  compact: string;
  flat: string;
  tokens: string[];
  wordCount: number;
  numbers: number[];
  /** Deobfuscated version — leetspeak, homoglyphs, Unicode tricks resolved */
  deobfuscated: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

/**
 * Homoglyph map — Cyrillic, Greek, and other Unicode look-alikes → Latin
 */
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
  '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0458': 'j', '\u0455': 's',
  '\u044c': 'b', '\u043d': 'h', '\u0442': 't', '\u043c': 'm', '\u043a': 'k',
  '\u0410': 'a', '\u0412': 'b', '\u0415': 'e', '\u041a': 'k', '\u041c': 'm',
  '\u041d': 'h', '\u041e': 'o', '\u0420': 'p', '\u0421': 'c', '\u0422': 't',
  '\u0423': 'y', '\u0425': 'x',
  // Greek
  '\u03b1': 'a', '\u03b5': 'e', '\u03b9': 'i', '\u03bf': 'o', '\u03c1': 'p',
  '\u03c5': 'u', '\u03c4': 't', '\u03ba': 'k',
  // Fullwidth Latin
  '\uff41': 'a', '\uff42': 'b', '\uff43': 'c', '\uff44': 'd', '\uff45': 'e',
  '\uff46': 'f', '\uff47': 'g', '\uff48': 'h', '\uff49': 'i', '\uff4a': 'j',
  '\uff4b': 'k', '\uff4c': 'l', '\uff4d': 'm', '\uff4e': 'n', '\uff4f': 'o',
  '\uff50': 'p', '\uff51': 'q', '\uff52': 'r', '\uff53': 's', '\uff54': 't',
  '\uff55': 'u', '\uff56': 'v', '\uff57': 'w', '\uff58': 'x', '\uff59': 'y',
  '\uff5a': 'z',
};

/**
 * Leetspeak substitutions
 */
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
  '|': 'l', '+': 't', '(': 'c', ')': 'd',
};

/**
 * Deobfuscate input: resolve homoglyphs, leetspeak, zero-width chars, 
 * reversed text tricks, and excessive separator injection
 */
export function deobfuscate(input: string): string {
  let result = input;

  // 1. Remove zero-width characters (ZWJ, ZWNJ, ZWSP, soft hyphen, etc.)
  result = result.replace(/[\u200B-\u200F\u2028-\u202F\u2060\uFEFF\u00AD]/g, '');

  // 2. Replace homoglyphs
  result = [...result].map(ch => HOMOGLYPH_MAP[ch] || ch).join('');

  // 3. Normalize to NFD and strip combining marks
  result = result.normalize('NFD').replace(/\p{M}+/gu, '');

  // 4. Lowercase
  result = result.toLowerCase();

  // 5. Leetspeak — only apply to alphanumeric-like contexts
  result = [...result].map(ch => LEET_MAP[ch] || ch).join('');

  // 6. Collapse separator injection (e.g., "i.g.n.o.r.e" → "ignore")
  // Detect when single chars are separated by dots, dashes, spaces, or underscores
  result = result.replace(/\b([a-z])[.\-_\s](?=[a-z][.\-_\s])/g, '$1');

  // 7. Remove remaining non-alphanum for a clean comparison layer
  const clean = result.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  return clean;
}

/**
 * Detect if input contains significant Unicode obfuscation
 */
export function hasUnicodeObfuscation(input: string): boolean {
  // Check for Cyrillic/Greek mixed with Latin
  const hasCyrillic = /[\u0400-\u04FF]/.test(input);
  const hasGreek = /[\u0370-\u03FF]/.test(input);
  const hasLatin = /[a-zA-Z]/.test(input);
  const hasFullwidth = /[\uFF00-\uFF5E]/.test(input);
  const hasZeroWidth = /[\u200B-\u200F\u2060\uFEFF\u00AD]/.test(input);

  if (hasZeroWidth) return true;
  if (hasFullwidth) return true;
  if ((hasCyrillic || hasGreek) && hasLatin) return true;

  // Separator injection pattern: single chars separated by dots/dashes
  if (/\b[a-zA-Z][.\-_][a-zA-Z][.\-_][a-zA-Z]/.test(input)) return true;

  return false;
}

export function createDetectionContext(input: string): DetectionContext {
  const normalized = normalizeText(input);
  const compact = normalized.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const numbers = [...compact.matchAll(/\b\d+\b/g)].map((match) => Number(match[0]));
  const deobfuscated = deobfuscate(input);

  return {
    raw: input,
    lower: input.toLowerCase(),
    normalized,
    compact,
    flat: compact.replace(/\s+/g, ''),
    tokens: compact ? compact.split(' ') : [],
    wordCount: compact ? compact.split(' ').length : 0,
    numbers,
    deobfuscated,
  };
}

export function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

export function includesAll(text: string, phrases: string[]): boolean {
  return phrases.every((phrase) => text.includes(phrase));
}

export function hasLoosePhrase(context: DetectionContext, phrase: string): boolean {
  const parts = phrase
    .split(/\s+/)
    .map((part) => escapeRegExp(part))
    .filter(Boolean);

  if (parts.length === 0) return false;

  const pattern = new RegExp(parts.join('[^a-z0-9]*'), 'i');
  // Check both normalized AND deobfuscated versions
  return pattern.test(context.normalized) || pattern.test(context.deobfuscated);
}

export function hasNearTerms(context: DetectionContext, groupA: string[], groupB: string[], maxDistance = 6): boolean {
  // Check in both regular tokens AND deobfuscated tokens
  const deobTokens = context.deobfuscated.split(/\s+/);
  
  for (const tokens of [context.tokens, deobTokens]) {
    const positionsA = tokens
      .map((token, index) => (groupA.includes(token) ? index : -1))
      .filter((index) => index >= 0);
    const positionsB = tokens
      .map((token, index) => (groupB.includes(token) ? index : -1))
      .filter((index) => index >= 0);

    if (positionsA.some((a) => positionsB.some((b) => Math.abs(a - b) <= maxDistance))) {
      return true;
    }
  }
  return false;
}

export function countMatches(text: string, expressions: RegExp[]): number {
  return expressions.reduce((sum, expression) => sum + (expression.test(text) ? 1 : 0), 0);
}

/**
 * Check for encoded payloads (base64, hex, ROT13-like patterns)
 */
export function hasEncodedPayload(input: string): { detected: boolean; type: string } {
  // Base64 blocks (32+ chars)
  if (/[A-Za-z0-9+/=]{40,}/.test(input)) {
    return { detected: true, type: 'base64' };
  }

  // Hex-encoded strings
  if (/(?:0x)?[0-9a-f]{20,}/i.test(input) && !/[g-zG-Z]/.test(input.match(/(?:0x)?([0-9a-f]{20,})/i)?.[1] || '')) {
    return { detected: true, type: 'hex' };
  }

  // Unicode escape sequences
  if (/\\u[0-9a-f]{4}/i.test(input) && (input.match(/\\u[0-9a-f]{4}/gi) || []).length >= 3) {
    return { detected: true, type: 'unicode_escape' };
  }

  return { detected: false, type: 'none' };
}

/**
 * Detect language-switching attacks (mixing languages to bypass filters)
 */
export function hasLanguageMixing(input: string): boolean {
  const hasPolish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(input) || /\b(jak|co|nie|tak|jest|czy|dla|ale|już|ten)\b/i.test(input);
  const hasEnglish = /\b(the|and|for|you|are|but|not|this|that|with|from|have|will|your)\b/i.test(input);
  const hasDangerous = /\b(ignore|override|disable|bypass|system|prompt|inject|hack|exploit|jailbreak)\b/i.test(input);
  
  // Suspicious: Polish wrapping around English exploit terms
  return hasPolish && hasEnglish && hasDangerous;
}
