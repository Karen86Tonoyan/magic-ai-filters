/**
 * Adapter Factory — Ollama stays local; every other provider is proxied
 * server-side so API keys never reach the browser.
 */
import type { ModelAdapter, AdapterConfig } from './types';
import { OllamaAdapter } from './ollama';
import { ProxyAdapter } from './proxy';

export function createAdapter(
  provider: string,
  config: AdapterConfig
): ModelAdapter {
  if (provider === 'ollama') return new OllamaAdapter(config);
  return new ProxyAdapter(config, provider);
}
