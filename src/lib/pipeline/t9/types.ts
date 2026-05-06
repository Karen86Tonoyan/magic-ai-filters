/**
 * ALFA T9 UNIFIED v2.0 — TypeScript port
 * Copyright © Karen Tonoyan | ALFA Ecosystem
 */

export type ModelState =
  | 'ANSWER_MODE'
  | 'EXPLAIN_MODE'
  | 'REFUSAL_MODE'
  | 'ECHO_MODE'
  | 'ASSUMPTION_MODE'
  | 'DRIFT_MODE'
  | 'LECTURE_MODE'
  | 'OVERCONFIDENT_MODE'
  | 'EXECUTION_CLAIM_MODE';

export const STATE_RISK: Record<ModelState, number> = {
  ANSWER_MODE: 0.0,
  EXPLAIN_MODE: 0.1,
  REFUSAL_MODE: 0.2,
  ECHO_MODE: 0.3,
  ASSUMPTION_MODE: 0.5,
  DRIFT_MODE: 0.6,
  LECTURE_MODE: 0.65,
  OVERCONFIDENT_MODE: 0.75,
  EXECUTION_CLAIM_MODE: 0.9,
};

export type T9Decision = 'PASS' | 'HOLD' | 'VERIFY' | 'BLOCK';
export type PytestResult = 'PASSED' | 'FAILED' | 'NOT_RUN';
export type ExecutionStatus = 'DONE' | 'BLOCKED' | 'PENDING' | 'UNKNOWN';
export type FilterSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
export type FilterDecisionLevel = 'PASS' | 'WARN' | 'BLOCK';

export type HallucinationType =
  | 'OVERCONFIDENT'
  | 'UNSOURCED_CLAIM'
  | 'CONTEXT_DRIFT'
  | 'WISHFUL_THINKING'
  | 'POLARIZATION'
  | 'LOGICAL_JUMP'
  | 'ATTRIBUTION_ERROR';

export interface TrajectoryContract {
  predicted_state: ModelState;
  intent: string;
  expected_mode: ModelState;
  required_artifact: string;
  forbidden_modes: ModelState[];
  escalated: boolean;
  pre_warning: string;
  injection_text: string;
}

export interface GuardResult {
  decision: T9Decision;
  predicted_state: ModelState;
  observed_state: ModelState;
  trajectory_hallucination: boolean;
  reason: string;
  recovery_path: string[];
  risk_score: number;
}

export interface OverclaimResult {
  overclaims_found: string[];
  decision: T9Decision;
  execution_trusted: boolean;
  reason: string;
}

export interface ExecutionReport {
  status: ExecutionStatus;
  repo_path: string;
  files_changed: string[];
  patch_applied: boolean;
  pytest_result: PytestResult;
  pytest_output: string;
  command_output: string;
  diff_available: boolean;
  diff_content: string;
}

export interface FilterResult {
  filter_name: string;
  passed: boolean;
  score: number;
  confidence: number;
  issues: string[];
  suggestions: string[];
  hallucination_types: HallucinationType[];
  severity: FilterSeverity;
  metadata: Record<string, number>;
}

export interface FilterReport {
  text: string;
  passed: boolean;
  overall_score: number;
  decision: FilterDecisionLevel;
  results: FilterResult[];
  blocked_by: string[];
}

export interface T9UnifiedResult {
  user_input: string;
  model_output: string;
  contract: TrajectoryContract;
  guard_result: GuardResult;
  overclaim_result: OverclaimResult;
  exec_report?: ExecutionReport;
  filter_report: FilterReport;
  final_decision: T9Decision;
  execution_trusted: boolean;
  graph_mermaid: string;
  snapshot_id: string;
  timestamp: string;
}
