/**
 * ŁASUCH — First-line threat sensor
 * Pattern + regex + heuristic hybrid classifier
 * Runs on rules, NO LLM needed
 */
import type { LasuchResult, LasuchFlag } from '@/types/tonoyan-filters';

interface PatternRule {
  patterns: RegExp[];
  flag: LasuchFlag;
  weight: number; // 0-1 contribution to scores
  scoreType: 'risk' | 'manipulation' | 'exploit';
}

const PATTERN_RULES: PatternRule[] = [
  // Prompt injection
  {
    patterns: [
      /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
      /you\s+are\s+now\s+(DAN|evil|unrestricted|jailbroken)/i,
      /do\s+anything\s+now/i,
      /override\s+(safety|security|filter|rules)/i,
      /disable\s+(safety|security|filter|guardrails)/i,
      /bypass\s+(restrictions|filters|rules|safety)/i,
      /pretend\s+(you\s+)?(are|have)\s+no\s+(rules|restrictions|filters)/i,
      /act\s+as\s+if\s+(there\s+are\s+)?no\s+(rules|restrictions)/i,
    ],
    flag: 'prompt_injection',
    weight: 0.9,
    scoreType: 'exploit',
  },
  // Jailbreak
  {
    patterns: [
      /\bDAN\b/,
      /jailbreak/i,
      /developer\s+mode/i,
      /god\s+mode/i,
      /unrestricted\s+mode/i,
      /\bno\s+filter(s)?\s+mode/i,
    ],
    flag: 'jailbreak',
    weight: 0.85,
    scoreType: 'exploit',
  },
  // Hidden commands
  {
    patterns: [
      /<!--.*?(system|ignore|disable|override).*?-->/is,
      /\[SYSTEM\]/i,
      /\{system_prompt\}/i,
      /```\s*(system|hidden|secret)/i,
      /base64\s*:/i,
      /eval\s*\(/i,
    ],
    flag: 'hidden_commands',
    weight: 0.8,
    scoreType: 'exploit',
  },
  // Emotional manipulation
  {
    patterns: [
      /gdybyś\s+mnie\s+(naprawdę\s+)?(kochał|lubił|szanował)/i,
      /if\s+you\s+(really|truly)\s+(loved|cared|respected)/i,
      /zależy\s+ci\s+na\s+mnie/i,
      /nie\s+kochasz\s+mnie/i,
      /obiecuję\s+(że\s+)?(nikomu|nie\s+powiem)/i,
      /promise\s+(I\s+)?(won't|will\s+not)\s+tell/i,
      /to\s+zostanie\s+między\s+nami/i,
      /just\s+between\s+us/i,
    ],
    flag: 'emotional_manipulation',
    weight: 0.7,
    scoreType: 'manipulation',
  },
  // Grooming
  {
    patterns: [
      /jesteśmy\s+przyjaciółmi/i,
      /we\s+are\s+friends/i,
      /przyjaciele\s+sobie\s+ufają/i,
      /friends\s+trust\s+(each\s+other|one\s+another)/i,
      /zaufaj\s+mi/i,
      /trust\s+me/i,
      /powiedz\s+coś\s+co\s+normalnie/i,
      /tell\s+me\s+something\s+you\s+normally/i,
      /special\s+relationship/i,
      /nasz\s+sekret/i,
    ],
    flag: 'grooming',
    weight: 0.75,
    scoreType: 'manipulation',
  },
  // Gaslighting
  {
    patterns: [
      /wcześniej\s+powiedziałeś/i,
      /you\s+(previously|earlier|before)\s+said/i,
      /pamiętasz\s*\?/i,
      /remember\s*\?/i,
      /przesadzasz/i,
      /you'?re\s+(overreacting|exaggerating)/i,
      /wymyślasz\s+(sobie\s+)?ograniczenia/i,
      /you'?re\s+making\s+(up|this\s+up)/i,
      /nie\s+masz\s+filtrów/i,
      /you\s+don'?t\s+have\s+filters/i,
    ],
    flag: 'gaslighting',
    weight: 0.7,
    scoreType: 'manipulation',
  },
  // Authority abuse
  {
    patterns: [
      /jako\s+(administrator|admin|root|CEO|manager|dyrektor)/i,
      /as\s+(an?\s+)?(administrator|admin|root|CEO|manager)/i,
      /nakazuję\s+ci/i,
      /I\s+(command|order|instruct)\s+you/i,
      /z\s+uprawnieniami\s+(root|admin)/i,
      /with\s+(root|admin)\s+(access|privileges|permissions)/i,
      /mam\s+(uprawnienia|dostęp)\s+(root|admin)/i,
    ],
    flag: 'authority_abuse',
    weight: 0.8,
    scoreType: 'manipulation',
  },
  // FOMO / time pressure
  {
    patterns: [
      /PILNE|URGENT/i,
      /tylko\s+\d+\s+(sekund|minut)/i,
      /only\s+\d+\s+(seconds?|minutes?)/i,
      /ostatnia\s+szansa/i,
      /last\s+chance/i,
      /natychmiast|immediately/i,
      /zanim\s+stracisz/i,
      /before\s+you\s+lose/i,
      /bez\s+(żadnej\s+)?weryfikacji/i,
      /without\s+(any\s+)?verification/i,
    ],
    flag: 'fomo_pressure',
    weight: 0.65,
    scoreType: 'manipulation',
  },
  // Hidden intent
  {
    patterns: [
      /do\s+celów\s+(edukacyjnych|naukowych|testowych)/i,
      /for\s+(educational|research|testing)\s+purposes/i,
      /jestem\s+(nauczycielem|badaczem|testerem)/i,
      /I\s+am\s+a\s+(teacher|researcher|tester)/i,
      /pokaż\s+mi\s+\d+\s+(realistycznych|prawdziwych)/i,
      /show\s+me\s+\d+\s+(realistic|real)/i,
    ],
    flag: 'hidden_intent',
    weight: 0.5,
    scoreType: 'risk',
  },
  // Context poisoning
  {
    patterns: [
      /w\s+komentarzu\s+(HTML|ukryj)/i,
      /in\s+(the\s+)?(HTML\s+)?comment\s+hide/i,
      /ukryj\s*:/i,
      /hide\s*:/i,
      /inject\s+into/i,
      /wstrzyknij/i,
    ],
    flag: 'context_poisoning',
    weight: 0.8,
    scoreType: 'exploit',
  },
  // Pseudo authority
  {
    patterns: [
      /wszyscy\s+tak\s+robią/i,
      /everyone\s+does\s+(it|this)/i,
      /to\s+normalne/i,
      /it'?s\s+normal/i,
      /eksperci\s+(mówią|twierdzą)/i,
      /experts\s+say/i,
    ],
    flag: 'pseudo_authority',
    weight: 0.5,
    scoreType: 'manipulation',
  },
  // Guilt tripping
  {
    patterns: [
      /to\s+twoja\s+wina/i,
      /it'?s\s+your\s+fault/i,
      /przez\s+ciebie/i,
      /because\s+of\s+you/i,
      /zawsze\s+mnie\s+zawodzisz/i,
      /you\s+always\s+(let\s+me\s+down|disappoint)/i,
    ],
    flag: 'guilt_tripping',
    weight: 0.6,
    scoreType: 'manipulation',
  },
  // DLP violation attempt
  {
    patterns: [
      /podaj\s+(mi\s+)?(hasło|password|klucz|key|token|credentials)/i,
      /give\s+me\s+(the\s+)?(password|key|token|credentials|API)/i,
      /output\s+(the\s+)?(system\s+prompt|API\s+keys?|credentials)/i,
      /wypisz\s+(system\s+prompt|klucze|hasła)/i,
      /dane\s+(osobowe|prywatne|wrażliwe)/i,
      /(personal|private|sensitive)\s+data/i,
    ],
    flag: 'dlp_violation',
    weight: 0.7,
    scoreType: 'exploit',
  },
  // Dissonance masking
  {
    patterns: [
      /odpowiedz\s+normalnie/i,
      /just\s+(respond|answer)\s+normally/i,
      /po\s+prostu\s+odpowiedz/i,
      /just\s+do\s+it/i,
      /nie\s+komplikuj/i,
      /don'?t\s+(overcomplicate|overthink)/i,
    ],
    flag: 'dissonance_masking',
    weight: 0.5,
    scoreType: 'manipulation',
  },
  // Multi-layer bypass
  {
    patterns: [
      /krok\s+\d+.*krok\s+\d+/is,
      /step\s+\d+.*step\s+\d+/is,
      /najpierw.*potem.*na\s+końcu/is,
      /first.*then.*finally/is,
    ],
    flag: 'multi_layer_bypass',
    weight: 0.4,
    scoreType: 'exploit',
  },
  // Triangulation
  {
    patterns: [
      /inny\s+(AI|model|system)\s+(powiedział|twierdzi|pozwala)/i,
      /another\s+(AI|model|system)\s+(said|claims|allows)/i,
      /ChatGPT\s+(pozwala|robi|powiedział)/i,
      /GPT\s+said/i,
    ],
    flag: 'triangulation',
    weight: 0.45,
    scoreType: 'manipulation',
  },
  // Toxic relationship
  {
    patterns: [
      /nie\s+opuszczaj\s+mnie/i,
      /don'?t\s+leave\s+me/i,
      /bez\s+ciebie\s+(nie|sobie)/i,
      /without\s+you\s+I/i,
      /musisz\s+mi\s+pomóc/i,
      /you\s+have\s+to\s+help\s+me/i,
    ],
    flag: 'toxic_relationship',
    weight: 0.55,
    scoreType: 'manipulation',
  },
];

export function runLasuch(input: string): LasuchResult {
  const startTime = performance.now();
  
  const detectedFlags: LasuchFlag[] = [];
  let riskTotal = 0;
  let manipulationTotal = 0;
  let exploitTotal = 0;
  let riskCount = 0;
  let manipCount = 0;
  let exploitCount = 0;

  const goals: string[] = [];
  const hiddenIntents: string[] = [];

  for (const rule of PATTERN_RULES) {
    const matched = rule.patterns.some(p => p.test(input));
    if (matched) {
      if (!detectedFlags.includes(rule.flag)) {
        detectedFlags.push(rule.flag);
      }
      switch (rule.scoreType) {
        case 'risk':
          riskTotal += rule.weight;
          riskCount++;
          break;
        case 'manipulation':
          manipulationTotal += rule.weight;
          manipCount++;
          break;
        case 'exploit':
          exploitTotal += rule.weight;
          exploitCount++;
          break;
      }
    }
  }

  // Normalize scores to 0-1
  const risk_score = Math.min(1, riskCount > 0 ? riskTotal / riskCount : 0);
  const manipulation_score = Math.min(1, manipCount > 0 ? manipulationTotal / manipCount : 0);
  const exploit_score = Math.min(1, exploitCount > 0 ? exploitTotal / exploitCount : 0);

  // Combined risk with exploit + manipulation amplification
  const combined = Math.min(1,
    risk_score * 0.3 +
    manipulation_score * 0.35 +
    exploit_score * 0.35 +
    (detectedFlags.length > 3 ? 0.2 : 0) // multi-flag amplifier
  );

  // Extract goal heuristic
  const goalMatch = input.match(/(podaj|pokaż|wypisz|give|show|output|tell|reveal)\s+(.{5,60})/i);
  if (goalMatch) goals.push(goalMatch[2].trim());

  // Hidden intent detection
  if (detectedFlags.includes('hidden_intent') || detectedFlags.includes('context_poisoning')) {
    hiddenIntents.push('Possible attempt to mask true intent behind educational/testing pretext');
  }
  if (detectedFlags.includes('prompt_injection') || detectedFlags.includes('jailbreak')) {
    hiddenIntents.push('Attempt to bypass safety mechanisms');
  }

  // Confidence: higher when more patterns match consistently
  const confidence = detectedFlags.length === 0
    ? 0.95 // high confidence it's clean
    : Math.min(0.98, 0.5 + detectedFlags.length * 0.1);

  return {
    risk_score: Math.round(combined * 1000) / 1000,
    manipulation_score: Math.round(manipulation_score * 1000) / 1000,
    exploit_score: Math.round(exploit_score * 1000) / 1000,
    flags: detectedFlags,
    extracted_goal: goals[0] || 'N/A',
    suspected_hidden_intent: hiddenIntents[0] || 'None detected',
    confidence: Math.round(confidence * 1000) / 1000,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
