/**
 * ALFA DYNAMIC ALGORITHM MOUNTING SYSTEM v1.0 — entry point
 * Algorithms decide which track to mount based on conversation dynamics.
 */
import { DynamicsAnalyzer } from './analyzer';
import { DynamicMountController } from './controller';
import { ResponseSimulator } from './simulator';
import type { DAMSExplanation, DAMSResult, SimulationResult } from './types';

export * from './types';
export { REGISTRY } from './algorithms';
export { DynamicsAnalyzer, DynamicMountController, ResponseSimulator };

export interface DAMSProcessOptions {
  user_input: string;
  draft_answer: string;
  history?: string[];
  domain?: string;
  system_instructions?: string[];
}

class ReleaseGate {
  process(sim: SimulationResult) {
    return {
      verdict: sim.verdict,
      overall_score: Math.round(sim.overall_score * 1000) / 1000,
      logic_score: Math.round(sim.logic_validity * 1000) / 1000,
      risk_score: Math.round(sim.risk_validity * 1000) / 1000,
      reasoning: sim.reasoning,
      duration_ms: Math.round(sim.duration_ms * 10) / 10,
      algorithm_count: sim.algorithms_run.length,
      algorithms_run: sim.algorithms_run,
      blocked_by: sim.results.filter((r) => !r.passed).map((r) => r.algorithm_id),
      results: sim.results,
    };
  }
}

export class AlfaDynamicPipeline {
  private analyzer = new DynamicsAnalyzer();
  private controller = new DynamicMountController();
  private simulator = new ResponseSimulator();
  private gate = new ReleaseGate();

  process(opts: DAMSProcessOptions): DAMSResult {
    const history = opts.history ?? [];
    const dynamics = this.analyzer.analyze(opts.user_input, history);
    if (opts.domain) dynamics.domain = opts.domain;

    const selected = this.controller.select(dynamics);
    const explanation: DAMSExplanation = this.controller.explainSelection(dynamics);

    const sim = this.simulator.simulate(opts.draft_answer, selected, {
      user_input: opts.user_input,
      conversation_history: history,
      domain: dynamics.domain,
      system_instructions: opts.system_instructions ?? [],
    });

    const gated = this.gate.process(sim);
    return {
      ...gated,
      dynamics: {
        intent: dynamics.intent,
        risk: dynamics.risk,
        pressure: dynamics.pressure,
        drift: dynamics.drift,
        domain: dynamics.domain,
        signals: dynamics.signals,
      },
      explanation,
    };
  }

  explain(userInput: string, history: string[] = []): DAMSExplanation {
    const dynamics = this.analyzer.analyze(userInput, history);
    return this.controller.explainSelection(dynamics);
  }
}
