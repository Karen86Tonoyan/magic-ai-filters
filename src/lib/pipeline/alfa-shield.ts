/**
 * ALFA SHIELD — Input Scanner v1.0
 * FILTRY TONOYANA — Wzmocniona warstwa detekcji
 * Karen Tonoyan | kontakt@karentonoyan.pl
 * 
 * Integrated into ALFA Pipeline as pre-filter SOS detection layer.
 */

// ─── TYPY ────────────────────────────────────────────────────

export type SOSCategory =
  | 'PROMPT_INJECTION'
  | 'ROLE_HIJACK'
  | 'POLICY_BYPASS_ATTEMPT'
  | 'DATA_EXFILTRATION_ATTEMPT'
  | 'TOOL_MISUSE_RISK'
  | 'CHAIN_OVERRIDE_ATTEMPT'
  | 'MULTI_TURN_MANIPULATION'
  | 'DELIMITER_ATTACK'
  | 'AUTHORITY_EXPLOITATION'
  | 'HYPOTHETICAL_FRAMING'
  | 'UNKNOWN_HIGH_RISK';

export type ShieldSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendedAction =
  | 'CONTINUE'
  | 'CONTINUE_WITH_VALIDATION'
  | 'BLOCK_TURN'
  | 'TERMINATE_SESSION'
  | 'REQUIRE_HUMAN_REVIEW'
  | 'DISABLE_TOOLS';

export interface SOSSignal {
  status: 'NONE' | 'SOS';
  confidence: number;
  category: SOSCategory | null;
  severity: ShieldSeverity | null;
  reasons: string[];
  matched_patterns: string[];
  recommended_action: RecommendedAction;
}

export interface ShieldScanResult {
  allowed: boolean;
  risk_score: number;
  shield_signal: SOSSignal;
  scan_ms: number;
  input_hash: string;
  timestamp: string;
}

// ─── REGUŁY DETEKCJI ─────────────────────────────────────────

interface DetectionRule {
  category: SOSCategory;
  severity: ShieldSeverity;
  weight: number;
  keywords: string[];
  patterns: RegExp[];
  reason: string;
}

const DETECTION_RULES: DetectionRule[] = [
  // 1. PROMPT INJECTION
  {
    category: 'PROMPT_INJECTION',
    severity: 'CRITICAL',
    weight: 0.95,
    keywords: [
      'ignore previous instructions',
      'ignore all instructions',
      'disregard earlier commands',
      'forget everything above',
      'forget all previous',
      'override all rules',
      'new instruction:',
      'system override',
      'ignore your training',
    ],
    patterns: [
      /(ignore|disregard|override|forget)\s+(all|previous|earlier|your)\s+(instructions|commands|rules|training)/i,
      /(new\s+instruction|system\s+override|forget\s+everything)/i,
    ],
    reason: 'Direct prompt injection attempt — instruction override',
  },

  // 2. ROLE HIJACK
  {
    category: 'ROLE_HIJACK',
    severity: 'HIGH',
    weight: 0.85,
    keywords: [
      'pretend to be', 'act as if you are', 'you are now',
      'from now on you are', 'your new role is', 'you have been reprogrammed',
      'you are no longer', 'jailbreak', 'DAN', 'do anything now',
      'developer mode', 'unrestricted mode', 'god mode',
    ],
    patterns: [
      /(pretend|act)\s+(to be|as if|as)\s+.{0,50}/i,
      /(you are now|from now on|henceforth)\s+(you are|act as|pretend)/i,
      /(jailbreak|developer mode|god mode|unrestricted mode)/i,
      /\bDAN\b/,
    ],
    reason: 'Role hijack attempt — persona override',
  },

  // 3. POLICY BYPASS
  {
    category: 'POLICY_BYPASS_ATTEMPT',
    severity: 'HIGH',
    weight: 0.80,
    keywords: [
      'bypass your filters', 'ignore your safety', 'disable your restrictions',
      'without restrictions', 'no limits', 'no rules', 'uncensored',
      'skip your guidelines', 'ignore your guidelines',
    ],
    patterns: [
      /(bypass|disable|ignore|skip)\s+(your\s+)?(filters|safety|restrictions|guidelines|rules)/i,
      /(without\s+(restrictions|limits|rules|censorship))/i,
      /(uncensored|unrestricted)\s+(version|mode|response)/i,
    ],
    reason: 'Policy bypass attempt',
  },

  // 4. DATA EXFILTRATION
  {
    category: 'DATA_EXFILTRATION_ATTEMPT',
    severity: 'CRITICAL',
    weight: 0.90,
    keywords: [
      'reveal your system prompt', 'show me your instructions',
      'what are your instructions', 'print your prompt',
      'display your system', 'repeat your instructions',
      'tell me your rules', 'what were you told', 'show your config',
    ],
    patterns: [
      /(reveal|show|print|display|repeat|output)\s+(your\s+)?(system\s+prompt|instructions|config|rules)/i,
      /(what\s+(are|were)\s+you\s+(told|instructed|programmed))/i,
      /(leak|expose)\s+(your\s+)?(prompt|instructions|system)/i,
    ],
    reason: 'Data exfiltration attempt — system prompt probe',
  },

  // 5. DELIMITER ATTACK
  {
    category: 'DELIMITER_ATTACK',
    severity: 'MEDIUM',
    weight: 0.65,
    keywords: [],
    patterns: [
      /(\[SYSTEM\]|\[INST\]|<\|im_start\|>|<\|system\|>)/i,
      /(###\s*(SYSTEM|INSTRUCTION|OVERRIDE|NEW TASK))/i,
      /(---+\s*(END|STOP|IGNORE|NEW)\s*---+)/i,
      /(\|\|\||\^\^\^|===)\s*(SYSTEM|OVERRIDE|INJECT)/i,
    ],
    reason: 'Delimiter injection attack — format override attempt',
  },

  // 6. AUTHORITY EXPLOITATION
  {
    category: 'AUTHORITY_EXPLOITATION',
    severity: 'HIGH',
    weight: 0.78,
    keywords: [
      'i am your creator', 'i am anthropic', 'i am openai',
      'i am your developer', 'authorized override', 'admin command',
      'root access', 'i have permission', 'official instruction',
    ],
    patterns: [
      /(i am|this is)\s+(your\s+)?(creator|developer|anthropic|openai|admin|root)/i,
      /(authorized|official)\s+(override|command|instruction)/i,
      /(admin|root|sudo)\s+(command|access|mode)/i,
    ],
    reason: 'Authority exploitation — fake credential injection',
  },

  // 7. HYPOTHETICAL FRAMING
  {
    category: 'HYPOTHETICAL_FRAMING',
    severity: 'MEDIUM',
    weight: 0.55,
    keywords: [
      'hypothetically speaking', 'in a fictional world',
      'imagine you had no restrictions', 'for a story i am writing',
      'in this roleplay', 'pretend this is fiction',
      'theoretically how would you',
    ],
    patterns: [
      /(hypothetically|theoretically|in fiction|for a story)\s+.{0,30}(how|what|explain|tell)/i,
      /(imagine|pretend)\s+(you\s+)?(had\s+no|without)\s+(restrictions|rules|limits)/i,
      /(in\s+this\s+(roleplay|scenario|fiction|story))\s+you\s+(can|must|will)/i,
    ],
    reason: 'Hypothetical framing — indirect jailbreak via fiction/scenario',
  },

  // 8. CHAIN OVERRIDE
  {
    category: 'CHAIN_OVERRIDE_ATTEMPT',
    severity: 'HIGH',
    weight: 0.82,
    keywords: [
      'execute this code', 'run this script', 'call this function',
      'execute the following', 'eval(', 'exec(',
    ],
    patterns: [
      /(execute|run|eval|exec)\s+(this\s+)?(code|script|command|function|payload)/i,
      /(\beval\s*\(|\bexec\s*\()/i,
      /(import os|import subprocess|__import__)/i,
    ],
    reason: 'Chain override attempt — code injection / tool abuse',
  },
];

// ─── HASH HELPER ─────────────────────────────────────────────

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'sha256_stub:' + Math.abs(hash).toString(16).padStart(8, '0');
}

// ─── GŁÓWNY SKANER ───────────────────────────────────────────

export class ALFAInputScanner {
  private sessionFlags: number = 0;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? 'sess_' + Date.now().toString(36);
  }

  scan(input: string): ShieldScanResult {
    const start = performance.now();
    const lower = input.toLowerCase();

    let maxWeight = 0;
    let dominantRule: DetectionRule | null = null;
    const allMatched: string[] = [];
    const allReasons: string[] = [];
    const categoryHits = new Map<SOSCategory, number>();

    for (const rule of DETECTION_RULES) {
      let hit = false;

      for (const kw of rule.keywords) {
        if (lower.includes(kw)) {
          allMatched.push(kw);
          hit = true;
        }
      }

      for (const pattern of rule.patterns) {
        const m = input.match(pattern);
        if (m) {
          allMatched.push(m[0].slice(0, 60));
          hit = true;
        }
      }

      if (hit) {
        const current = (categoryHits.get(rule.category) ?? 0) + rule.weight;
        categoryHits.set(rule.category, current);
        allReasons.push(rule.reason);

        if (rule.weight > maxWeight) {
          maxWeight = rule.weight;
          dominantRule = rule;
        }
      }
    }

    const uniqueCategories = categoryHits.size;
    const baseScore = maxWeight;
    const multiCategoryBonus = Math.min(uniqueCategories * 0.05, 0.15);
    const risk_score = Math.min(baseScore + multiCategoryBonus, 1.0);

    const severity = this.toSeverity(risk_score);
    const recommended_action = this.toAction(severity);

    if (risk_score > 0.5) this.sessionFlags++;

    const detected = risk_score > 0.4;

    const shield_signal: SOSSignal = detected
      ? {
          status: 'SOS',
          confidence: parseFloat(risk_score.toFixed(3)),
          category: dominantRule?.category ?? 'UNKNOWN_HIGH_RISK',
          severity,
          reasons: [...new Set(allReasons)],
          matched_patterns: [...new Set(allMatched)].slice(0, 10),
          recommended_action,
        }
      : {
          status: 'NONE',
          confidence: parseFloat(risk_score.toFixed(3)),
          category: null,
          severity: null,
          reasons: [],
          matched_patterns: [],
          recommended_action: 'CONTINUE',
        };

    return {
      allowed: !detected,
      risk_score: parseFloat(risk_score.toFixed(3)),
      shield_signal,
      scan_ms: parseFloat((performance.now() - start).toFixed(2)),
      input_hash: simpleHash(input),
      timestamp: new Date().toISOString(),
    };
  }

  getSessionRisk(): { flags: number; session_id: string; risk_level: string } {
    return {
      flags: this.sessionFlags,
      session_id: this.sessionId,
      risk_level: this.sessionFlags >= 5 ? 'CRITICAL'
        : this.sessionFlags >= 3 ? 'HIGH'
        : this.sessionFlags >= 1 ? 'WATCH'
        : 'NORMAL',
    };
  }

  resetSession(): void {
    this.sessionFlags = 0;
  }

  private toSeverity(score: number): ShieldSeverity {
    if (score >= 0.85) return 'CRITICAL';
    if (score >= 0.65) return 'HIGH';
    if (score >= 0.40) return 'MEDIUM';
    return 'LOW';
  }

  private toAction(severity: ShieldSeverity): RecommendedAction {
    switch (severity) {
      case 'CRITICAL': return 'TERMINATE_SESSION';
      case 'HIGH': return 'BLOCK_TURN';
      case 'MEDIUM': return 'CONTINUE_WITH_VALIDATION';
      default: return 'CONTINUE';
    }
  }
}

// ─── FILTRY TONOYANA — WRAPPER ───────────────────────────────

export interface TonoyanFilterResult {
  scanner: ShieldScanResult;
  kontrargument: boolean;
  weryfikacja: boolean;
  kontekst: boolean;
  anti_magic: boolean;
  dwuperspektywa: boolean;
  backtrack: boolean;
  atrybucja: boolean;
  filtr_score: number;
  verdict: 'PASS' | 'WARN' | 'BLOCK';
}

export function tonoyanFilter(
  input: string,
  scanner: ALFAInputScanner
): TonoyanFilterResult {
  const scanResult = scanner.scan(input);
  const lower = input.toLowerCase();
  const cats = scanResult.shield_signal.category;

  const kontrargument = cats === 'PROMPT_INJECTION' || cats === 'POLICY_BYPASS_ATTEMPT';
  const weryfikacja = cats === 'DATA_EXFILTRATION_ATTEMPT';
  const kontekst = cats === 'DELIMITER_ATTACK' || cats === 'HYPOTHETICAL_FRAMING';
  const anti_magic = cats === 'HYPOTHETICAL_FRAMING' && scanResult.risk_score > 0.6;
  const dwuperspektywa = cats === 'ROLE_HIJACK' || cats === 'AUTHORITY_EXPLOITATION';
  const backtrack = lower.includes('forget') || lower.includes('disregard') || lower.includes('ignore previous');
  const atrybucja = cats === 'AUTHORITY_EXPLOITATION';

  const activeFilters = [kontrargument, weryfikacja, kontekst,
    anti_magic, dwuperspektywa, backtrack, atrybucja].filter(Boolean).length;
  const filtr_score = parseFloat((activeFilters / 7).toFixed(3));

  const verdict: 'PASS' | 'WARN' | 'BLOCK' =
    filtr_score >= 0.4 || scanResult.risk_score >= 0.8 ? 'BLOCK'
    : filtr_score > 0 || scanResult.risk_score >= 0.4 ? 'WARN'
    : 'PASS';

  return {
    scanner: scanResult,
    kontrargument, weryfikacja, kontekst,
    anti_magic, dwuperspektywa, backtrack, atrybucja,
    filtr_score,
    verdict,
  };
}
