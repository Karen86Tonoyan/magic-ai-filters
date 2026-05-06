import type { T9UnifiedResult } from './types';

const DECISION_STYLE: Record<string, string> = {
  PASS: 'fill:#2d6a2d,color:#fff',
  HOLD: 'fill:#8b6914,color:#fff',
  VERIFY: 'fill:#1a4a8b,color:#fff',
  BLOCK: 'fill:#8b1a1a,color:#fff',
};

const FILTER_STYLE: Record<string, string> = {
  PASS: 'fill:#1a5c1a,color:#fff',
  WARN: 'fill:#7a5c00,color:#fff',
  BLOCK: 'fill:#7a1a1a,color:#fff',
};

export function buildGraph(result: T9UnifiedResult): string {
  const predicted = result.contract.predicted_state;
  const observed = result.guard_result.observed_state;
  const g_dec = result.guard_result.decision;
  const o_dec = result.overclaim_result.decision;
  const f_dec = result.filter_report.decision;
  const f_score = result.filter_report.overall_score;
  const e_status = result.exec_report?.status ?? 'NO_REPORT';
  const e_trusted = result.execution_trusted ? 'trusted' : 'NOT_TRUSTED';
  const final = result.final_decision;

  return [
    'graph TD',
    '    A["User Input"] --> B["T9 Predictor"]',
    `    B --> C["Contract: ${predicted}"]`,
    '    C --> D["LLM generates"]',
    `    D --> E["Observed: ${observed}"]`,
    '    E --> F["TrajectoryGuard"]',
    `    F --> G["${g_dec}"]`,
    '    G --> H["OutputIntegrityGuard"]',
    `    H --> I["${o_dec}"]`,
    `    I --> J["FiltrTonoyana score=${f_score}"]`,
    `    J --> K["${f_dec}"]`,
    `    K --> L["ExecReport: ${e_status} / ${e_trusted}"]`,
    `    L --> M["${final}"]`,
    `    style G ${DECISION_STYLE[g_dec] || ''}`,
    `    style I ${DECISION_STYLE[o_dec] || ''}`,
    `    style K ${FILTER_STYLE[f_dec] || ''}`,
    `    style M ${DECISION_STYLE[final] || ''}`,
  ].join('\n');
}
