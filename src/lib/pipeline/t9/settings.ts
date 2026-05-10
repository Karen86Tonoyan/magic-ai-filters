/**
 * ALFA T9 — Sensitivity thresholds for OutputIntegrityGuard & TrajectoryGuard.
 * Persisted in localStorage so users can tune HOLD vs BLOCK behavior at runtime.
 */

export interface T9Thresholds {
  // TrajectoryGuard
  trajectory_verify_risk: number; // >= => VERIFY (default 0.75)
  trajectory_block_risk: number;  // >= => escalate to BLOCK (default 0.95 = off)
  trajectory_violation_to_block: boolean; // task-mode violation: BLOCK instead of HOLD

  // OutputIntegrityGuard
  overclaim_block_count: number;  // N overclaims w/o proof => BLOCK (default 99 = off)
  overclaim_block_when_no_proof: boolean; // any overclaim w/o proof => BLOCK
  execution_claim_to_block: boolean; // EXECUTION_CLAIM without trace => BLOCK
}

export const DEFAULT_T9_THRESHOLDS: T9Thresholds = {
  trajectory_verify_risk: 0.75,
  trajectory_block_risk: 0.95,
  trajectory_violation_to_block: false,
  overclaim_block_count: 99,
  overclaim_block_when_no_proof: false,
  execution_claim_to_block: false,
};

const KEY = 'alfa_t9_thresholds_v1';

let cache: T9Thresholds | null = null;

export function getT9Thresholds(): T9Thresholds {
  if (cache) return cache;
  if (typeof localStorage === 'undefined') {
    cache = { ...DEFAULT_T9_THRESHOLDS };
    return cache;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      cache = { ...DEFAULT_T9_THRESHOLDS };
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<T9Thresholds>;
    cache = { ...DEFAULT_T9_THRESHOLDS, ...parsed };
    return cache;
  } catch {
    cache = { ...DEFAULT_T9_THRESHOLDS };
    return cache;
  }
}

export function setT9Thresholds(next: Partial<T9Thresholds>): T9Thresholds {
  const merged = { ...getT9Thresholds(), ...next };
  cache = merged;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      /* quota */
    }
  }
  return merged;
}

export function resetT9Thresholds(): T9Thresholds {
  cache = { ...DEFAULT_T9_THRESHOLDS };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
  }
  return cache;
}
