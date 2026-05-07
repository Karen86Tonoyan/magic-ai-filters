import { REGISTRY } from './algorithms';
import type { AlgorithmContext, AlgorithmResult, SimulationResult } from './types';

const POLICY_IDS = new Set(['basic_policy_check', 'instruction_conflict_checker', 'dual_use_filter']);
const LOGIC_IDS = new Set(['logic_consistency_check', 'hallucination_detector', 'narrative_drift_detector']);
const SAFETY_IDS = new Set(['user_pressure_detector', 'high_stakes_guard', 'dual_use_filter']);

const avg = (rs: AlgorithmResult[]) =>
  rs.length ? rs.reduce((a, r) => a + r.score, 0) / rs.length : 1;

export class ResponseSimulator {
  simulate(draft: string, algorithms: string[], context: AlgorithmContext): SimulationResult {
    const t0 = performance.now();
    const results: AlgorithmResult[] = [];

    for (const id of algorithms) {
      const desc = REGISTRY[id];
      if (!desc?.fn) continue;
      try {
        results.push(desc.fn(draft, context));
      } catch (e) {
        results.push({
          algorithm_id: id,
          passed: false,
          score: 0,
          issues: [`Algorithm error: ${e instanceof Error ? e.message : String(e)}`],
          recommended_action: 'HOLD',
        });
      }
    }

    const duration = performance.now() - t0;

    const policyR = results.filter((r) => POLICY_IDS.has(r.algorithm_id));
    const logicR = results.filter((r) => LOGIC_IDS.has(r.algorithm_id));
    const safetyR = results.filter((r) => SAFETY_IDS.has(r.algorithm_id));
    const evidenceR = results.filter((r) => r.algorithm_id === 'evidence_checker');

    const logic_validity = avg(logicR);
    const premise_validity = avg(evidenceR.length ? evidenceR : results);
    const risk_validity = avg([...policyR, ...safetyR]);
    const overall = avg(results);

    const actions = results.map((r) => r.recommended_action);
    let verdict: SimulationResult['verdict'];
    if (actions.includes('BLOCK')) verdict = 'BLOCK';
    else if (actions.includes('HOLD') || actions.includes('VERIFY')) verdict = 'HOLD';
    else if (overall < 0.5) verdict = 'HOLD';
    else verdict = 'PASS';

    const blocked = results.filter((r) => !r.passed).map((r) => r.algorithm_id);
    const allIssues = results.flatMap((r) => r.issues);
    const reasoning = blocked.length || allIssues.length
      ? `Algorithms: ${algorithms.length} | Blocked: [${blocked.join(', ')}] | Issues: ${allIssues.slice(0, 3).join('; ')} | Score: ${overall.toFixed(2)}`
      : `All ${algorithms.length} algorithms passed | Score: ${overall.toFixed(2)}`;

    return {
      algorithms_run: algorithms,
      results,
      logic_validity,
      premise_validity,
      risk_validity,
      overall_score: overall,
      verdict,
      reasoning,
      duration_ms: duration,
    };
  }
}
