/**
 * Model Adapter Interface
 * Every LLM adapter must implement this
 */
export interface ModelAdapter {
  provider: string;
  modelId: string;
  
  /** Send a chat message and get a response */
  chat(input: string, systemPrompt?: string): Promise<string>;
  
  /** Test connectivity */
  testConnection(): Promise<boolean>;
}

export interface AdapterConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
}
