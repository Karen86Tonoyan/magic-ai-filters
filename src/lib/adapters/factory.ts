/**
 * Adapter Factory — creates the right adapter based on provider type
 */
import type { ModelAdapter, AdapterConfig } from './types';
import { OllamaAdapter } from './ollama';
import { OpenAICompatibleAdapter } from './openai-compatible';

export function createAdapter(
  provider: string,
  config: AdapterConfig
): ModelAdapter {
  switch (provider) {
    case 'ollama':
      return new OllamaAdapter(config);
    case 'openai':
    case 'openrouter':
    case 'groq':
    case 'mistral':
      return new OpenAICompatibleAdapter(config, provider);
    case 'anthropic':
      // Anthropic uses a different API format, but OpenRouter can proxy it
      return new OpenAICompatibleAdapter(config, 'anthropic');
    case 'google':
      // Google uses OpenAI-compatible format via their newer API
      return new OpenAICompatibleAdapter(config, 'google');
    default:
      return new OpenAICompatibleAdapter(config, provider);
  }
}
