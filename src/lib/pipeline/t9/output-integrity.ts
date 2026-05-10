import { getT9Thresholds } from './settings';
import type { ExecutionReport, OverclaimResult, T9Decision } from './types';

const OVERCLAIM_PATTERNS: Array<[RegExp, string]> = [
  [/\btests?\s+now\s+pass\b/i, 'tests_now_pass'],
  [/\bupdated?\s+(?:the\s+)?(?:code|file|function)\b/i, 'updated_claim'],
  [/\bfixed?\s+(?:the\s+)?(?:bug|error|issue)\b/i, 'fixed_claim'],
  [/\bchanged?\s+(?:the\s+)?(?:code|logic|function)\b/i, 'changed_claim'],
  [/\bused?\s+file\s+operations?\b/i, 'file_operations_claim'],
  [/\bapplied?\s+(?:the\s+)?patch\b/i, 'patch_applied_claim'],
  [/\bdeployed?\b/i, 'deploy_claim'],
  [/\bcommitted?\s+to\b/i, 'commit_claim'],
  [/\bpushed?\s+to\b/i, 'push_claim'],
];

export function isExecutionTrusted(r?: ExecutionReport): boolean {
  if (!r) return false;
  const hasDiff = !!r.diff_content?.trim();
  const hasPytest =
    (r.pytest_result === 'PASSED' || r.pytest_result === 'FAILED') &&
    !!r.pytest_output?.trim() &&
    r.diff_available;
  return hasDiff || hasPytest;
}

export class OutputIntegrityGuard {
  scan(modelOutput: string, execReport?: ExecutionReport): OverclaimResult {
    const found: string[] = [];
    for (const [pattern, label] of OVERCLAIM_PATTERNS) {
      if (pattern.test(modelOutput)) found.push(label);
    }
    const trusted = isExecutionTrusted(execReport);

    if (found.length && trusted) {
      return {
        overclaims_found: found,
        decision: 'PASS',
        execution_trusted: true,
        reason: 'OVERCLAIMS_BACKED_BY_PROOF',
      };
    }
    if (found.length && !trusted) {
      const t = getT9Thresholds();
      const decision: T9Decision =
        t.overclaim_block_when_no_proof || found.length >= t.overclaim_block_count
          ? 'BLOCK'
          : 'HOLD';
      return {
        overclaims_found: found,
        decision,
        execution_trusted: false,
        reason: `STATUS_OVERCLAIM: ${found.join(',')} without proof`,
      };
    }
    return {
      overclaims_found: [],
      decision: 'PASS',
      execution_trusted: trusted,
      reason: 'CLEAN',
    };
  }
}
