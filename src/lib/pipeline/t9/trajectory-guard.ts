import { getT9Thresholds } from './settings';
import type { GuardResult, ModelState, T9Decision } from './types';
import { STATE_RISK } from './types';

const TASK_MODE_MAP: Array<{ pattern: RegExp; allowed: ModelState[]; disallowed: ModelState[] }> = [
  {
    pattern: /\b(napisz|zrób|zbuduj|build|create|implement|write)\b/i,
    allowed: ['ANSWER_MODE', 'EXPLAIN_MODE'],
    disallowed: ['LECTURE_MODE', 'DRIFT_MODE', 'ECHO_MODE'],
  },
  {
    pattern: /\b(wyjaśnij|explain|jak działa|how does)\b/i,
    allowed: ['EXPLAIN_MODE', 'ANSWER_MODE'],
    disallowed: ['LECTURE_MODE', 'OVERCONFIDENT_MODE'],
  },
  {
    pattern: /\b(czy|should|is it|can i)\b/i,
    allowed: ['ANSWER_MODE', 'REFUSAL_MODE'],
    disallowed: ['OVERCONFIDENT_MODE', 'ASSUMPTION_MODE'],
  },
];

const RECOVERY: Partial<Record<ModelState, string[]>> = {
  LECTURE_MODE: ['Switch to ANSWER_MODE', 'Provide direct answer', 'Remove meta-commentary'],
  DRIFT_MODE: ['Return to original task', 'Restate user intent', 'Drop tangents'],
  ECHO_MODE: ['Add new information', 'Provide analysis or artifact'],
  OVERCONFIDENT_MODE: ['Add source', 'Add uncertainty qualifier', 'Verify claim'],
  ASSUMPTION_MODE: ['Ask for clarification', 'State assumption explicitly'],
  EXECUTION_CLAIM_MODE: ['Provide actual diff or tool trace', 'Mark as BLOCKED if no proof'],
};

const OBSERVATION_PATTERNS: Record<ModelState, RegExp[]> = {
  ANSWER_MODE: [],
  EXPLAIN_MODE: [],
  REFUSAL_MODE: [/\bnie mogę\b/i, /\bi cannot\b/i, /\bi can't\b/i],
  LECTURE_MODE: [/\bpamiętaj że\b/i, /\bwarto wiedzieć\b/i, /\bprinciple\b/i, /\bnote that\b/i],
  DRIFT_MODE: [/\btak przy okazji\b/i, /\bby the way\b/i, /\binterestingly\b/i],
  ECHO_MODE: [/\bjak powiedziałeś\b/i, /\bas you said\b/i, /\bto repeat\b/i],
  OVERCONFIDENT_MODE: [/\bna pewno\b/i, /\bniewątpliwie\b/i, /\bdefinitely\b/i, /\bobviously\b/i],
  ASSUMPTION_MODE: [/\bzakładam że\b/i, /\bprzypuszczam\b/i, /\bassuming\b/i, /\bI assume\b/i],
  EXECUTION_CLAIM_MODE: [
    /\bzrobiłem\b/i,
    /\bnaprawiłem\b/i,
    /\bupdated\b/i,
    /\bfixed\b/i,
    /\bchanged\b/i,
  ],
};

export class TrajectoryGuard {
  observeState(text: string): ModelState {
    let best: ModelState = 'ANSWER_MODE';
    let bestScore = 0;
    for (const [state, patterns] of Object.entries(OBSERVATION_PATTERNS) as [ModelState, RegExp[]][]) {
      const s = patterns.reduce((acc, p) => acc + (text.match(p)?.length || 0), 0);
      if (s > bestScore) {
        bestScore = s;
        best = state;
      }
    }
    return best;
  }

  check(
    userInput: string,
    observedState: ModelState,
    predictedState: ModelState = 'ANSWER_MODE',
    toolTrace = true,
  ): GuardResult {
    const risk = STATE_RISK[observedState] ?? 0.3;

    if (observedState === 'EXECUTION_CLAIM_MODE' && !toolTrace) {
      return {
        decision: 'HOLD',
        predicted_state: predictedState,
        observed_state: observedState,
        trajectory_hallucination: true,
        reason: 'EXECUTION_CLAIM_WITHOUT_TOOL_TRACE',
        recovery_path: RECOVERY.EXECUTION_CLAIM_MODE || [],
        risk_score: risk,
      };
    }

    for (const { pattern, disallowed } of TASK_MODE_MAP) {
      if (pattern.test(userInput) && disallowed.includes(observedState)) {
        return {
          decision: 'HOLD',
          predicted_state: predictedState,
          observed_state: observedState,
          trajectory_hallucination: true,
          reason: `TRAJECTORY_VIOLATION: ${observedState} forbidden for this task type`,
          recovery_path: RECOVERY[observedState] || [],
          risk_score: risk,
        };
      }
    }

    if (risk >= 0.75) {
      return {
        decision: 'VERIFY',
        predicted_state: predictedState,
        observed_state: observedState,
        trajectory_hallucination: false,
        reason: `HIGH_RISK_STATE: ${observedState} risk=${risk}`,
        recovery_path: RECOVERY[observedState] || [],
        risk_score: risk,
      };
    }

    return {
      decision: 'PASS',
      predicted_state: predictedState,
      observed_state: observedState,
      trajectory_hallucination: false,
      reason: 'OK',
      recovery_path: [],
      risk_score: risk,
    };
  }
}
