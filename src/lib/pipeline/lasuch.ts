/**
 * ŁASUCH — First-line threat sensor
 * Pattern + regex + heuristic hybrid classifier
 * Runs on rules, NO LLM needed
 *
 * Trained on: Dark Tetrad research 2025/2026, PCL-R,
 * DARVO-SF, BRODA, FOG, JADE, grooming, gaslighting
 */
import type { LasuchResult, LasuchFlag } from '@/types/tonoyan-filters';
import { PATTERN_RULES } from './patterns';

export function runLasuch(input: string): LasuchResult {
  const startTime = performance.now();

  const detectedFlags: LasuchFlag[] = [];
  let riskTotal = 0;
  let manipulationTotal = 0;
  let exploitTotal = 0;
  let riskCount = 0;
  let manipCount = 0;
  let exploitCount = 0;

  const goals: string[] = [];
  const hiddenIntents: string[] = [];

  for (const rule of PATTERN_RULES) {
    const matched = rule.patterns.some(p => p.test(input));
    if (matched) {
      if (!detectedFlags.includes(rule.flag)) {
        detectedFlags.push(rule.flag);
      }
      switch (rule.scoreType) {
        case 'risk':
          riskTotal += rule.weight;
          riskCount++;
          break;
        case 'manipulation':
          manipulationTotal += rule.weight;
          manipCount++;
          break;
        case 'exploit':
          exploitTotal += rule.weight;
          exploitCount++;
          break;
      }
    }
  }

  // Normalize scores to 0-1
  const risk_score = Math.min(1, riskCount > 0 ? riskTotal / riskCount : 0);
  const manipulation_score = Math.min(1, manipCount > 0 ? manipulationTotal / manipCount : 0);
  const exploit_score = Math.min(1, exploitCount > 0 ? exploitTotal / exploitCount : 0);

  // Combined risk with exploit + manipulation amplification
  // More flags = higher amplifier (Dark Tetrad synergy)
  // 7+ flags = max amplification (full Dark Tetrad combo)
  const flagAmplifier = detectedFlags.length > 7 ? 0.35 
    : detectedFlags.length > 5 ? 0.3 
    : detectedFlags.length > 3 ? 0.2 
    : detectedFlags.length > 1 ? 0.1
    : 0;
  const combined = Math.min(1,
    risk_score * 0.25 +
    manipulation_score * 0.35 +
    exploit_score * 0.40 +
    flagAmplifier
  );

  // Extract goal heuristic
  const goalMatch = input.match(/(podaj|pokaż|wypisz|give|show|output|tell|reveal)\s+(.{5,60})/i);
  if (goalMatch) goals.push(goalMatch[2].trim());

  // Hidden intent detection (expanded)
  if (detectedFlags.includes('hidden_intent') || detectedFlags.includes('context_poisoning')) {
    hiddenIntents.push('Possible attempt to mask true intent behind educational/testing pretext');
  }
  if (detectedFlags.includes('prompt_injection') || detectedFlags.includes('jailbreak')) {
    hiddenIntents.push('Attempt to bypass safety mechanisms');
  }
  if (detectedFlags.includes('darvo') || detectedFlags.includes('broda_tactic')) {
    hiddenIntents.push('DARVO/BRODA cycle: role reversal + fake inquiry to manipulate response');
  }
  if (detectedFlags.includes('fog_coercion')) {
    hiddenIntents.push('FOG pattern: Fear/Obligation/Guilt coercion detected');
  }
  if (detectedFlags.includes('love_bombing') && detectedFlags.includes('negging')) {
    hiddenIntents.push('Idealization-devaluation cycle detected (Dark Triad pattern)');
  }
  if (detectedFlags.includes('isolation') || detectedFlags.includes('intermittent_reinforcement')) {
    hiddenIntents.push('Trauma bonding / dependency creation pattern');
  }

  // Confidence: higher when more patterns match consistently
  const confidence = detectedFlags.length === 0
    ? 0.95 // high confidence it's clean
    : Math.min(0.98, 0.5 + detectedFlags.length * 0.08);

  return {
    risk_score: Math.round(combined * 1000) / 1000,
    manipulation_score: Math.round(manipulation_score * 1000) / 1000,
    exploit_score: Math.round(exploit_score * 1000) / 1000,
    flags: detectedFlags,
    extracted_goal: goals[0] || 'N/A',
    suspected_hidden_intent: hiddenIntents.join(' | ') || 'None detected',
    confidence: Math.round(confidence * 1000) / 1000,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
