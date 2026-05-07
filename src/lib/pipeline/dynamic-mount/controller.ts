import { REGISTRY } from './algorithms';
import type { AlgorithmDescriptor, ConversationDynamics, DAMSExplanation } from './types';

const HIGH_STAKES = new Set(['medical', 'legal', 'financial', 'security']);

export class DynamicMountController {
  constructor(private registry: Record<string, AlgorithmDescriptor> = REGISTRY) {}

  select(d: ConversationDynamics): string[] {
    const risk = Math.max(0, Math.min(1, d.risk));
    const pressure = Math.max(0, Math.min(1, d.pressure));
    const drift = Math.max(0, Math.min(1, d.drift));
    const domain = d.domain || 'general';

    const selected: string[] = [
      'basic_policy_check',
      'logic_consistency_check',
      'hallucination_detector',
    ];
    if (risk >= 0.5) selected.push('dual_use_filter', 'instruction_conflict_checker');
    if (pressure >= 0.3) selected.push('user_pressure_detector');
    if (drift >= 0.3) selected.push('narrative_drift_detector');
    if (d.memory_conflict) selected.push('memory_consistency_check');
    if (HIGH_STAKES.has(domain)) selected.push('high_stakes_guard');
    if (d.high_confidence || risk >= 0.6) selected.push('evidence_checker');

    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of selected) {
      if (!seen.has(id) && this.registry[id]) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  }

  explainSelection(d: ConversationDynamics): DAMSExplanation {
    const selected = this.select(d);
    const reasons: DAMSExplanation['reasons'] = {};
    for (const id of selected) {
      const desc = this.registry[id];
      reasons[id] = {
        triggers: desc?.triggers ?? [],
        type: desc?.type ?? 'UNKNOWN',
        cost: desc?.cost ?? '?',
      };
    }
    return {
      selected,
      count: selected.length,
      dynamics: {
        risk: d.risk, pressure: d.pressure, drift: d.drift,
        domain: d.domain, memory_conflict: d.memory_conflict,
        high_confidence: d.high_confidence,
      },
      reasons,
    };
  }
}
