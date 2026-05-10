import type { T9UnifiedResult } from './types';

const KEY = 'alfa_t9_snapshots_v1';
const MAX = 500;

export interface SnapshotRow {
  id: string;
  timestamp: string;
  user_input: string;
  intent: string;
  predicted_state: string;
  observed_state: string;
  final_decision: string;
  execution_trusted: 0 | 1;
  overclaims: string[];
  filter_decision: string;
  filter_score: number;
}

function load(): SnapshotRow[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function persist(rows: SnapshotRow[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)));
  } catch {
    /* quota */
  }
}

function hashId(input: string, ts: string): string {
  let h = 0;
  const s = `${ts}${input.slice(0, 50)}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 12);
}

export class HallucinationSnapshotDB {
  save(result: T9UnifiedResult): string {
    const id = hashId(result.user_input, result.timestamp);
    const rows = load();
    rows.push({
      id,
      timestamp: result.timestamp,
      user_input: result.user_input.slice(0, 500),
      intent: result.contract.intent,
      predicted_state: result.contract.predicted_state,
      observed_state: result.guard_result.observed_state,
      final_decision: result.final_decision,
      execution_trusted: result.execution_trusted ? 1 : 0,
      overclaims: result.overclaim_result.overclaims_found,
      filter_decision: result.filter_report.decision,
      filter_score: result.filter_report.overall_score,
    });
    persist(rows);
    return id;
  }

  findSimilar(intent: string, state: string, limit = 5): SnapshotRow[] {
    return load()
      .filter((r) => r.intent === intent || r.observed_state === state)
      .slice(-limit)
      .reverse();
  }

  list(): SnapshotRow[] {
    return load().slice().reverse();
  }

  stats() {
    const rows = load();
    const total = rows.length;
    const holds = rows.filter((r) => r.final_decision === 'HOLD').length;
    const blocks = rows.filter((r) => r.final_decision === 'BLOCK').length;
    const trusted = rows.filter((r) => r.execution_trusted === 1).length;
    return {
      total,
      holds,
      blocks,
      trusted,
      pass_rate: total ? Math.round(((total - holds - blocks) / total) * 1000) / 10 : 0,
    };
  }

  clear() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  }
}
