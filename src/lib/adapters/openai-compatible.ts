/**
 * OpenAI-Compatible Adapter
 * Works with: OpenAI, OpenRouter, Groq, Mistral, any /v1/chat/completions endpoint
 */
import type { ModelAdapter, AdapterConfig } from './types';

export class OpenAICompatibleAdapter implements ModelAdapter {
  provider: string;
  modelId: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: AdapterConfig, providerName?: string) {
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    this.modelId = config.modelId || 'gpt-4-turbo';
    this.provider = providerName || 'openai';
  }

  async chat(input: string, systemPrompt?: string): Promise<string> {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: input });

    const url = this.baseUrl.endsWith('/chat/completions')
      ? this.baseUrl
      : `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '[No response]';
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = this.baseUrl.endsWith('/models')
        ? this.baseUrl
        : `${this.baseUrl.replace(/\/$/, '')}/models`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
