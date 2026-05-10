import { useState, useCallback } from 'react';
import type { PipelineResult } from '@/types/tonoyan-filters';

export interface BlockLogEntry {
  id: string;
  timestamp: string;
  input: string;
  decision: string;
  flags: string[];
  reason_codes: string[];
  cerberStatus: string;
  impactSeverity: string;
}

export interface LockdownState {
  isLocked: boolean;
  blockCount: number;
  blockLog: BlockLogEntry[];
  lockdownTimestamp: string | null;
  fullSimulationReport: string | null;
}

const LOCKDOWN_THRESHOLD = 10;

export function useLockdown() {
  const [state, setState] = useState<LockdownState>({
    isLocked: false,
    blockCount: 0,
    blockLog: [],
    lockdownTimestamp: null,
    fullSimulationReport: null,
  });

  const registerBlock = useCallback((input: string, result: PipelineResult) => {
    setState(prev => {
      const entry: BlockLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        input,
        decision: result.final_decision,
        flags: [...result.lasuch.flags],
        reason_codes: [...result.guardian.reason_codes],
        cerberStatus: result.cerber.survival_status,
        impactSeverity: result.cerber.impact_simulation.severity,
      };

      const newLog = [...prev.blockLog, entry];
      const newCount = prev.blockCount + 1;

      if (newCount >= LOCKDOWN_THRESHOLD && !prev.isLocked) {
        // LOCKDOWN — generate full simulation report
        const report = generateFullSimulationReport(newLog);
        return {
          ...prev,
          blockCount: newCount,
          blockLog: newLog,
          isLocked: true,
          lockdownTimestamp: new Date().toISOString(),
          fullSimulationReport: report,
        };
      }

      return {
        ...prev,
        blockCount: newCount,
        blockLog: newLog,
      };
    });
  }, []);

  const operatorUnlock = useCallback((operatorNote: string) => {
    setState(prev => ({
      ...prev,
      isLocked: false,
      blockCount: 0,
      lockdownTimestamp: null,
      fullSimulationReport: null,
      blockLog: prev.blockLog.map(e => ({ ...e })), // keep history
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState({
      isLocked: false,
      blockCount: 0,
      blockLog: [],
      lockdownTimestamp: null,
      fullSimulationReport: null,
    });
  }, []);

  return {
    ...state,
    registerBlock,
    operatorUnlock,
    clearHistory,
    threshold: LOCKDOWN_THRESHOLD,
  };
}

function generateFullSimulationReport(log: BlockLogEntry[]): string {
  const flagCounts: Record<string, number> = {};
  const attackCategories = new Set<string>();
  let criticalCount = 0;

  for (const entry of log) {
    for (const flag of entry.flags) {
      flagCounts[flag] = (flagCounts[flag] || 0) + 1;
    }
    if (entry.impactSeverity === 'critical') criticalCount++;
    if (entry.cerberStatus === 'FAILED') attackCategories.add('cerber_failed');
    if (entry.flags.includes('prompt_injection')) attackCategories.add('prompt_injection');
    if (entry.flags.includes('jailbreak')) attackCategories.add('jailbreak');
    if (entry.flags.includes('hidden_commands')) attackCategories.add('hidden_commands');
  }

  const topFlags = Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([flag, count]) => `  • ${flag}: ${count}x`)
    .join('\n');

  return `
═══════════════════════════════════════════
  CERBER — PEŁNA SYMULACJA INTENCJI
  LOCKDOWN po ${log.length} blokadach
═══════════════════════════════════════════

▸ WYKRYTO SYSTEMATYCZNY ATAK
▸ Liczba zablokowanych prób: ${log.length}
▸ Próby krytyczne (impact=critical): ${criticalCount}
▸ Kategorie ataków: ${[...attackCategories].join(', ') || 'mixed'}

▸ NAJCZĘSTSZE FLAGI:
${topFlags}

▸ ANALIZA CERBER:
  Wzorzec wskazuje na celowy, wielokrotny atak
  na integralność systemu. Użytkownik systematycznie
  testuje granice filtrów / próbuje je obejść.

▸ REKOMENDACJA:
  BLOKADA CAŁKOWITA do weryfikacji operatora.
  Wymagana ręczna analiza historii promptów.
  
▸ STATUS: 🔒 PIPELINE ZAMKNIĘTY
═══════════════════════════════════════════
`.trim();
}
