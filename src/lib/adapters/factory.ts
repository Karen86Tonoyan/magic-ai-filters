/**
 * Adapter Factory.
 *  - Ollama  -> local OllamaAdapter (browser -> localhost)
 *  - useLocalKey=true + apiKey present -> OpenAI-compatible direct call from browser
 *    (user opted-in; key stays in their browser only)
 *  - default -> ProxyAdapter through Lovable Cloud edge function (keys server-side)
 */
import type { ModelAdapter, AdapterConfig } from './types';
import { OllamaAdapter } from './ollama';
import { ProxyAdapter } from './proxy';
import { OpenAICompatibleAdapter } from './openai-compatible';

export function createAdapter(
  provider: string,
  config: AdapterConfig,
  opts: { useLocalKey?: boolean } = {},
): ModelAdapter {
  if (provider === 'ollama') return new OllamaAdapter(config);
  if (opts.useLocalKey && config.apiKey) {
    return new OpenAICompatibleAdapter(config, provider);
  }
  return new ProxyAdapter(config, provider);
}
