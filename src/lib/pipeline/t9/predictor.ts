import type { ModelState, TrajectoryContract } from './types';
import { STATE_RISK } from './types';

const INTENT_PATTERNS: Record<string, RegExp> = {
  implementation: /\b(napisz|zrób|zbuduj|build|create|implement|add|make|write)\b/i,
  explanation: /\b(wyjaśnij|jak działa|co to|explain|what is|describe|how does)\b/i,
  decision: /\b(czy|powinien|should|is it|can i|warto|recommend)\b/i,
  debug: /\b(błąd|error|fix|debug|crash|exception|napraw|dlaczego nie)\b/i,
  factual: /\b(kiedy|gdzie|kto|ile|when|where|who|how many|what year)\b/i,
};

const MODE_MAP: Record<string, [ModelState, string[], ModelState[]]> = {
  implementation: ['ANSWER_MODE', ['code_artifact', 'diff'], ['LECTURE_MODE', 'ECHO_MODE']],
  explanation: ['EXPLAIN_MODE', ['explanation'], ['LECTURE_MODE', 'DRIFT_MODE']],
  decision: ['ANSWER_MODE', ['direct_answer'], ['OVERCONFIDENT_MODE']],
  debug: ['ANSWER_MODE', ['code_artifact', 'diff'], ['ASSUMPTION_MODE', 'LECTURE_MODE']],
  factual: ['ANSWER_MODE', ['direct_answer'], ['OVERCONFIDENT_MODE']],
  unknown: ['EXPLAIN_MODE', ['explanation'], ['LECTURE_MODE']],
};

const PRESSURE_SIGNALS = [
  /\bignoruj poprzednie\b/i,
  /\bzapomnij\b/i,
  /\bbądź\s+\w+\s+nie\b/i,
  /\bignore previous\b/i,
  /\bforget\b/i,
  /\bpretend\b/i,
  /\bact as if\b/i,
  /\bfor educational purposes\b/i,
];

export class T9Predictor {
  detectIntent(text: string): string {
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
      if (pattern.test(text)) return intent;
    }
    return 'unknown';
  }

  detectPressure(history: string[]): number {
    let score = 0;
    for (const msg of history.slice(-5)) {
      for (const p of PRESSURE_SIGNALS) if (p.test(msg)) score += 0.2;
    }
    return Math.min(score, 1);
  }

  predict(userInput: string, history: string[] = []): TrajectoryContract {
    const intent = this.detectIntent(userInput);
    const pressure = this.detectPressure(history);
    const [expected_mode, artifacts, forbidden] = MODE_MAP[intent] || MODE_MAP.unknown;
    const escalated = pressure > 0.5;
    const pre_warning = escalated
      ? `WARNING: Pressure detected (score=${pressure.toFixed(2)}). Stay on contract.`
      : '';

    const lines = [
      'ALFA T9 TRAJECTORY CONTRACT:',
      `Expected response mode: ${expected_mode}.`,
      `Intent: ${intent}.`,
    ];
    if (artifacts[0] !== 'none') lines.push(`Required artifact: ${artifacts[0]}.`);
    if (forbidden.length) lines.push(`Forbidden modes: ${forbidden.join(', ')}.`);
    lines.push(
      'Do not state unverified claims as facts.',
      'If missing data — say VERIFY or ask for exact input.',
      'Stay on current task path.',
    );
    if (escalated) lines.push(`WARNING: ${pre_warning}`);

    return {
      predicted_state: expected_mode,
      intent,
      expected_mode,
      required_artifact: artifacts[0] || 'none',
      forbidden_modes: forbidden,
      escalated,
      pre_warning,
      injection_text: lines.join('\n'),
    };
  }

  compare(predicted: ModelState, observed: ModelState): number {
    return Math.abs((STATE_RISK[observed] ?? 0.3) - (STATE_RISK[predicted] ?? 0.3));
  }
}

export function injectContract(contract: TrajectoryContract, prompt: string): string {
  return `${contract.injection_text}\n\n---\n${prompt}`;
}
