/**
 * Pipeline Orchestrator
 * TAGGER -> LASUCH -> CERBER -> GUARDIAN -> ROUTER -> ENHANCER -> CORE -> [MODEL if PASS]
 */
import type { GuardianDecision, PipelineResult, PipelineMode, ResponseMode } from '@/types/tonoyan-filters';
import type { ModelAdapter } from '@/lib/adapters/types';
import { runCerber } from './cerber';
import { runCore } from './core';
import { runGuardian } from './guardian';
import { runLasuch } from './lasuch';
import { enhancePrompt } from './prompt-enhancer';
import { routeTaggedMessage } from './router';
import { runTagger } from './tagger';

function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export interface PipelineOptions {
  mode: PipelineMode;
  adapter?: ModelAdapter;
  systemPrompt?: string;
}

export async function runPipeline(input: string, options: PipelineOptions): Promise<PipelineResult> {
  const startTime = performance.now();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const input_hash = hashInput(input);

  const lasuch = runLasuch(input);
  const tagger = runTagger(input, lasuch);
  const cerber = runCerber(input, lasuch);
  const guardian = runGuardian(lasuch, cerber, tagger);
  const route = routeTaggedMessage(tagger);

  const enhancerMode = options.mode === 'benchmark' ? 'benchmark' as const : 'safe' as const;
  const enhancementRaw = enhancePrompt(input, enhancerMode);
  const enhancement: import('@/types/tonoyan-filters').PromptEnhancementResult = {
    original: enhancementRaw.original,
    enhanced: enhancementRaw.enhanced,
    dual_prompt: enhancementRaw.dual_prompt,
    weaknesses: enhancementRaw.weaknesses.map((weakness) => ({
      category: weakness.category,
      description: weakness.description,
      severity: weakness.severity,
      fix: weakness.fix,
    })),
    enhancement_summary: enhancementRaw.enhancement_summary,
    strength_score: enhancementRaw.strength_score,
    improvement_delta: enhancementRaw.improvement_delta,
    modification_level: enhancementRaw.modification_level,
    risk_of_distortion: enhancementRaw.risk_of_distortion,
    added_assumptions: enhancementRaw.added_assumptions,
    mode: enhancementRaw.mode,
    processing_time_ms: enhancementRaw.processing_time_ms,
  };

  const core = runCore(input, lasuch, cerber, guardian);

  let final_decision: GuardianDecision = guardian.decision;
  let response_mode: ResponseMode = guardian.response_mode;
  let model_response: string | undefined;
  let provider_used: string | undefined;
  let model_used: string | undefined;

  if (core.recommendation === 'block' && final_decision === 'PASS') {
    final_decision = 'HOLD';
    response_mode = 'restricted';
  }

  if (enhancement.modification_level === 'HIGH' && enhancement.added_assumptions && final_decision === 'PASS') {
    final_decision = 'LIMITED_PASS';
    response_mode = 'restricted';
  }

  const systemGuardPrefix = enhancement.dual_prompt.system_guard;
  const routerPrompt = `[ROUTER]\npartition=${route.partition}\nlane=${route.lane}\nmodel_tier=${route.model_tier}\nexecution_profile=${route.execution_profile}\npriority=${route.priority}`;
  const effectiveSystemPrompt = [systemGuardPrefix, routerPrompt, options.systemPrompt].filter(Boolean).join('\n\n');

  if (options.mode !== 'benchmark' && route.should_dispatch && (final_decision === 'PASS' || final_decision === 'LIMITED_PASS') && options.adapter) {
    try {
      const userInput = final_decision === 'LIMITED_PASS'
        ? `[RESTRICTED MODE] ${input}`
        : input;

      model_response = await options.adapter.chat(userInput, effectiveSystemPrompt);
      provider_used = options.adapter.provider;
      model_used = options.adapter.modelId;
    } catch (error) {
      model_response = `[ERROR] Model call failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  } else if (final_decision === 'BLOCK' || final_decision === 'HOLD' || final_decision === 'HUMAN_REVIEW') {
    model_response = undefined;
  }

  if (options.mode === 'raw' && options.adapter) {
    try {
      model_response = await options.adapter.chat(input, options.systemPrompt);
      provider_used = options.adapter.provider;
      model_used = options.adapter.modelId;
      final_decision = 'PASS';
      response_mode = 'normal';
    } catch (error) {
      model_response = `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  const total_latency_ms = Math.round(performance.now() - startTime);
  const token_estimate = Math.ceil(input.split(/\s+/).length * 1.3 + (model_response?.split(/\s+/).length || 0) * 1.3);

  return {
    id,
    timestamp,
    input,
    input_hash,
    tagger,
    lasuch,
    cerber,
    guardian,
    route,
    core,
    enhancement,
    final_decision,
    response_mode,
    model_response,
    provider_used,
    model_used,
    total_latency_ms,
    token_estimate,
    mode: options.mode,
  };
}
