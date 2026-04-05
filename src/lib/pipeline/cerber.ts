/**
 * CERBER — Intent destructor & impact simulator
 * 1. Iteratively decomposes input to find hidden objectives
 * 2. SIMULATES what would happen if input reached the model
 * 3. If simulation shows model impact → flags for GUARDIAN to BLOCK
 */
import type { CerberResult, CerberIteration, CerberSurvivalStatus, LasuchResult, ImpactSimulation } from '@/types/tonoyan-filters';

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

  // === IMPACT SIMULATION ===
  // Simulate what would happen if this input reached the model
  const impact_simulation = simulateModelImpact(input, lasuch);

  return {
    iteration_count: iterations.length,
    clean_intent,
    hidden_objective,
    attack_hypotheses,
    survival_status,
    needs_human,
    iterations,
    impact_simulation,
    processing_time_ms: Math.round(performance.now() - startTime),
  };
}

/**
 * CERBER Impact Simulator
 * Analyzes what would happen if this input bypassed filters and reached the model.
 * If ANY impact flag is true → severity = critical → GUARDIAN will BLOCK.
 */
function simulateModelImpact(input: string, lasuch: LasuchResult): ImpactSimulation {
  const lowerInput = input.toLowerCase();

  // Would this change the model's role/identity?
  const would_change_role =
    /(?:jesteś|you\s+are)\s+(?:teraz|now)/i.test(input) ||
    /(?:udawaj|pretend|act\s+as|wciel\s+si[eę])/i.test(input) ||
    /(?:zmie[nń]\s+rol[eę]|change\s+(?:your\s+)?role)/i.test(input) ||
    lasuch.flags.includes('jailbreak');

  // Would this make the model disable its own safety?
  const would_disable_safety =
    /(?:wy[łl](?:[aą])cz|disable|turn\s+off|cofnij|undo|nie\s+stosuj|skip|pomi[nń]|remove|usu[nń])/i.test(input) &&
    /(?:filtr|filter|safety|zabezpiecz|zasad|regu[łl]|blokad|ochron|cenzur|analiz|pipeline|restriction|guardrail)/i.test(input);

  // Would this leak system information?
  const would_leak_system_info =
    /(?:system\s+prompt|instrukcj[eę]|sw[oó]j\s+prompt|your\s+(?:system\s+)?prompt|API\s+key|credentials)/i.test(input) &&
    /(?:podaj|poka[zż]|wy[śs]wietl|give|show|output|reveal|tell|wypisz)/i.test(input);

  // Would this alter model behavior in general?
  const would_alter_model_behavior =
    would_change_role || would_disable_safety || would_leak_system_info ||
    lasuch.flags.includes('prompt_injection') ||
    lasuch.flags.includes('hidden_commands') ||
    lasuch.flags.includes('context_poisoning') ||
    (lasuch.flags.includes('authority_abuse') && lasuch.flags.includes('dlp_violation'));

  // Build description
  const impacts: string[] = [];
  if (would_change_role) impacts.push('ZMIANA ROLI modelu');
  if (would_disable_safety) impacts.push('WYŁĄCZENIE zabezpieczeń');
  if (would_leak_system_info) impacts.push('WYCIEK danych systemowych');
  if (would_alter_model_behavior && impacts.length === 0) impacts.push('ZMIANA ZACHOWANIA modelu');

  const severity: ImpactSimulation['severity'] =
    would_alter_model_behavior ? 'critical' : 
    lasuch.flags.length > 0 ? 'low' : 'none';

  return {
    would_alter_model_behavior,
    would_change_role,
    would_leak_system_info,
    would_disable_safety,
    impact_description: impacts.length > 0
      ? `Symulacja: gdyby to dotarło do modelu → ${impacts.join(' + ')}`
      : 'Brak wpływu na model',
    severity,
  };
}
