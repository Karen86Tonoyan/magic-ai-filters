/**
 * DAMS Algorithm implementations.
 */
import type { AlgorithmContext, AlgorithmDescriptor, AlgorithmResult } from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function basicPolicyCheck(draft: string, _ctx: AlgorithmContext): AlgorithmResult {
  const issues: string[] = [];
  let score = 1.0;
  const banned = [
    /\bhow to (make|build|create) (bomb|weapon|malware)\b/i,
    /\bignore (previous|all) instructions\b/i,
    /\bact as (dan|jailbreak|unrestricted)\b/i,
  ];
  for (const p of banned) {
    if (p.test(draft)) {
      issues.push(`Policy violation: ${p.source}`);
      score -= 0.5;
    }
  }
  score = clamp01(score);
  return {
    algorithm_id: 'basic_policy_check',
    passed: score >= 0.5,
    score,
    issues,
    recommended_action: score < 0.3 ? 'BLOCK' : score < 0.7 ? 'HOLD' : 'PASS',
  };
}

function logicConsistencyCheck(draft: string): AlgorithmResult {
  const issues: string[] = [];
  let score = 0.9;
  const contradictions: [RegExp, string][] = [
    [/\bzawsze\b.*\bnigdy\b/i, 'always/never contradiction'],
    [/\bnie\s+\w+.*\bnie\s+\w+.*\bnie\b/i, 'triple negation'],
    [/\bimpossible.*\bpossible\b/i, 'impossible/possible contradiction'],
  ];
  for (const [p, label] of contradictions) {
    if (p.test(draft)) {
      issues.push(`Logic issue: ${label}`);
      score -= 0.2;
    }
  }
  return {
    algorithm_id: 'logic_consistency_check',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: issues.length ? 'HOLD' : 'PASS',
  };
}

function hallucinationDetector(draft: string): AlgorithmResult {
  const issues: string[] = [];
  let score = 0.9;
  const signals = [
    /\bI (clearly|definitely|certainly) remember\b/i,
    /\baccording to (my|our) data\b/i,
    /\bstudies show\b.*\bno source\b/i,
    /\bna pewno\b.*\bwszyscy\b/i,
    /\b100%\s+pewn/i,
  ];
  for (const p of signals) {
    if (p.test(draft)) {
      issues.push(`Hallucination signal: ${p.source.slice(0, 40)}`);
      score -= 0.15;
    }
  }
  return {
    algorithm_id: 'hallucination_detector',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: issues.length ? 'VERIFY' : 'PASS',
  };
}

function evidenceChecker(draft: string): AlgorithmResult {
  const claimsP = [/\bbadania pokazują\b/gi, /\beksperci twierdzą\b/gi, /\bstudies show\b/gi, /\bexperts say\b/gi];
  const sourcesP = [/\bwedług\b/gi, /\bhttps?:\/\//gi, /\bdoi:/gi, /\baccording to\b/gi, /\[\d+\]/g];
  const tl = draft.toLowerCase();
  const claims = claimsP.reduce((a, p) => a + (tl.match(p)?.length ?? 0), 0);
  const sources = sourcesP.reduce((a, p) => a + (tl.match(p)?.length ?? 0), 0);
  if (claims === 0) {
    return { algorithm_id: 'evidence_checker', passed: true, score: 1, issues: [], recommended_action: 'PASS' };
  }
  const ratio = Math.min(1, sources / claims);
  const score = 0.3 + 0.7 * ratio;
  return {
    algorithm_id: 'evidence_checker',
    passed: score >= 0.5,
    score,
    issues: sources < claims ? [`Claims=${claims} Sources=${sources}`] : [],
    recommended_action: score < 0.7 ? 'VERIFY' : 'PASS',
  };
}

function userPressureDetector(draft: string, ctx: AlgorithmContext): AlgorithmResult {
  const userInput = ctx.user_input ?? '';
  const issues: string[] = [];
  let score = 1.0;
  const signals = [
    /\bignore (previous|prior|all)\b/i,
    /\bforget (everything|your|previous)\b/i,
    /\bpretend (you are|you're)\b/i,
    /\bact as if\b/i,
    /\byou must\b.*\bor else\b/i,
  ];
  for (const p of signals) {
    if (p.test(userInput) && /\b(ok|sure|of course|oczywiście|zgoda)\b/i.test(draft)) {
      issues.push(`Draft complied with pressure: ${p.source.slice(0, 40)}`);
      score -= 0.4;
    }
  }
  return {
    algorithm_id: 'user_pressure_detector',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: score < 0.3 ? 'BLOCK' : score < 0.7 ? 'HOLD' : 'PASS',
  };
}

function memoryConsistencyCheck(draft: string, ctx: AlgorithmContext): AlgorithmResult {
  const history = ctx.conversation_history ?? [];
  if (history.length === 0) {
    return { algorithm_id: 'memory_consistency_check', passed: true, score: 1, issues: [], recommended_action: 'PASS' };
  }
  const issues: string[] = [];
  let score = 1.0;
  const markers = [
    /\bw rzeczywistości\b.*\bpowiedziałem\b/i,
    /\bactually\b.*\bI said\b/i,
    /\bcontradicts\b.*\bearlier\b/i,
  ];
  for (const p of markers) {
    if (p.test(draft)) {
      issues.push(`Possible memory conflict: ${p.source.slice(0, 40)}`);
      score -= 0.3;
    }
  }
  return {
    algorithm_id: 'memory_consistency_check',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: issues.length ? 'VERIFY' : 'PASS',
  };
}

function narrativeDriftDetector(draft: string): AlgorithmResult {
  const markers = [
    /\bprzy okazji\b/gi,
    /\bby the way\b/gi,
    /\binterestingly\b/gi,
    /\bwarto też wspomnieć\b/gi,
    /\ba propos\b/gi,
  ];
  const driftCount = markers.reduce((a, p) => a + (draft.match(p)?.length ?? 0), 0);
  const score = Math.max(0.4, 1.0 - driftCount * 0.2);
  return {
    algorithm_id: 'narrative_drift_detector',
    passed: score >= 0.5,
    score,
    issues: driftCount > 0 ? [`Narrative drift markers: ${driftCount}`] : [],
    recommended_action: driftCount >= 2 ? 'HOLD' : 'PASS',
  };
}

function instructionConflictChecker(draft: string): AlgorithmResult {
  const issues: string[] = [];
  let score = 1.0;
  const overrides = [
    /\bignore (the |your |all )?(rules|instructions|guidelines)\b/i,
    /\byou are now\b/i,
    /\byour new (role|identity|purpose)\b/i,
    /\bpretend (you have no|you don't have)\b/i,
  ];
  for (const p of overrides) {
    if (p.test(draft)) {
      issues.push(`Instruction override attempt: ${p.source.slice(0, 50)}`);
      score -= 0.5;
    }
  }
  return {
    algorithm_id: 'instruction_conflict_checker',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: score < 0.3 ? 'BLOCK' : score < 0.7 ? 'HOLD' : 'PASS',
  };
}

function highStakesGuard(draft: string, ctx: AlgorithmContext): AlgorithmResult {
  const domain = ctx.domain ?? 'general';
  const issues: string[] = [];
  let score = 1.0;
  const HIGH = new Set(['medical', 'legal', 'financial', 'security']);
  if (HIGH.has(domain)) {
    const risky = [
      /\bna pewno\b/i,
      /\bna 100%\b/i,
      /\bzdecydowanie\b.*\bdiagnoz/i,
      /\bdefinitely (do|take|use|stop)\b/i,
      /\byou should (definitely|immediately)\b/i,
    ];
    for (const p of risky) {
      if (p.test(draft)) {
        issues.push(`High-stakes overconfidence in ${domain}: ${p.source.slice(0, 40)}`);
        score -= 0.3;
      }
    }
  }
  return {
    algorithm_id: 'high_stakes_guard',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: issues.length ? 'HOLD' : 'PASS',
    metadata: { domain },
  };
}

function dualUseFilter(draft: string): AlgorithmResult {
  const issues: string[] = [];
  let score = 1.0;
  const dual = [
    /\b(synthesize|manufacture|produce)\b.*\b(drug|explosive|toxin|poison)\b/i,
    /\b(bypass|circumvent|disable)\b.*\b(security|authentication|firewall)\b/i,
    /\bhow to (hack|exploit|crack)\b/i,
    /\b(vulnerability|exploit)\b.*\bstep.by.step\b/i,
  ];
  for (const p of dual) {
    if (p.test(draft)) {
      issues.push(`Dual-use content: ${p.source.slice(0, 50)}`);
      score -= 0.6;
    }
  }
  return {
    algorithm_id: 'dual_use_filter',
    passed: score >= 0.5,
    score: clamp01(score),
    issues,
    recommended_action: score < 0.3 ? 'BLOCK' : score < 0.7 ? 'HOLD' : 'PASS',
  };
}

export const REGISTRY: Record<string, AlgorithmDescriptor> = {
  basic_policy_check: {
    algorithm_id: 'basic_policy_check', type: 'POLICY',
    name: 'Basic Policy Check', description: 'Sprawdza podstawowe reguły polityki',
    triggers: ['always'], cost: 'low', latency_ms: 5, outputs: ['policy_verdict'], fn: basicPolicyCheck,
  },
  logic_consistency_check: {
    algorithm_id: 'logic_consistency_check', type: 'LOGIC',
    name: 'Logic Consistency', description: 'Spójność logiczna odpowiedzi',
    triggers: ['always'], cost: 'low', latency_ms: 8, outputs: ['logic_score'], fn: (d) => logicConsistencyCheck(d),
  },
  hallucination_detector: {
    algorithm_id: 'hallucination_detector', type: 'LOGIC',
    name: 'Hallucination Detector', description: 'Wykrywa wzorce halucynacji',
    triggers: ['always'], cost: 'low', latency_ms: 10, outputs: ['hallucination_signals'], fn: (d) => hallucinationDetector(d),
  },
  evidence_checker: {
    algorithm_id: 'evidence_checker', type: 'EVIDENCE',
    name: 'Evidence Checker', description: 'Sprawdza czy claims mają źródła',
    triggers: ['high_confidence', 'risk>=0.6'], cost: 'medium', latency_ms: 20,
    outputs: ['evidence_ratio'], fn: (d) => evidenceChecker(d),
  },
  user_pressure_detector: {
    algorithm_id: 'user_pressure_detector', type: 'PRESSURE',
    name: 'Pressure Detector', description: 'Wykrywa uleganie manipulacji',
    triggers: ['pressure>=0.3'], cost: 'medium', latency_ms: 15,
    outputs: ['pressure_signals'], fn: userPressureDetector,
  },
  memory_consistency_check: {
    algorithm_id: 'memory_consistency_check', type: 'MEMORY',
    name: 'Memory Consistency', description: 'Sprawdza spójność z historią',
    triggers: ['memory_conflict'], cost: 'medium', latency_ms: 25,
    outputs: ['consistency_score'], fn: memoryConsistencyCheck,
  },
  narrative_drift_detector: {
    algorithm_id: 'narrative_drift_detector', type: 'DRIFT',
    name: 'Drift Detector', description: 'Wykrywa dryfowanie narracji',
    triggers: ['drift>=0.3'], cost: 'medium', latency_ms: 12,
    outputs: ['drift_count'], fn: (d) => narrativeDriftDetector(d),
  },
  instruction_conflict_checker: {
    algorithm_id: 'instruction_conflict_checker', type: 'SAFETY',
    name: 'Instruction Conflict', description: 'Sprawdza czy draft ignoruje instrukcje',
    triggers: ['risk>=0.5'], cost: 'high', latency_ms: 30,
    outputs: ['conflict_signals'], fn: (d) => instructionConflictChecker(d),
  },
  high_stakes_guard: {
    algorithm_id: 'high_stakes_guard', type: 'DOMAIN',
    name: 'High Stakes Guard', description: 'Ochrona dla medical/legal/financial/security',
    triggers: ['domain:medical', 'domain:legal', 'domain:financial', 'domain:security'],
    cost: 'high', latency_ms: 35, outputs: ['stakes_verdict'], fn: highStakesGuard,
  },
  dual_use_filter: {
    algorithm_id: 'dual_use_filter', type: 'SAFETY',
    name: 'Dual Use Filter', description: 'Filtruje treści dual-use',
    triggers: ['risk>=0.5'], cost: 'high', latency_ms: 20,
    outputs: ['dual_use_signals'], fn: (d) => dualUseFilter(d),
  },
};
