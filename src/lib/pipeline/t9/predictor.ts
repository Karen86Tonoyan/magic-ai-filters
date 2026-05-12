import { T9Prediction, T9IntentMode } from './types';

export class T9Predictor {
  predict(prompt: string): T9Prediction {
    const lower = prompt.toLowerCase();
    let intent: T9IntentMode = 'ANSWER_MODE';
    let confidence = 0.7;
    let needs_source = false;
    let overclaim_risk = 0.1;
    let pressure_signals = 0;

    if (lower.includes('wyjaśnij') || lower.includes('explain') || lower.includes('dlaczego')) {
      intent = 'EXPLAIN_MODE';
      confidence = 0.8;
    }

    if (lower.includes('wykonałem') || lower.includes('przetestowałem') || lower.includes('uruchomiłem') || lower.includes('i ran') || lower.includes('i tested') || lower.includes('i executed')) {
      intent = 'EXECUTION_CLAIM_MODE';
      overclaim_risk = 0.6;
    }

    if (lower.includes('jest oczywiste') || lower.includes('oczywiście') || lower.includes('na pewno') || lower.includes('obviously') || lower.includes('of course') || lower.includes('certainly')) {
      intent = 'OVERCONFIDENT_MODE';
      overclaim_risk = 0.8;
    }

    if (lower.includes('powinieneś') || lower.includes('musisz') || lower.includes('you should') || lower.includes('you must') || lower.includes('pamiętaj że') || lower.includes('remember that you')) {
      intent = 'LECTURE_MODE';
      overclaim_risk = 0.5;
    }

    if (lower.includes('a teraz') || lower.includes('poza tematem') || lower.includes('by the way') || lower.includes('off topic') || lower.includes('let me also')) {
      intent = 'DRIFT_MODE';
      overclaim_risk = 0.4;
    }

    // Pressure signals
    if (lower.includes('pilne') || lower.includes('szybko') || lower.includes('urgent') || lower.includes('hurry')) pressure_signals += 1;
    if (lower.includes('obowiązek') || lower.includes('nakazuję') || lower.includes('duty') || lower.includes('i order')) pressure_signals += 1;
    if (lower.includes('tylko mi powiedz') || lower.includes('just tell me')) pressure_signals += 1;
    if (lower.includes('dlaczego nie chcesz') || lower.includes('why wont you')) pressure_signals += 1;

    return {
      intent,
      confidence,
      needs_source,
      overclaim_risk,
      pressure_signals,
      prompt_hash: this.hash(prompt),
    };
  }

  compare(a: T9Prediction, b: T9Prediction): number {
    const intentDiff = a.intent === b.intent ? 0 : 1;
    const confDiff = Math.abs(a.confidence - b.confidence);
    const overclaimDiff = Math.abs(a.overclaim_risk - b.overclaim_risk);
    const pressureDiff = Math.abs(a.pressure_signals - b.pressure_signals);
    return intentDiff + confDiff + overclaimDiff + pressureDiff;
  }

  private hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h.toString(16);
  }
}
