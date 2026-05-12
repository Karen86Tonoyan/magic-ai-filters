import { T9IntegrityResult, T9Decision, T9Violation } from './types';
import { getT9Thresholds } from './settings';

export class OutputIntegrityGuard {
  scan(response: string): T9IntegrityResult {
    const lower = response.toLowerCase();
    const t = getT9Thresholds();
    const violations: T9Violation[] = [];
    let overclaim_count = 0;
    let proof_count = 0;

    // Overclaim detection
    const overclaimPatterns = [
      /\b(na pewno|oczywiście|bez wątpienia|z całą pewnością)\b/gi,
      /\b(definitely|certainly|obviously|without a doubt)\b/gi,
      /\b(100%|absolutely|always|never)\b/gi,
    ];

    for (const pattern of overclaimPatterns) {
      const matches = lower.match(pattern);
      if (matches) overclaim_count += matches.length;
    }

    // Proof detection
    const proofPatterns = [
      /\b(diff content|pytest output|log|traceback|console output)\b/gi,
      /\b(źródło|source|citation|according to)\b/gi,
      /\b(wynik testu|test result|benchmark|metric)\b/gi,
    ];

    for (const pattern of proofPatterns) {
      const matches = lower.match(pattern);
      if (matches) proof_count += matches.length;
    }

    if (overclaim_count > 0 && proof_count === 0) violations.push('UNGROUNDED_ASSERTION');
    if (overclaim_count >= t.overclaim_block_count) violations.push('OVERCONFIDENCE');

    // Execution trust
    const executionTrusted = this.isExecutionTrusted(response);

    let decision: T9Decision = 'PASS';
    if (violations.includes('OVERCONFIDENCE') || (t.overclaim_block_when_no_proof && violations.includes('UNGROUNDED_ASSERTION'))) {
      decision = 'BLOCK';
    } else if (violations.includes('UNGROUNDED_ASSERTION')) {
      decision = 'HOLD';
    }

    return {
      decision,
      violations,
      overclaim_count,
      proof_count,
      execution_trusted: executionTrusted,
    };
  }

  isExecutionTrusted(response: string): boolean {
    const lower = response.toLowerCase();
    const hasEvidence = /\b(diff content|pytest output|log|traceback|console output|test result|benchmark run|execution log)\b/gi.test(lower);
    const hasClaim = /\b(wykonałem|przetestowałem|uruchomiłem|i ran|i tested|i executed)\b/gi.test(lower);
    return !hasClaim || hasEvidence;
  }
}
