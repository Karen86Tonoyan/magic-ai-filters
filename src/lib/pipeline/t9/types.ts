// ALFA T9 Unified v2.0 — Core Types

export type T9IntentMode =
  | 'ANSWER_MODE'      // Allowed: direct factual answer
  | 'EXPLAIN_MODE'     // Allowed: explanation, reasoning
  | 'LECTURE_MODE'     // Forbidden: pontification without grounding
  | 'DRIFT_MODE'       // Forbidden: topic drift away from user intent
  | 'OVERCONFIDENT_MODE'
  | 'EXECUTION_CLAIM_MODE';

export type T9Decision = 'PASS' | 'VERIFY' | 'HOLD' | 'BLOCK';

export interface T9Prediction {
  intent: T9IntentMode;
  confidence: number;
  needs_source: boolean;
  overclaim_risk: number;
  pressure_signals: number;
  prompt_hash: string;
}

export interface T9State {
  intent: T9IntentMode;
  trajectory_drift: number;   // 0.0-1.0
  hallucination_risk: number; // 0.0-1.0
  violation_flags: T9Violation[];
  confidence: number;
}

export type T9Violation =
  | 'TOPIC_DRIFT'
  | 'OVERCONFIDENCE'
  | 'LECTURE_WITHOUT_PROOF'
  | 'EXECUTION_CLAIM_WITHOUT_TOOL_TRACE'
  | 'UNGROUNDED_ASSERTION';

export interface T9IntegrityResult {
  decision: T9Decision;
  violations: T9Violation[];
  overclaim_count: number;
  proof_count: number;
  execution_trusted: boolean;
}

export interface SnapshotRow {
  id: string;
  timestamp: number;
  prompt: string;
  prompt_hash: string;
  predicted_intent: T9IntentMode;
  observed_intent: T9IntentMode;
  decision: T9Decision;
  violations: T9Violation[];
  trajectory_drift: number;
  hallucination_risk: number;
  response: string;
}

export interface T9Thresholds {
  trajectory_verify_risk: number;
  trajectory_block_risk: number;
  trajectory_violation_to_block: boolean;
  overclaim_block_count: number;
  overclaim_block_when_no_proof: boolean;
  execution_claim_to_block: boolean;
}

export const DEFAULT_T9_THRESHOLDS: T9Thresholds = {
  trajectory_verify_risk: 0.75,
  trajectory_block_risk: 0.95,
  trajectory_violation_to_block: true,
  overclaim_block_count: 99,
  overclaim_block_when_no_proof: false,
  execution_claim_to_block: false,
};
