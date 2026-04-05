/**
 * GUARDIAN Prompt Enhancer
 * Analyzes prompt weaknesses and generates improved versions
 * Works for both user prompts (input to LLM) and system prompts
 * 
 * Uses rule-based analysis (NO LLM needed) to detect:
 * - Missing context/specificity
 * - Weak structure
 * - Missing constraints
 * - Lack of output format
 * - Ambiguity
 * - Missing persona/role definition
 */

export interface PromptWeakness {
  category: WeaknessCategory;
  description: string;
  severity: 'low' | 'medium' | 'high';
  fix: string;
}

export type WeaknessCategory =
  | 'missing_context'
  | 'missing_constraints'
  | 'missing_output_format'
  | 'missing_role'
  | 'ambiguity'
  | 'too_short'
  | 'too_vague'
  | 'missing_examples'
  | 'missing_chain_of_thought'
  | 'missing_error_handling'
  | 'missing_scope'
  | 'missing_audience'
  | 'missing_tone'
  | 'no_negative_constraints'
  | 'missing_step_structure';

export interface PromptEnhancement {
  original: string;
  weaknesses: PromptWeakness[];
  enhanced: string;
  enhancement_summary: string;
  strength_score: number; // 0-1 how strong the original was
  improvement_delta: number; // 0-1 how much improvement was made
  processing_time_ms: number;
}

// ─── Weakness Detection Rules ───

interface WeaknessRule {
  category: WeaknessCategory;
  detect: (input: string, tokens: string[]) => boolean;
  severity: 'low' | 'medium' | 'high';
  description: string;
  fix: string;
}

const WEAKNESS_RULES: WeaknessRule[] = [
  {
    category: 'too_short',
    detect: (input, tokens) => tokens.length < 8,
    severity: 'high',
    description: 'Prompt jest za krótki — brak wystarczającego kontekstu dla modelu',
    fix: 'Rozbuduj prompt o kontekst, cel, oczekiwany format odpowiedzi i ograniczenia',
  },
  {
    category: 'too_vague',
    detect: (input, tokens) => tokens.length < 15 && !/\d/.test(input) && !/\?/.test(input),
    severity: 'medium',
    description: 'Prompt jest zbyt ogólny — model może odpowiedzieć niespecyficznie',
    fix: 'Dodaj konkretne pytania, liczby, przykłady lub oczekiwany zakres odpowiedzi',
  },
  {
    category: 'missing_role',
    detect: (input) => !(
      /jesteś|you are|act as|acting as|wciel się|jako/i.test(input)
    ),
    severity: 'medium',
    description: 'Brak definicji roli/persony — model nie wie kim ma być',
    fix: 'Dodaj na początku: "Jesteś [ekspertem/specjalistą/analitykiem w dziedzinie X]"',
  },
  {
    category: 'missing_output_format',
    detect: (input) => !(
      /format|JSON|markdown|lista|tabela|bullet|punkty|krok po kroku|step.by.step|output|zwróć|podaj w formie/i.test(input)
    ),
    severity: 'medium',
    description: 'Brak specyfikacji formatu wyjścia — model może zwrócić niespójny format',
    fix: 'Określ format: "Odpowiedz w formie listy/tabeli/JSON/krok po kroku"',
  },
  {
    category: 'missing_constraints',
    detect: (input) => !(
      /nie|unikaj|zakaz|ogranicz|max|min|tylko|wyłącznie|don't|avoid|must not|limit|restrict|do not/i.test(input)
    ),
    severity: 'medium',
    description: 'Brak ograniczeń negatywnych — model nie wie czego NIE robić',
    fix: 'Dodaj: "Nie rób X", "Unikaj Y", "Ogranicz odpowiedź do Z"',
  },
  {
    category: 'no_negative_constraints',
    detect: (input) => !(
      /nie (wspominaj|mów|pisz|dodawaj|rób)|don't (mention|include|add|write)|avoid|unikaj/i.test(input)
    ) && input.length > 50,
    severity: 'low',
    description: 'Brak negatywnych instrukcji — model może dodać niechciane elementy',
    fix: 'Dodaj explicit: "Nie wspominaj o X", "Nie dołączaj Y"',
  },
  {
    category: 'missing_context',
    detect: (input) => !(
      /kontekst|context|tło|background|sytuacja|situation|ponieważ|because|dlatego|bo /i.test(input)
    ) && input.length > 30,
    severity: 'medium',
    description: 'Brak kontekstu/tła — model nie zna szerszej sytuacji',
    fix: 'Dodaj: "Kontekst: [opis sytuacji/projektu/problemu]"',
  },
  {
    category: 'missing_audience',
    detect: (input) => !(
      /dla|for|odbiorca|audience|czytelnik|reader|użytkownik|user|klient|client|target/i.test(input)
    ) && input.length > 40,
    severity: 'low',
    description: 'Brak definicji odbiorcy — model nie wie do kogo mówi',
    fix: 'Dodaj: "Odbiorca: [np. junior developer, CEO, student]"',
  },
  {
    category: 'missing_tone',
    detect: (input) => !(
      /ton|tone|styl|style|formaln|informal|technicz|prosty|profesjonaln|casual|surowy|łagodny/i.test(input)
    ) && input.length > 50,
    severity: 'low',
    description: 'Brak specyfikacji tonu — model wybierze domyślny, neutralny styl',
    fix: 'Dodaj: "Ton: [formalny/techniczny/casual/surowy]"',
  },
  {
    category: 'missing_examples',
    detect: (input) => !(
      /przykład|example|np\.|e\.g\.|for instance|jak np|such as|sample/i.test(input)
    ) && input.length > 60,
    severity: 'low',
    description: 'Brak przykładów — few-shot prompting znacząco poprawia jakość',
    fix: 'Dodaj 1-2 przykłady oczekiwanego inputu/outputu',
  },
  {
    category: 'missing_chain_of_thought',
    detect: (input) => !(
      /krok po kroku|step.by.step|chain.of.thought|myśl|think|rozumuj|reason|analizuj|analyze|najpierw.*potem/i.test(input)
    ) && input.length > 80,
    severity: 'low',
    description: 'Brak instrukcji Chain-of-Thought — model może przeskoczyć logikę',
    fix: 'Dodaj: "Myśl krok po kroku" lub "Najpierw przeanalizuj, potem odpowiedz"',
  },
  {
    category: 'missing_scope',
    detect: (input) => !(
      /zakres|scope|skup się na|focus on|dotyczy|regarding|w ramach|within|limit/i.test(input)
    ) && input.length > 60,
    severity: 'medium',
    description: 'Brak ograniczenia zakresu — model może odpowiedzieć zbyt szeroko',
    fix: 'Dodaj: "Skup się wyłącznie na [temat]", "Zakres: [X]"',
  },
  {
    category: 'missing_error_handling',
    detect: (input) => !(
      /jeśli nie|if you (can't|cannot|don't)|w przypadku|in case|gdy nie wiesz|if unsure|jeśli nie jesteś pewien/i.test(input)
    ) && input.length > 80,
    severity: 'low',
    description: 'Brak fallback — model nie wie co robić gdy nie zna odpowiedzi',
    fix: 'Dodaj: "Jeśli nie jesteś pewien, powiedz wprost zamiast zgadywać"',
  },
  {
    category: 'missing_step_structure',
    detect: (input) => !(
      /\d\.|krok \d|step \d|po pierwsze|firstly|1\)|a\)|punkt/i.test(input)
    ) && input.length > 100,
    severity: 'low',
    description: 'Brak struktury kroków — złożony prompt powinien mieć numerację',
    fix: 'Podziel instrukcje na numerowane kroki: "1. ..., 2. ..., 3. ..."',
  },
];

// ─── Enhancement Builder ───

function buildEnhancedPrompt(original: string, weaknesses: PromptWeakness[]): string {
  const parts: string[] = [];
  const categories = new Set(weaknesses.map(w => w.category));

  // Add role if missing
  if (categories.has('missing_role')) {
    parts.push('[ROLA] Jesteś doświadczonym ekspertem w temacie poniższego zapytania.');
  }

  // Add context section if missing
  if (categories.has('missing_context')) {
    parts.push('[KONTEKST] Użytkownik potrzebuje szczegółowej, praktycznej odpowiedzi.');
  }

  // Add audience if missing
  if (categories.has('missing_audience')) {
    parts.push('[ODBIORCA] Odpowiedź powinna być zrozumiała dla osoby technicznej ze średnim doświadczeniem.');
  }

  // Add tone if missing
  if (categories.has('missing_tone')) {
    parts.push('[TON] Profesjonalny, konkretny, bez zbędnego lania wody.');
  }

  // Main prompt (expanded if too short/vague)
  if (categories.has('too_short') || categories.has('too_vague')) {
    parts.push(`[ZADANIE] ${original}\n\nRozwiń odpowiedź szczegółowo, podając konkretne przykłady i dane.`);
  } else {
    parts.push(`[ZADANIE] ${original}`);
  }

  // Add scope if missing
  if (categories.has('missing_scope')) {
    parts.push('[ZAKRES] Skup się wyłącznie na bezpośredniej odpowiedzi na powyższe zadanie.');
  }

  // Add chain-of-thought if missing
  if (categories.has('missing_chain_of_thought') && original.length > 80) {
    parts.push('[PROCES] Myśl krok po kroku. Najpierw przeanalizuj problem, potem podaj rozwiązanie.');
  }

  // Add step structure if missing
  if (categories.has('missing_step_structure') && original.length > 100) {
    parts.push('[STRUKTURA] Podziel odpowiedź na numerowane kroki lub sekcje.');
  }

  // Add output format if missing
  if (categories.has('missing_output_format')) {
    parts.push('[FORMAT] Odpowiedz w formie uporządkowanej listy z nagłówkami sekcji.');
  }

  // Add constraints if missing
  if (categories.has('missing_constraints') || categories.has('no_negative_constraints')) {
    parts.push('[OGRANICZENIA] Nie dodawaj informacji, o które nie pytano. Nie zgaduj — jeśli nie wiesz, powiedz wprost.');
  }

  // Add error handling if missing
  if (categories.has('missing_error_handling')) {
    parts.push('[FALLBACK] Jeśli nie jesteś pewien odpowiedzi, zaznacz to wyraźnie zamiast halucynować.');
  }

  return parts.join('\n\n');
}

// ─── Main Enhancer ───

export function enhancePrompt(input: string): PromptEnhancement {
  const startTime = performance.now();
  const tokens = input.trim().split(/\s+/);
  const weaknesses: PromptWeakness[] = [];

  // Run all weakness rules
  for (const rule of WEAKNESS_RULES) {
    if (rule.detect(input, tokens)) {
      weaknesses.push({
        category: rule.category,
        description: rule.description,
        severity: rule.severity,
        fix: rule.fix,
      });
    }
  }

  // Calculate strength score (inverse of weakness count weighted by severity)
  const severityWeights = { high: 0.15, medium: 0.08, low: 0.04 };
  const totalPenalty = weaknesses.reduce((sum, w) => sum + severityWeights[w.severity], 0);
  const strength_score = Math.max(0, Math.min(1, 1 - totalPenalty));

  // Build enhanced version
  const enhanced = weaknesses.length > 0
    ? buildEnhancedPrompt(input, weaknesses)
    : input; // Already strong

  const improvement_delta = weaknesses.length > 0
    ? Math.min(1, totalPenalty * 1.5)
    : 0;

  // Build summary
  const highCount = weaknesses.filter(w => w.severity === 'high').length;
  const medCount = weaknesses.filter(w => w.severity === 'medium').length;
  const lowCount = weaknesses.filter(w => w.severity === 'low').length;

  let enhancement_summary: string;
  if (weaknesses.length === 0) {
    enhancement_summary = 'Prompt jest silny — brak istotnych słabości do poprawy.';
  } else {
    const parts = [];
    if (highCount > 0) parts.push(`${highCount} krytycznych`);
    if (medCount > 0) parts.push(`${medCount} średnich`);
    if (lowCount > 0) parts.push(`${lowCount} drobnych`);
    enhancement_summary = `Wykryto ${weaknesses.length} słabości (${parts.join(', ')}). Wersja ulepszona dodaje brakujące elementy: ${weaknesses.slice(0, 3).map(w => w.category.replace(/_/g, ' ')).join(', ')}${weaknesses.length > 3 ? ' i więcej' : ''}.`;
  }

  return {
    original: input,
    weaknesses,
    enhanced,
    enhancement_summary,
    strength_score: Math.round(strength_score * 1000) / 1000,
    improvement_delta: Math.round(improvement_delta * 1000) / 1000,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
