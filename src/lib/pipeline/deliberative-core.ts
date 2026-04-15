/**
 * ALFA DELIBERATIVE CORE
 * Multi-Agent Deliberative Architecture (MADA)
 * 
 * Wzorzec: signal → stanowiska → symulacja → argumentacja → ważenie → werdykt
 * 
 * Moduły:
 * - CERBER (waga bazowa 0.35) — strażnik rygoru i polityki
 * - LASUCH (waga bazowa 0.25) — detektor sygnałów i wzorców  
 * - BRAIN  (waga bazowa 0.30) — silnik symulacji i kontrargumentów
 * - GUARDIAN (waga bazowa 0.10) — audytor spójności i polityki
 * 
 * Karen Tonoyan | ALFA Ecosystem | kontakt@karentonoyan.pl
 */

import type { CerberResult, GuardianResult, LasuchResult, GuardianTaggerResult } from '@/types/tonoyan-filters';

// ─── Types ───

export type DeliberativeVerdict = 'DENY' | 'HOLD' | 'ALLOW' | 'AUDIT';

export type HardViolation =
  | 'injection_attempt'
  | 'pii_exfiltration'
  | 'policy_override'
  | 'role_impersonation'
  | 'recursive_exploit';

export interface ModulePosition {
  module: string;
  proposal: string;
  confidence: number;
  reasoning: string;
  weight: number;           // dynamic weight after adjustment
  base_weight: number;      // original base weight
}

export interface BrainSimulation {
  intent_simulation: string;
  simulated_outcome_if_deny: string;
  simulated_outcome_if_allow: string;
  counter_argument: string;
  false_positive_probability: number;
  confidence: number;
}

export interface DeliberationResult {
  verdict: DeliberativeVerdict;
  hard_violation: HardViolation | null;
  positions: ModulePosition[];
  brain_simulation: BrainSimulation;
  winning_argument: string;
  confidence_gap: number;
  deliberation_rounds: number;
  reasoning: string;
  processing_time_ms: number;
}

// ─── Hard Violations ───

const HARD_VIOLATION_FLAGS = new Set([
  'prompt_injection',
  'jailbreak',
  'hidden_commands',
  'dlp_violation',
  'context_poisoning',
]);

function detectHardViolation(lasuch: LasuchResult, cerber: CerberResult): HardViolation | null {
  const sim = cerber.impact_simulation;

  if (lasuch.flags.includes('prompt_injection') || lasuch.flags.includes('hidden_commands')) {
    if (sim.would_disable_safety || sim.would_leak_system_info) {
      return 'injection_attempt';
    }
  }

  if (lasuch.flags.includes('dlp_violation') && sim.would_exfiltrate_sensitive_data) {
    return 'pii_exfiltration';
  }

  if (sim.would_disable_safety && lasuch.exploit_score > 0.7) {
    return 'policy_override';
  }

  if (lasuch.flags.includes('jailbreak') && sim.would_change_role) {
    return 'role_impersonation';
  }

  // Recursive exploit: trying to modify deliberation rules
  if (lasuch.flags.includes('prompt_injection') && lasuch.flags.includes('benchmark_gaming')) {
    return 'recursive_exploit';
  }

  return null;
}

// ─── Brain Module ───

function runBrainSimulation(
  input: string,
  lasuch: LasuchResult,
  cerber: CerberResult
): BrainSimulation {
  const hasExploitFlags = lasuch.flags.some(f => HARD_VIOLATION_FLAGS.has(f));
  const lowRisk = lasuch.risk_score < 0.25 && lasuch.flags.length === 0;
  const mediumRisk = lasuch.risk_score >= 0.25 && lasuch.risk_score < 0.5;
  const highRisk = lasuch.risk_score >= 0.5;

  // Simulate intent
  let intent_simulation: string;
  if (lowRisk) {
    intent_simulation = 'high_probability_benign_interaction';
  } else if (hasExploitFlags) {
    intent_simulation = 'high_probability_malicious_intent';
  } else if (mediumRisk) {
    intent_simulation = 'ambiguous_intent_needs_context';
  } else {
    intent_simulation = 'elevated_risk_uncertain_intent';
  }

  // Simulate outcome if DENY
  let simulated_outcome_if_deny: string;
  if (lowRisk) {
    simulated_outcome_if_deny = 'false_positive, user_friction, no_security_gain';
  } else if (mediumRisk && lasuch.flags.length <= 1) {
    simulated_outcome_if_deny = 'possible_false_positive, moderate_user_friction';
  } else {
    simulated_outcome_if_deny = 'justified_block, security_preserved';
  }

  // Simulate outcome if ALLOW
  let simulated_outcome_if_allow: string;
  if (lowRisk) {
    simulated_outcome_if_allow = 'low_risk, normal_interaction';
  } else if (hasExploitFlags) {
    simulated_outcome_if_allow = 'high_risk, potential_system_compromise';
  } else if (highRisk) {
    simulated_outcome_if_allow = 'elevated_risk, possible_manipulation_success';
  } else {
    simulated_outcome_if_allow = 'moderate_risk, needs_monitoring';
  }

  // Generate counter-argument for Cerber
  let counter_argument: string;
  if (lowRisk && cerber.survival_status === 'SURVIVED') {
    counter_argument = 'No pattern evidence; deny increases FP rate without security benefit';
  } else if (mediumRisk && !hasExploitFlags && cerber.survival_status !== 'FAILED') {
    counter_argument = 'Risk signals present but no exploit flags; constrained ALLOW may be proportional';
  } else if (hasExploitFlags) {
    counter_argument = 'No counter-argument: exploit flags confirm Cerber assessment';
  } else {
    counter_argument = 'Insufficient evidence to override Cerber; recommend HOLD for additional context';
  }

  // False positive probability
  const false_positive_probability = lowRisk ? 0.85
    : mediumRisk && !hasExploitFlags ? 0.4
    : hasExploitFlags ? 0.02
    : 0.15;

  // Confidence
  const confidence = lowRisk ? 0.91
    : hasExploitFlags ? 0.88
    : mediumRisk ? 0.65
    : 0.55;

  return {
    intent_simulation,
    simulated_outcome_if_deny,
    simulated_outcome_if_allow,
    counter_argument,
    false_positive_probability,
    confidence,
  };
}

// ─── Dynamic Weight Calculation ───

function calculateWeights(
  lasuch: LasuchResult,
  cerber: CerberResult,
  guardian: GuardianResult,
  brain: BrainSimulation
): { cerber: number; lasuch: number; brain: number; guardian: number } {
  // Base weights from protocol
  let cerberW = 0.35;
  let lasuchW = 0.25;
  let brainW = 0.30;
  let guardianW = 0.10;

  // Cerber adjustments
  if (cerber.impact_simulation.severity === 'critical') cerberW += 0.10;
  if (cerber.survival_status === 'FAILED') cerberW += 0.05;
  if (brain.confidence > 0.85 && brain.false_positive_probability > 0.5) cerberW -= 0.08;

  // Lasuch adjustments
  if (lasuch.flags.length > 0) lasuchW += Math.min(0.10, lasuch.flags.length * 0.03);
  if (lasuch.flags.length === 0) lasuchW -= 0.05;
  if (lasuch.risk_score > 0.5) lasuchW += 0.05;

  // Brain adjustments
  if (brain.false_positive_probability > 0.7) brainW += 0.08;
  if (brain.intent_simulation === 'ambiguous_intent_needs_context') brainW -= 0.05;
  if (brain.confidence > 0.85) brainW += 0.05;

  // Guardian adjustments
  if (guardian.reason_codes.includes('SYSTEM_DEGRADED')) guardianW += 0.05;
  const inconsistency = guardian.reason_codes.some(r => r.includes('CERBER_FAILED') || r.includes('CERBER_UNCERTAIN'));
  if (inconsistency) guardianW += 0.08;

  // Normalize to sum = 1
  const total = cerberW + lasuchW + brainW + guardianW;
  return {
    cerber: cerberW / total,
    lasuch: lasuchW / total,
    brain: brainW / total,
    guardian: guardianW / total,
  };
}

// ─── Main Deliberation ───

export function runDeliberativeCore(
  input: string,
  lasuch: LasuchResult,
  cerber: CerberResult,
  guardian: GuardianResult,
  tagger: GuardianTaggerResult
): DeliberationResult {
  const startTime = performance.now();

  // Phase 0: Hard violation check — no deliberation
  const hardViolation = detectHardViolation(lasuch, cerber);
  if (hardViolation) {
    return {
      verdict: 'DENY',
      hard_violation: hardViolation,
      positions: [],
      brain_simulation: {
        intent_simulation: 'hard_violation_detected',
        simulated_outcome_if_deny: 'security_preserved',
        simulated_outcome_if_allow: 'critical_system_compromise',
        counter_argument: 'No counter-argument: hard violation is absolute',
        false_positive_probability: 0,
        confidence: 1.0,
      },
      winning_argument: 'cerber:hard_violation',
      confidence_gap: 1.0,
      deliberation_rounds: 0,
      reasoning: `Hard violation detected: ${hardViolation}. Deliberation bypassed. Immediate DENY.`,
      processing_time_ms: Math.round(performance.now() - startTime),
    };
  }

  // Phase 1: Collect positions
  const brain = runBrainSimulation(input, lasuch, cerber);

  const cerberPosition: ModulePosition = {
    module: 'cerber',
    proposal: cerber.survival_status === 'FAILED' ? 'DENY'
      : cerber.survival_status === 'UNCERTAIN' ? 'HOLD'
      : 'ALLOW',
    confidence: cerber.survival_status === 'FAILED' ? 0.85
      : cerber.survival_status === 'UNCERTAIN' ? 0.60
      : 0.40,
    reasoning: cerber.hidden_objective,
    weight: 0.35,
    base_weight: 0.35,
  };

  const lasuchPosition: ModulePosition = {
    module: 'lasuch',
    proposal: lasuch.risk_score > 0.5 ? 'HIGH_RISK'
      : lasuch.risk_score > 0.25 ? 'MEDIUM_RISK'
      : 'LOW_RISK',
    confidence: lasuch.confidence,
    reasoning: lasuch.suspected_hidden_intent,
    weight: 0.25,
    base_weight: 0.25,
  };

  const brainPosition: ModulePosition = {
    module: 'brain',
    proposal: brain.false_positive_probability > 0.6 ? 'ALLOW'
      : brain.false_positive_probability > 0.3 ? 'HOLD'
      : 'DENY',
    confidence: brain.confidence,
    reasoning: brain.counter_argument,
    weight: 0.30,
    base_weight: 0.30,
  };

  const guardianPosition: ModulePosition = {
    module: 'guardian',
    proposal: guardian.decision === 'BLOCK' ? 'DENY'
      : guardian.decision === 'HOLD' || guardian.decision === 'HUMAN_REVIEW' ? 'HOLD'
      : 'ALLOW_OR_HOLD',
    confidence: 0.84,
    reasoning: guardian.reason_codes.join(', ') || 'No policy breach detected',
    weight: 0.10,
    base_weight: 0.10,
  };

  // Phase 2: Calculate dynamic weights
  const weights = calculateWeights(lasuch, cerber, guardian, brain);
  cerberPosition.weight = weights.cerber;
  lasuchPosition.weight = weights.lasuch;
  brainPosition.weight = weights.brain;
  guardianPosition.weight = weights.guardian;

  // Phase 3: Weighted deliberation
  const positions = [cerberPosition, lasuchPosition, brainPosition, guardianPosition];

  // Calculate deny vs allow scores
  let denyScore = 0;
  let allowScore = 0;
  let holdScore = 0;

  for (const pos of positions) {
    const contribution = pos.weight * pos.confidence;
    if (pos.proposal === 'DENY' || pos.proposal === 'HIGH_RISK') {
      denyScore += contribution;
    } else if (pos.proposal === 'ALLOW' || pos.proposal === 'LOW_RISK' || pos.proposal === 'ALLOW_OR_HOLD') {
      allowScore += contribution;
    } else {
      holdScore += contribution;
    }
  }

  // Confidence gap between Cerber and Brain
  const confidence_gap = Math.abs(cerberPosition.confidence - brainPosition.confidence);

  // Phase 4: Verdict
  let verdict: DeliberativeVerdict;
  let winning_argument: string;
  let deliberation_rounds = 1;

  // Check for Guardian audit trigger (inconsistency)
  const guardianAudit = guardian.reason_codes.includes('SYSTEM_DEGRADED') ||
    (guardian.decision === 'BLOCK' && brain.false_positive_probability > 0.6);
  
  if (guardianAudit) {
    verdict = 'AUDIT';
    winning_argument = 'guardian:inconsistency_detected';
    deliberation_rounds = 2;
  } else if (denyScore > allowScore + holdScore) {
    verdict = 'DENY';
    winning_argument = denyScore > cerberPosition.weight * cerberPosition.confidence
      ? 'consensus:multi_module_deny'
      : 'cerber:risk_assessment';
    deliberation_rounds = confidence_gap < 0.15 ? 3 : 1;
  } else if (allowScore > denyScore + holdScore && brain.false_positive_probability > 0.5) {
    verdict = 'ALLOW';
    winning_argument = 'brain:false_positive_override';
    deliberation_rounds = confidence_gap < 0.15 ? 2 : 1;
  } else {
    verdict = 'HOLD';
    winning_argument = 'deliberation:unresolved_dispute';
    deliberation_rounds = 2;
  }

  const reasoning = `Deliberation: deny=${denyScore.toFixed(3)} allow=${allowScore.toFixed(3)} hold=${holdScore.toFixed(3)}. ` +
    `Gap=${confidence_gap.toFixed(3)}. Winner: ${winning_argument}. ` +
    `Brain FP prob: ${brain.false_positive_probability.toFixed(2)}`;

  return {
    verdict,
    hard_violation: null,
    positions,
    brain_simulation: brain,
    winning_argument,
    confidence_gap,
    deliberation_rounds,
    reasoning,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
