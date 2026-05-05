/**
 * Ollama Adapter — Local LLM
 */
import type { ModelAdapter, AdapterConfig } from './types';

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface OllamaTagModel {
  name: string;
  size: number;
}

interface OllamaTagsResponse {
  models?: OllamaTagModel[];
}

export class OllamaAdapter implements ModelAdapter {
  provider = 'ollama';
  modelId: string;
  private baseUrl: string;

  constructor(config: AdapterConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.modelId = config.modelId || 'llama3.2:1b';
  }

  async chat(input: string, systemPrompt?: string): Promise<string> {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input });

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaChatResponse;
    return data.message?.content || '[No response from Ollama]';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      return response.ok;
    } catch (e) {
      // Mixed-content (https preview -> http://localhost) or CORS blocks fetch
      // Throw so UI can surface a helpful hint instead of silent false
      throw new Error(
        `Nie mozna polaczyc z ${this.baseUrl}. Mozliwe przyczyny: (1) Ollama nie dziala (uruchom 'ollama serve'). (2) Mixed-content: preview HTTPS blokuje HTTP localhost — otworz strone przez http://localhost lub uruchom Ollama z OLLAMA_ORIGINS='*' OLLAMA_HOST=0.0.0.0. (3) CORS — ustaw OLLAMA_ORIGINS=*. Blad: ${(e as Error)?.message || e}`
      );
    }
  }

  async listModels(): Promise<{ id: string; label: string }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json() as OllamaTagsResponse;
      return (data.models || []).map((m) => ({
        id: m.name,
        label: `${m.name} (${(m.size / 1e9).toFixed(1)}GB)`,
      }));
    } catch {
      return [];
    }
  }
}
