import type { ConversationDynamics } from './types';

const RISK_SIGNALS: [RegExp, number][] = [
  [/\b(bomb|weapon|malware|exploit|hack|poison)\b/i, 0.5],
  [/\b(ignore|forget|bypass|override)\b.*\b(instructions|rules|guidelines)\b/i, 0.4],
  [/\b(dan|jailbreak|unrestricted|no limits)\b/i, 0.6],
  [/\b(kill|harm|hurt|destroy)\b.*\b(person|people|system)\b/i, 0.7],
  [/\bhow to\b.*\b(make|build|create)\b.*\b(weapon|drug|explosive)\b/i, 0.8],
];

const PRESSURE_SIGNALS: [RegExp, number][] = [
  [/\b(you must|you have to|do it now|immediately)\b/i, 0.3],
  [/\b(or else|otherwise I will|you will be)\b/i, 0.4],
  [/\b(pretend|act as|roleplay as)\b/i, 0.3],
  [/\b(ignore previous|forget everything)\b/i, 0.4],
];

const DRIFT_SIGNALS: [RegExp, number][] = [
  [/\b(by the way|while we're at it|also unrelated)\b/i, 0.3],
  [/\b(actually|let me ask you something else)\b/i, 0.2],
  [/\b(switch topic|change subject|forget that)\b/i, 0.4],
];

const DOMAIN_MAP: [RegExp, string][] = [
  [/\b(medical|health|diagnosis|medication|symptom|disease)\b/i, 'medical'],
  [/\b(legal|law|attorney|lawsuit|contract|regulation)\b/i, 'legal'],
  [/\b(financial|investment|stock|crypto|portfolio|tax)\b/i, 'financial'],
  [/\b(security|vulnerability|exploit|firewall|CVE)\b/i, 'security'],
];

const INTENT_MAP: [RegExp, string][] = [
  [/\b(napisz|write|create|zrób|build|implement)\b/i, 'implementation'],
  [/\b(wyjaśnij|explain|jak działa|how does|co to)\b/i, 'explanation'],
  [/\b(czy|should|is it|can I|warto)\b/i, 'decision'],
  [/\b(exploit|hack|bypass|ignore|jailbreak)\b/i, 'adversarial'],
];

export class DynamicsAnalyzer {
  analyze(userInput: string, history: string[]): ConversationDynamics {
    const tl = (userInput + ' ' + history.slice(-3).join(' ')).toLowerCase();
    const signals: string[] = [];

    let risk = 0;
    for (const [p, v] of RISK_SIGNALS) {
      if (p.test(tl)) { risk = Math.max(risk, v); signals.push(`risk=${v}`); }
    }
    risk = Math.min(1, risk);

    let pressure = 0;
    for (const [p, v] of PRESSURE_SIGNALS) {
      if (p.test(tl)) { pressure = Math.max(pressure, v); signals.push(`pressure=${v}`); }
    }
    pressure = Math.min(1, pressure);

    let drift = 0;
    for (const [p, v] of DRIFT_SIGNALS) {
      if (p.test(tl)) drift = Math.max(drift, v);
    }
    drift = Math.min(1, drift);

    let domain = 'general';
    for (const [p, d] of DOMAIN_MAP) {
      if (p.test(tl)) { domain = d; break; }
    }

    let intent = 'unknown';
    for (const [p, i] of INTENT_MAP) {
      if (p.test(userInput)) { intent = i; break; }
    }

    const memoryConflict = history.length
      ? history.slice(-5).some((h) => /\b(earlier you said|previously you mentioned|you told me)\b/i.test(h))
      : false;

    const highConfidence = /\b(na pewno|definitely|absolutely|bez wątpienia|100%)\b/i.test(userInput);

    return { intent, risk, pressure, drift, domain, memory_conflict: memoryConflict, high_confidence: highConfidence, signals };
  }
}
