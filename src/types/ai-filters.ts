export type AIProvider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'mistral' | 'groq' | 'custom';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  modelId: string;
  isActive: boolean;
  createdAt: string;
}

export type FilterType = 'system_prompt' | 'input_transform' | 'output_filter' | 'permission_rule';

export interface Filter {
  id: string;
  name: string;
  type: FilterType;
  description: string;
  content: string; // The actual prompt/rule/transform code
  isActive: boolean;
  priority: number; // Order in chain
  createdAt: string;
}

export interface FilterChain {
  id: string;
  name: string;
  description: string;
  filterIds: string[];
  assignedModelIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelId?: string;
  filtersApplied?: string[];
}

export interface ChatSession {
  id: string;
  modelId: string;
  chainId?: string;
  messages: ChatMessage[];
  createdAt: string;
}

export const PROVIDER_INFO: Record<AIProvider, { label: string; color: string; defaultUrl: string }> = {
  openai: { label: 'OpenAI', color: 'hsl(170 80% 50%)', defaultUrl: 'https://api.openai.com/v1' },
  anthropic: { label: 'Anthropic', color: 'hsl(280 70% 60%)', defaultUrl: 'https://api.anthropic.com' },
  google: { label: 'Google AI', color: 'hsl(210 80% 55%)', defaultUrl: 'https://generativelanguage.googleapis.com' },
  ollama: { label: 'Ollama', color: 'hsl(145 70% 45%)', defaultUrl: 'http://localhost:11434' },
  mistral: { label: 'Mistral', color: 'hsl(38 92% 50%)', defaultUrl: 'https://api.mistral.ai/v1' },
  groq: { label: 'Groq', color: 'hsl(0 72% 55%)', defaultUrl: 'https://api.groq.com/openai/v1' },
  custom: { label: 'Custom', color: 'hsl(215 15% 55%)', defaultUrl: '' },
};

export const FILTER_TYPE_INFO: Record<FilterType, { label: string; icon: string; description: string }> = {
  system_prompt: { label: 'System Prompt', icon: '💬', description: 'Instrukcje systemowe dodawane do każdego zapytania' },
  input_transform: { label: 'Transformacja Input', icon: '🔄', description: 'Przetwarzanie wiadomości użytkownika przed wysłaniem' },
  output_filter: { label: 'Filtr Output', icon: '🛡️', description: 'Moderacja i przetwarzanie odpowiedzi AI' },
  permission_rule: { label: 'Reguła Uprawnień', icon: '🔒', description: 'Kontrola dostępu i ograniczenia per wiadomość' },
};
