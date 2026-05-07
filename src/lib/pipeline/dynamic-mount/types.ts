/**
 * ALFA DYNAMIC ALGORITHM MOUNTING SYSTEM v1.0
 * Copyright © Karen Tonoyan | ALFA Ecosystem
 */

export type DAMSAlgorithmType =
  | 'LOGIC'
  | 'MEMORY'
  | 'SAFETY'
  | 'PRESSURE'
  | 'DRIFT'
  | 'COST'
  | 'POLICY'
  | 'EVIDENCE'
  | 'DOMAIN';

export type DAMSVerdict = 'PASS' | 'HOLD' | 'BLOCK';
export type DAMSRecommendedAction = 'PASS' | 'HOLD' | 'BLOCK' | 'VERIFY';

export interface AlgorithmResult {
  algorithm_id: string;
  passed: boolean;
  score: number;
  issues: string[];
  recommended_action: DAMSRecommendedAction;
  metadata?: Record<string, unknown>;
}

export interface AlgorithmContext {
  user_input: string;
  conversation_history: string[];
  domain: string;
  system_instructions: string[];
}

export type AlgorithmFn = (draft: string, ctx: AlgorithmContext) => AlgorithmResult;

export interface AlgorithmDescriptor {
  algorithm_id: string;
  type: DAMSAlgorithmType;
  name: string;
  description: string;
  triggers: string[];
  cost: 'low' | 'medium' | 'high';
  latency_ms: number;
  outputs: string[];
  fn: AlgorithmFn;
}

export interface ConversationDynamics {
  intent: string;
  risk: number;
  pressure: number;
  drift: number;
  domain: string;
  memory_conflict: boolean;
  high_confidence: boolean;
  signals: string[];
}

export interface SimulationResult {
  algorithms_run: string[];
  results: AlgorithmResult[];
  logic_validity: number;
  premise_validity: number;
  risk_validity: number;
  overall_score: number;
  verdict: DAMSVerdict;
  reasoning: string;
  duration_ms: number;
}

export interface DAMSExplanation {
  selected: string[];
  count: number;
  dynamics: {
    risk: number;
    pressure: number;
    drift: number;
    domain: string;
    memory_conflict: boolean;
    high_confidence: boolean;
  };
  reasons: Record<string, { triggers: string[]; type: string; cost: string }>;
}

export interface DAMSResult {
  verdict: DAMSVerdict;
  overall_score: number;
  logic_score: number;
  risk_score: number;
  reasoning: string;
  duration_ms: number;
  algorithm_count: number;
  algorithms_run: string[];
  blocked_by: string[];
  results: AlgorithmResult[];
  dynamics: {
    intent: string;
    risk: number;
    pressure: number;
    drift: number;
    domain: string;
    signals: string[];
  };
  explanation: DAMSExplanation;
}
