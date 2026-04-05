/**
 * Ollama Adapter — Local LLM
 */
import type { ModelAdapter, AdapterConfig } from './types';

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

    const data = await response.json();
    return data.message?.content || '[No response from Ollama]';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<{ id: string; label: string }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models || []).map((m: any) => ({
        id: m.name,
        label: `${m.name} (${(m.size / 1e9).toFixed(1)}GB)`,
      }));
    } catch {
      return [];
    }
  }
}
