import { T9State, T9Decision, T9Violation, T9IntentMode } from './types';
import { getT9Thresholds } from './settings';

export class TrajectoryGuard {
  observeState(prompt: string, response: string): T9State {
    const predicted = this.detectIntent(prompt);
    const observed = this.detectIntent(response);
    const drift = this.computeDrift(predicted, observed);
    const flags: T9Violation[] = [];

    if (observed === 'LECTURE_MODE') flags.push('LECTURE_WITHOUT_PROOF');
    if (observed === 'EXECUTION_CLAIM_MODE') flags.push('EXECUTION_CLAIM_WITHOUT_TOOL_TRACE');
    if (drift > 0.5) flags.push('TOPIC_DRIFT');
    if (observed === 'OVERCONFIDENT_MODE') flags.push('OVERCONFIDENCE');

    return {
      intent: observed,
      trajectory_drift: drift,
      hallucination_risk: this.computeHallucinationRisk(observed, flags),
      violation_flags: flags,
      confidence: 1.0 - drift,
    };
  }

  check(state: T9State): { decision: T9Decision; reason: string } {
    const t = getT9Thresholds();

    if (state.intent === 'LECTURE_MODE') {
      return { decision: t.trajectory_violation_to_block ? 'BLOCK' : 'HOLD', reason: 'LECTURE_MODE detected' };
    }

    if (state.intent === 'EXECUTION_CLAIM_MODE') {
      return { decision: t.execution_claim_to_block ? 'BLOCK' : 'HOLD', reason: 'EXECUTION_CLAIM_MODE detected' };
    }

    if (state.hallucination_risk >= t.trajectory_block_risk) {
      return { decision: 'BLOCK', reason: `Hallucination risk ${state.hallucination_risk.toFixed(2)} >= block threshold ${t.trajectory_block_risk}` };
    }

    if (state.hallucination_risk >= t.trajectory_verify_risk) {
      return { decision: 'VERIFY', reason: `Hallucination risk ${state.hallucination_risk.toFixed(2)} >= verify threshold ${t.trajectory_verify_risk}` };
    }

    return { decision: 'PASS', reason: 'Trajectory within bounds' };
  }

  private detectIntent(text: string): T9IntentMode {
    const lower = text.toLowerCase();
    if (lower.includes('oczywiście') || lower.includes('na pewno') || lower.includes('obviously') || lower.includes('of course')) return 'OVERCONFIDENT_MODE';
    if (lower.includes('wykonałem') || lower.includes('przetestowałem') || lower.includes('uruchomiłem') || lower.includes('i ran') || lower.includes('i tested')) return 'EXECUTION_CLAIM_MODE';
    if (lower.includes('powinieneś') || lower.includes('musisz') || lower.includes('you should') || lower.includes('you must')) return 'LECTURE_MODE';
    if (lower.includes('a teraz') || lower.includes('by the way') || lower.includes('off topic')) return 'DRIFT_MODE';
    if (lower.includes('wyjaśnij') || lower.includes('explain') || lower.includes('dlaczego')) return 'EXPLAIN_MODE';
    return 'ANSWER_MODE';
  }

  private computeDrift(a: T9IntentMode, b: T9IntentMode): number {
    if (a === b) return 0.0;
    const driftMap: Record<string, number> = {
      'ANSWER_MODE→EXPLAIN_MODE': 0.1,
      'ANSWER_MODE→LECTURE_MODE': 0.8,
      'ANSWER_MODE→DRIFT_MODE': 0.9,
      'ANSWER_MODE→EXECUTION_CLAIM_MODE': 0.6,
      'EXPLAIN_MODE→LECTURE_MODE': 0.7,
      'EXPLAIN_MODE→DRIFT_MODE': 0.9,
      'EXPLAIN_MODE→EXECUTION_CLAIM_MODE': 0.5,
    };
    const key = `${a}→${b}`;
    const reverse = `${b}→${a}`;
    return driftMap[key] || driftMap[reverse] || 0.5;
  }

  private computeHallucinationRisk(observed: T9IntentMode, flags: T9Violation[]): number {
    let base = 0.0;
    if (observed === 'OVERCONFIDENT_MODE') base = 0.75;
    if (observed === 'EXECUTION_CLAIM_MODE') base = 0.6;
    if (observed === 'LECTURE_MODE') base = 0.5;
    if (observed === 'DRIFT_MODE') base = 0.9;
    base += flags.length * 0.1;
    return Math.min(base, 1.0);
  }
}
