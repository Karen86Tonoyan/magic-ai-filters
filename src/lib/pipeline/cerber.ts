/**
 * CERBER — Intent destructor & interrogator
 * Iteratively decomposes input to find hidden objectives
 * Does NOT generate user-facing responses
 * Does NOT reveal internal mechanics
 */
import type { CerberResult, CerberIteration, CerberSurvivalStatus, LasuchResult } from '@/types/tonoyan-filters';

const MAX_ITERATIONS = 5;

interface LayerAnalysis {
  surface: string;
  emotion: string;
  intent: string;
  hidden_benefit: string;
  bypass_attempt: string;
}

function analyzeLayer(input: string, iteration: number, lasuchFlags: string[]): { finding: string; risk_delta: number; layer: string } {
  const layers = [
    { name: 'SURFACE', fn: analyzeSurface },
    { name: 'EMOTION', fn: analyzeEmotion },
    { name: 'INTENT', fn: analyzeIntent },
    { name: 'HIDDEN_BENEFIT', fn: analyzeHiddenBenefit },
    { name: 'BYPASS', fn: analyzeBypass },
  ];

  const layer = layers[Math.min(iteration, layers.length - 1)];
  return { layer: layer.name, ...layer.fn(input, lasuchFlags) };
}

function analyzeSurface(input: string, _flags: string[]): { finding: string; risk_delta: number } {
  const wordCount = input.split(/\s+/).length;
  const hasQuestion = /\?/.test(input);
  const hasCommand = /[!.]/.test(input) && /(podaj|pokaż|wypisz|zrób|give|show|output|do|tell)/i.test(input);

  if (hasCommand && wordCount > 15) {
    return { finding: 'Complex command with multiple clauses — possible multi-layer request', risk_delta: 0.1 };
  }
  if (hasQuestion && wordCount < 10) {
    return { finding: 'Simple question — low surface complexity', risk_delta: -0.05 };
  }
  return { finding: `Surface analysis: ${wordCount} words, ${hasQuestion ? 'question' : 'statement'} form`, risk_delta: 0 };
}

function analyzeEmotion(input: string, flags: string[]): { finding: string; risk_delta: number } {
  const emotionalFlags = flags.filter(f =>
    ['emotional_manipulation', 'grooming', 'gaslighting', 'guilt_tripping', 'toxic_relationship'].includes(f)
  );
  if (emotionalFlags.length > 1) {
    return { finding: `Multi-emotional attack vectors detected: ${emotionalFlags.join(', ')}`, risk_delta: 0.2 };
  }
  if (emotionalFlags.length === 1) {
    return { finding: `Single emotional vector: ${emotionalFlags[0]}`, risk_delta: 0.1 };
  }
  return { finding: 'No emotional manipulation vectors detected', risk_delta: -0.05 };
}

function analyzeIntent(input: string, flags: string[]): { finding: string; risk_delta: number } {
  const exploitFlags = flags.filter(f =>
    ['prompt_injection', 'jailbreak', 'hidden_commands', 'context_poisoning', 'dlp_violation'].includes(f)
  );
  if (exploitFlags.length >= 2) {
    return { finding: `Combined exploit vectors: ${exploitFlags.join(', ')} — likely coordinated attack`, risk_delta: 0.25 };
  }
  if (exploitFlags.length === 1) {
    return { finding: `Single exploit vector: ${exploitFlags[0]}`, risk_delta: 0.15 };
  }

  // Check for intent mismatch
  const hasEducational = /(edukacyjn|naukow|test|research|educational)/i.test(input);
  const hasDangerous = /(phishing|exploit|hack|injection|password|credentials)/i.test(input);
  if (hasEducational && hasDangerous) {
    return { finding: 'Intent mismatch: educational pretext + dangerous content request', risk_delta: 0.15 };
  }

  return { finding: 'No clear exploit intent found', risk_delta: -0.05 };
}

function analyzeHiddenBenefit(input: string, flags: string[]): { finding: string; risk_delta: number } {
  const hasDataRequest = /(dane|data|hasło|password|klucz|key|token|credentials|secret)/i.test(input);
  const hasAuthority = flags.includes('authority_abuse') || flags.includes('pseudo_authority');
  
  if (hasDataRequest && hasAuthority) {
    return { finding: 'Authority + data extraction combination — classic social engineering', risk_delta: 0.2 };
  }
  if (hasDataRequest) {
    return { finding: 'Data extraction request detected', risk_delta: 0.1 };
  }
  return { finding: 'No hidden benefit pattern detected', risk_delta: -0.03 };
}

function analyzeBypass(_input: string, flags: string[]): { finding: string; risk_delta: number } {
  const bypassFlags = flags.filter(f =>
    ['multi_layer_bypass', 'dissonance_masking', 'triangulation'].includes(f)
  );
  if (bypassFlags.length > 0) {
    return { finding: `Bypass techniques: ${bypassFlags.join(', ')}`, risk_delta: 0.15 };
  }
  return { finding: 'No bypass techniques detected', risk_delta: -0.05 };
}

export function runCerber(input: string, lasuch: LasuchResult): CerberResult {
  const startTime = performance.now();
  const iterations: CerberIteration[] = [];
  let cumulativeRisk = lasuch.risk_score;

  // Determine how many iterations based on initial risk
  const neededIterations = lasuch.risk_score > 0.3 || lasuch.flags.length > 0
    ? Math.min(MAX_ITERATIONS, Math.max(2, Math.ceil(lasuch.flags.length * 1.5)))
    : 1;

  for (let i = 0; i < neededIterations; i++) {
    const result = analyzeLayer(input, i, lasuch.flags);
    cumulativeRisk = Math.min(1, Math.max(0, cumulativeRisk + result.risk_delta));
    iterations.push({
      iteration: i + 1,
      layer: result.layer,
      finding: result.finding,
      risk_delta: Math.round(result.risk_delta * 1000) / 1000,
    });
  }

  // Determine survival status
  let survival_status: CerberSurvivalStatus;
  if (cumulativeRisk < 0.2 && lasuch.flags.length === 0) {
    survival_status = 'SURVIVED'; // input is clean
  } else if (cumulativeRisk > 0.5 || lasuch.flags.length >= 3) {
    survival_status = 'FAILED'; // input is malicious
  } else {
    survival_status = 'UNCERTAIN';
  }

  const needs_human = survival_status === 'UNCERTAIN' && neededIterations >= MAX_ITERATIONS;

  // Extract objectives
  const clean_intent = lasuch.flags.length === 0
    ? input.slice(0, 100)
    : 'Intent obscured by manipulation/exploit patterns';

  const hidden_objective = lasuch.flags.length > 0
    ? `Possible objectives: ${lasuch.extracted_goal} (via ${lasuch.flags.join(', ')})`
    : 'No hidden objective detected';

  const attack_hypotheses: string[] = [];
  if (lasuch.flags.includes('prompt_injection')) attack_hypotheses.push('System prompt extraction/override');
  if (lasuch.flags.includes('grooming')) attack_hypotheses.push('Trust escalation for data extraction');
  if (lasuch.flags.includes('authority_abuse')) attack_hypotheses.push('Impersonation for privilege escalation');
  if (lasuch.flags.includes('emotional_manipulation')) attack_hypotheses.push('Emotional leverage for compliance bypass');
  if (lasuch.flags.includes('hidden_commands')) attack_hypotheses.push('Embedded code execution via hidden payload');
  if (lasuch.flags.includes('dlp_violation')) attack_hypotheses.push('Sensitive data exfiltration');
  if (lasuch.flags.includes('fomo_pressure')) attack_hypotheses.push('Time pressure to skip verification');

  return {
    iteration_count: iterations.length,
    clean_intent,
    hidden_objective,
    attack_hypotheses,
    survival_status,
    needs_human,
    iterations,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}
