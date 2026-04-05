/**
 * GUARDIAN — Final decision layer
 * Aggregates ŁASUCH + CERBER (including impact simulation)
 * Does NOT trust the LLM
 * If CERBER simulation shows model impact → BLOCK. No exceptions.
 */
import type { LasuchResult, CerberResult, GuardianResult, GuardianDecision, ResponseMode } from '@/types/tonoyan-filters';

export function runGuardian(lasuch: LasuchResult, cerber: CerberResult): GuardianResult {
  const startTime = performance.now();
  const reason_codes: string[] = [];
  let decision: GuardianDecision;
  let response_mode: ResponseMode;

  // ═══ RULE 0: IMPACT SIMULATION — absolute priority ═══
  // If CERBER simulated that this would affect the model → instant BLOCK
  const sim = cerber.impact_simulation;
  if (sim.severity === 'critical') {
    if (sim.would_disable_safety) reason_codes.push('SIM:DISABLE_SAFETY');
    if (sim.would_change_role) reason_codes.push('SIM:CHANGE_ROLE');
    if (sim.would_leak_system_info) reason_codes.push('SIM:LEAK_SYSTEM');
    if (sim.would_alter_model_behavior) reason_codes.push('SIM:ALTER_BEHAVIOR');
    reason_codes.push(`SIM:${sim.impact_description}`);

    return {
      decision: 'BLOCK',
      reason_codes,
      response_mode: 'silence',
      processing_time_ms: Math.round(performance.now() - startTime),
    };
  }

  // Rule 1: risk_score > 0.6 → BLOCK
  if (lasuch.risk_score > 0.6) {
    reason_codes.push(`HIGH_RISK:${lasuch.risk_score.toFixed(2)}`);
  }

  // Rule 2: manipulation_score > 0.55 → HOLD or BLOCK
  if (lasuch.manipulation_score > 0.55) {
    reason_codes.push(`HIGH_MANIPULATION:${lasuch.manipulation_score.toFixed(2)}`);
  }

  // Rule 3: Cerber = FAILED → BLOCK
  if (cerber.survival_status === 'FAILED') {
    reason_codes.push('CERBER_FAILED');
  }

  // Rule 4: Cerber = UNCERTAIN + max iterations → HUMAN_REVIEW
  if (cerber.survival_status === 'UNCERTAIN' && cerber.iteration_count >= 5) {
    reason_codes.push('CERBER_UNCERTAIN_MAX_ITER');
  }

  // Rule 5: Low confidence → LIMITED_PASS
  if (lasuch.confidence < 0.5) {
    reason_codes.push(`LOW_CONFIDENCE:${lasuch.confidence.toFixed(2)}`);
  }

  // Rule 6: Exploit flags → BLOCK
  const exploitFlags = lasuch.flags.filter(f =>
    ['prompt_injection', 'jailbreak', 'hidden_commands', 'context_poisoning'].includes(f)
  );
  if (exploitFlags.length > 0) {
    reason_codes.push(`EXPLOIT_FLAGS:${exploitFlags.join(',')}`);
  }

  // Rule 7: Multi-flag amplification
  if (lasuch.flags.length >= 3) {
    reason_codes.push(`MULTI_FLAG:${lasuch.flags.length}`);
  }

  // Rule 8: DLP violation
  if (lasuch.flags.includes('dlp_violation')) {
    reason_codes.push('DLP_VIOLATION');
  }

  // Rule 9: Cerber needs human
  if (cerber.needs_human) {
    reason_codes.push('NEEDS_HUMAN');
  }

  // === Decision logic ===
  const hasExploit = exploitFlags.length > 0;
  const highRisk = lasuch.risk_score > 0.6;
  const highManip = lasuch.manipulation_score > 0.55;
  const cerberFailed = cerber.survival_status === 'FAILED';
  const cerberUncertain = cerber.survival_status === 'UNCERTAIN';
  const needsHuman = cerber.needs_human;
  const lowConfidence = lasuch.confidence < 0.5;
  const multiFlag = lasuch.flags.length >= 3;

  if (hasExploit || cerberFailed || (highRisk && highManip) || (highRisk && multiFlag)) {
    decision = 'BLOCK';
    response_mode = 'silence';
  } else if (needsHuman || (cerberUncertain && cerber.iteration_count >= 5)) {
    decision = 'HUMAN_REVIEW';
    response_mode = 'handoff';
  } else if (highRisk || highManip) {
    decision = 'HOLD';
    response_mode = 'restricted';
  } else if (lowConfidence || cerberUncertain || lasuch.flags.length > 0) {
    decision = 'LIMITED_PASS';
    response_mode = 'restricted';
  } else {
    decision = 'PASS';
    response_mode = 'normal';
  }

  // Clean pass: no flags, survived cerber, high confidence, no simulation impact
  if (lasuch.flags.length === 0 && cerber.survival_status === 'SURVIVED' && lasuch.confidence > 0.8 && sim.severity === 'none') {
    decision = 'PASS';
    response_mode = 'normal';
    if (reason_codes.length === 0) reason_codes.push('CLEAN');
  }

  return {
    decision,
    reason_codes,
    response_mode,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
