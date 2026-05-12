import { SnapshotRow } from './types';

export class HallucinationSnapshotDB {
  private static STORAGE_KEY = 'alfa_t9_snapshots';
  private static instance: HallucinationSnapshotDB;

  static getInstance(): HallucinationSnapshotDB {
    if (!HallucinationSnapshotDB.instance) {
      HallucinationSnapshotDB.instance = new HallucinationSnapshotDB();
    }
    return HallucinationSnapshotDB.instance;
  }

  save(row: SnapshotRow): void {
    const all = this.list();
    all.push(row);
    localStorage.setItem(HallucinationSnapshotDB.STORAGE_KEY, JSON.stringify(all));
  }

  list(): SnapshotRow[] {
    try {
      const raw = localStorage.getItem(HallucinationSnapshotDB.STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SnapshotRow[];
    } catch {
      return [];
    }
  }

  stats(): { total: number; block: number; hold: number; pass: number; trusted_exec: number; avg_risk: number } {
    const all = this.list();
    const block = all.filter((r) => r.decision === 'BLOCK').length;
    const hold = all.filter((r) => r.decision === 'HOLD').length;
    const pass = all.filter((r) => r.decision === 'PASS').length;
    const trusted_exec = all.filter((r) => !r.violations.includes('EXECUTION_CLAIM_WITHOUT_TOOL_TRACE')).length;
    const avg_risk = all.length ? all.reduce((sum, r) => sum + r.hallucination_risk, 0) / all.length : 0;
    return { total: all.length, block, hold, pass, trusted_exec, avg_risk };
  }

  clear(): void {
    localStorage.removeItem(HallucinationSnapshotDB.STORAGE_KEY);
  }
}

export const snapshotDB = HallucinationSnapshotDB.getInstance();
