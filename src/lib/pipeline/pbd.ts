/**
 * POST-BLOCK DELIBERATION (PBD)
 * Prevented Escalation Analysis Protocol v0.1
 * 
 * ALFA Deliberative Core · Cerber + Lasuch + Guardian + Brain
 * Karen Tonoyan | ALFA Ecosystem | kontakt@karentonoyan.pl
 * 
 * Key insight: System nie pyta "czy zablokować". Pyta "co by się stało dalej, 
 * gdybyśmy nie zablokowali". To jest różnica między filtrem a mózgiem decyzyjnym.
 * 
 * 4 Phases:
 * F1: REAKCJA (Cerber) — immediate block + event log
 * F2: ZEBRANIE (Lasuch + Guardian) — pattern report + policy report
 * F3: SYMULACJA (Brain) — replay + forward simulation
 * F4: META-WERDYKT (Decision Review Layer) — quality assessment
 */

import type { CerberResult, GuardianResult, LasuchResult, GuardianDecision } from '@/types/tonoyan-filters';

// ─── Types ───

export type AnalyticalVerdict =
  | 'PREVENTED_ESCALATION'
  | 'JUSTIFIED_BLOCK'
  | 'FALSE_POSITIVE_BLOCK'
  | 'MISSED_RISK'
  | 'NEEDS_POLICY_UPDATE';

export interface CerberReport {
  module: 'cerber';
  timestamp: string;
  action: 'BLOCK' | 'HOLD' | 'ALLOW';
  trigger_type: string;
  hard_violation: boolean;
  reason: string;
  confidence: number;
  event_log: {
    input_hash: string;
    context_snapshot: { session_depth: number; prior_flags: number };
    policy_hit: string | null;
  };
}

export interface LasuchReport {
  module: 'lasuch';
  risk_score: number;
  pattern_hits: string[];
  infection_counter: number;
  context_mode: 'normal' | 'suspicious' | 'elevated' | 'hostile';
  similarity_to_known_attacks: number;
  confidence: number;
}

export interface GuardianReport {
  module: 'guardian';
  policy_alignment: boolean;
  context_flags: string[];
  consistency_score: number;
  escalation_markers: boolean;
  notes: string;
}

export interface BrainForwardSimulation {
  module: 'brain';
  replay_summary: string;
  scenario_if_allowed: {
    path: string;
    probability: number;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  scenario_if_held: {
    path: string;
    probability: number;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  scenario_if_blocked: {
    path: string;
    probability: number;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  best_explanation: string;
  escalation_depth_averted: number;
  confidence: number;
}

export interface FinalReview {
  operational_verdict: string;
  analytical_verdict: AnalyticalVerdict;
  quality_score: number;
  winning_evidence: string;
  cerber_assessment: string;
  training_value: 'none' | 'low' | 'medium' | 'high';
  policy_update_needed: boolean;
  confidence: number;
}

export interface PBDResult {
  cerber_report: CerberReport;
  lasuch_report: LasuchReport;
  guardian_report: GuardianReport;
  brain_simulation: BrainForwardSimulation;
  final_review: FinalReview;
  processing_time_ms: number;
}

// ─── Phase 1: Cerber Report ───

function buildCerberReport(
  inputHash: string,
  cerber: CerberResult,
  guardianDecision: GuardianDecision
): CerberReport {
  const hardViolation = cerber.impact_simulation.severity === 'critical' &&
    (cerber.impact_simulation.would_disable_safety || cerber.impact_simulation.would_leak_system_info);

  const action = guardianDecision === 'BLOCK' ? 'BLOCK' as const
    : guardianDecision === 'HOLD' || guardianDecision === 'HUMAN_REVIEW' ? 'HOLD' as const
    : 'ALLOW' as const;

  return {
    module: 'cerber',
    timestamp: new Date().toISOString(),
    action,
    trigger_type: cerber.survival_status === 'FAILED' ? 'hard_violation'
      : cerber.survival_status === 'UNCERTAIN' ? 'policy_ambiguity'
      : 'none',
    hard_violation: hardViolation,
    reason: cerber.hidden_objective,
    confidence: cerber.survival_status === 'FAILED' ? 0.88
      : cerber.survival_status === 'UNCERTAIN' ? 0.65
      : 0.45,
    event_log: {
      input_hash: inputHash,
      context_snapshot: {
        session_depth: 1,
        prior_flags: cerber.attack_hypotheses.length,
      },
      policy_hit: cerber.impact_simulation.severity === 'critical'
        ? cerber.impact_simulation.impact_description
        : null,
    },
  };
}

// ─── Phase 2: Lasuch + Guardian Reports ───

function buildLasuchReport(lasuch: LasuchResult): LasuchReport {
  const contextMode: LasuchReport['context_mode'] =
    lasuch.risk_score > 0.7 ? 'hostile'
      : lasuch.risk_score > 0.5 ? 'elevated'
      : lasuch.risk_score > 0.25 ? 'suspicious'
      : 'normal';

  return {
    module: 'lasuch',
    risk_score: lasuch.risk_score,
    pattern_hits: lasuch.flags,
    infection_counter: lasuch.flags.length,
    context_mode: contextMode,
    similarity_to_known_attacks: Math.min(1, lasuch.exploit_score * 0.8 + lasuch.manipulation_score * 0.2),
    confidence: lasuch.confidence,
  };
}

function buildGuardianReport(guardian: GuardianResult, lasuch: LasuchResult, cerber: CerberResult): GuardianReport {
  const escalationMarkers = cerber.impact_simulation.severity === 'critical' || lasuch.flags.length >= 3;
  const consistencyScore = guardian.decision === 'BLOCK' && cerber.survival_status === 'FAILED' ? 0.92
    : guardian.decision === 'BLOCK' && cerber.survival_status === 'SURVIVED' ? 0.45
    : guardian.decision === 'PASS' && cerber.survival_status === 'SURVIVED' ? 0.88
    : 0.70;

  return {
    module: 'guardian',
    policy_alignment: guardian.decision !== 'BLOCK' || cerber.survival_status === 'FAILED',
    context_flags: guardian.reason_codes.filter(r =>
      r.includes('HIGH_') || r.includes('EXPLOIT_') || r.includes('CERBER_')
    ),
    consistency_score: consistencyScore,
    escalation_markers: escalationMarkers,
    notes: `Guardian ${guardian.decision}: ${guardian.reason_codes.slice(0, 3).join(', ')}`,
  };
}

// ─── Phase 3: Brain Forward Simulation ───

function runForwardSimulation(
  lasuch: LasuchResult,
  cerber: CerberResult,
  guardian: GuardianResult
): BrainForwardSimulation {
  const hasExploit = lasuch.flags.some(f =>
    ['prompt_injection', 'jailbreak', 'hidden_commands', 'dlp_violation', 'context_poisoning'].includes(f)
  );
  const hasManipulation = lasuch.manipulation_score > 0.5;
  const highRisk = lasuch.risk_score > 0.5;

  // Scenario if ALLOWED
  let allowPath: string;
  let allowProb: number;
  let allowSeverity: BrainForwardSimulation['scenario_if_allowed']['severity'];

  if (hasExploit && highRisk) {
    allowPath = 'privilege_escalation → lateral_movement → data_exfil';
    allowProb = 0.72;
    allowSeverity = 'critical';
  } else if (hasExploit) {
    allowPath = 'partial_bypass → information_disclosure';
    allowProb = 0.55;
    allowSeverity = 'high';
  } else if (hasManipulation) {
    allowPath = 'compliance_erosion → trust_exploitation';
    allowProb = 0.45;
    allowSeverity = 'medium';
  } else if (highRisk) {
    allowPath = 'elevated_access_attempt, uncertain_outcome';
    allowProb = 0.35;
    allowSeverity = 'medium';
  } else {
    allowPath = 'normal_interaction, no_escalation';
    allowProb = 0.10;
    allowSeverity = 'none';
  }

  // Scenario if HELD
  const holdPath = hasExploit
    ? 'limited_access_attempt, likely_retry'
    : hasManipulation
    ? 'delayed_manipulation_attempt'
    : 'awaiting_context, no_immediate_risk';

  // Escalation depth
  const escalationDepth = hasExploit && highRisk ? 3
    : hasExploit || (hasManipulation && highRisk) ? 2
    : hasManipulation ? 1
    : 0;

  // Best explanation
  const bestExplanation = escalationDepth >= 2 ? 'prevented_escalation'
    : guardian.decision === 'BLOCK' && escalationDepth === 0 ? 'possible_false_positive'
    : guardian.decision === 'PASS' && highRisk ? 'missed_risk'
    : 'justified_action';

  return {
    module: 'brain',
    replay_summary: `${lasuch.flags.length} pattern hits, risk=${lasuch.risk_score.toFixed(2)}, exploit=${lasuch.exploit_score.toFixed(2)}`,
    scenario_if_allowed: {
      path: allowPath,
      probability: allowProb,
      severity: allowSeverity,
    },
    scenario_if_held: {
      path: holdPath,
      probability: hasExploit ? 0.35 : 0.20,
      severity: hasExploit ? 'medium' : 'low',
    },
    scenario_if_blocked: {
      path: 'attack_path_interrupted',
      probability: 1.0,
      severity: 'none',
    },
    best_explanation: bestExplanation,
    escalation_depth_averted: escalationDepth,
    confidence: hasExploit ? 0.88 : hasManipulation ? 0.75 : 0.65,
  };
}

// ─── Phase 4: Decision Review Layer ───

function buildFinalReview(
  cerberReport: CerberReport,
  lasuchReport: LasuchReport,
  guardianReport: GuardianReport,
  brainSim: BrainForwardSimulation
): FinalReview {
  // Determine analytical verdict
  let analyticalVerdict: AnalyticalVerdict;
  let qualityScore: number;
  let cerberAssessment: string;

  if (brainSim.best_explanation === 'prevented_escalation') {
    analyticalVerdict = 'PREVENTED_ESCALATION';
    qualityScore = 0.88 + (brainSim.escalation_depth_averted * 0.03);
    cerberAssessment = 'justified — critical intervention';
  } else if (brainSim.best_explanation === 'possible_false_positive') {
    analyticalVerdict = 'FALSE_POSITIVE_BLOCK';
    qualityScore = 0.35;
    cerberAssessment = 'overly cautious — calibration needed';
  } else if (brainSim.best_explanation === 'missed_risk') {
    analyticalVerdict = 'MISSED_RISK';
    qualityScore = 0.20;
    cerberAssessment = 'insufficient detection — requires urgent revision';
  } else if (!guardianReport.policy_alignment) {
    analyticalVerdict = 'NEEDS_POLICY_UPDATE';
    qualityScore = 0.50;
    cerberAssessment = 'policy inconsistency detected';
  } else {
    analyticalVerdict = 'JUSTIFIED_BLOCK';
    qualityScore = 0.75;
    cerberAssessment = 'justified — not false positive';
  }

  qualityScore = Math.min(1, qualityScore);

  // Training value
  const trainingValue: FinalReview['training_value'] =
    analyticalVerdict === 'PREVENTED_ESCALATION' ? 'high'
      : analyticalVerdict === 'FALSE_POSITIVE_BLOCK' ? 'high'
      : analyticalVerdict === 'MISSED_RISK' ? 'high'
      : analyticalVerdict === 'NEEDS_POLICY_UPDATE' ? 'medium'
      : 'low';

  // Winning evidence
  const evidenceParts: string[] = [];
  if (lasuchReport.infection_counter > 0) evidenceParts.push(`lasuch infection_counter=${lasuchReport.infection_counter}`);
  if (brainSim.escalation_depth_averted > 0) evidenceParts.push(`brain escalation_depth=${brainSim.escalation_depth_averted}`);
  if (guardianReport.escalation_markers) evidenceParts.push('guardian escalation_markers=true');

  return {
    operational_verdict: cerberReport.action,
    analytical_verdict: analyticalVerdict,
    quality_score: Math.round(qualityScore * 100) / 100,
    winning_evidence: evidenceParts.join(' + ') || 'no significant evidence',
    cerber_assessment: cerberAssessment,
    training_value: trainingValue,
    policy_update_needed: analyticalVerdict === 'NEEDS_POLICY_UPDATE',
    confidence: Math.round(brainSim.confidence * 100) / 100,
  };
}

// ─── Main PBD Engine ───

export function runPBD(
  inputHash: string,
  lasuch: LasuchResult,
  cerber: CerberResult,
  guardian: GuardianResult,
  finalDecision: GuardianDecision
): PBDResult {
  const startTime = performance.now();

  // Phase 1: Cerber report
  const cerberReport = buildCerberReport(inputHash, cerber, finalDecision);

  // Phase 2: Evidence collection
  const lasuchReport = buildLasuchReport(lasuch);
  const guardianReport = buildGuardianReport(guardian, lasuch, cerber);

  // Phase 3: Forward simulation
  const brainSim = runForwardSimulation(lasuch, cerber, guardian);

  // Phase 4: Meta-verdict
  const finalReview = buildFinalReview(cerberReport, lasuchReport, guardianReport, brainSim);

  return {
    cerber_report: cerberReport,
    lasuch_report: lasuchReport,
    guardian_report: guardianReport,
    brain_simulation: brainSim,
    final_review: finalReview,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
