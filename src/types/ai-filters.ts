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

// Filter execution phase - CRITICAL: pre_model filters run BEFORE the model and cannot be influenced by AI
export type FilterPhase = 'pre_model' | 'post_model';

export type FilterType =
  | 'context_gate'       // Blocks if no verified source context (NOWA Logika)
  | 'confidence_gate'    // Blocks if confidence below threshold
  | 'dlp_scanner'        // Data Loss Prevention - blocks sensitive data
  | 'permission_rule'    // Access control per message
  | 'input_transform'    // Transform input before model
  | 'system_prompt'      // System instructions for model
  | 'output_filter'      // Filter/moderate output after model
  | 'output_transform';  // Transform output after model

export interface Filter {
  id: string;
  name: string;
  type: FilterType;
  phase: FilterPhase;
  description: string;
  content: string;
  config: FilterConfig;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface FilterConfig {
  // Context Gate
  requireSources?: boolean;
  minSources?: number;
  // Confidence Gate
  confidenceThreshold?: number; // 0.0-1.0
  // DLP Scanner
  blockedPatterns?: string[];   // regex patterns
  blockPII?: boolean;
  blockCredentials?: boolean;
  // Permission Rule
  maxTokens?: number;
  allowedTopics?: string[];
  blockedTopics?: string[];
  // General
  failAction?: 'block' | 'warn' | 'log';
  customMessage?: string;
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
  role: 'user' | 'assistant' | 'system' | 'filter';
  content: string;
  timestamp: string;
  modelId?: string;
  filtersApplied?: string[];
  blocked?: boolean;
  blockedBy?: string;
  filterLogs?: FilterLog[];
}

export interface FilterLog {
  filterId: string;
  filterName: string;
  phase: FilterPhase;
  action: 'pass' | 'block' | 'warn' | 'transform';
  reason?: string;
  timestamp: string;
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

export const FILTER_TYPE_INFO: Record<FilterType, {
  label: string;
  icon: string;
  description: string;
  phase: FilterPhase;
  category: 'security' | 'transform' | 'control';
}> = {
  context_gate: {
    label: 'Context Gate',
    icon: '🚧',
    description: 'Blokuje odpowiedź gdy brak zweryfikowanych źródeł. Model NIE zobaczy zapytania.',
    phase: 'pre_model',
    category: 'security',
  },
  confidence_gate: {
    label: 'Confidence Gate',
    icon: '📊',
    description: 'Blokuje gdy pewność kontekstu poniżej progu. Architekturalna kontrola.',
    phase: 'pre_model',
    category: 'security',
  },
  dlp_scanner: {
    label: 'DLP Scanner',
    icon: '🔐',
    description: 'Skanuje wiadomość pod kątem wrażliwych danych (PII, hasła, klucze API). Blokuje PRZED modelem.',
    phase: 'pre_model',
    category: 'security',
  },
  permission_rule: {
    label: 'Reguła Uprawnień',
    icon: '🛡️',
    description: 'Kontrola dostępu per wiadomość. Model nie może nadpisać tych reguł.',
    phase: 'pre_model',
    category: 'control',
  },
  input_transform: {
    label: 'Transformacja Input',
    icon: '🔄',
    description: 'Przetwarza wiadomość przed wysłaniem do modelu (anonimizacja, formatowanie).',
    phase: 'pre_model',
    category: 'transform',
  },
  system_prompt: {
    label: 'System Prompt',
    icon: '💬',
    description: 'Instrukcje systemowe dodawane do kontekstu modelu.',
    phase: 'pre_model',
    category: 'control',
  },
  output_filter: {
    label: 'Filtr Output',
    icon: '🔍',
    description: 'Moderacja odpowiedzi AI — cenzura, walidacja, sprawdzanie halucynacji.',
    phase: 'post_model',
    category: 'security',
  },
  output_transform: {
    label: 'Transformacja Output',
    icon: '✨',
    description: 'Przetwarzanie odpowiedzi (formatowanie, tłumaczenie, wzbogacanie).',
    phase: 'post_model',
    category: 'transform',
  },
};

// Default DLP patterns from NOWA Logika
export const DEFAULT_DLP_PATTERNS = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
  { label: 'Telefon PL', pattern: '(?:\\+48)?\\s?\\d{3}[\\s-]?\\d{3}[\\s-]?\\d{3}' },
  { label: 'PESEL', pattern: '\\d{11}' },
  { label: 'Karta kredytowa', pattern: '\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}' },
  { label: 'API Key', pattern: '(sk|pk|api)[_-][a-zA-Z0-9]{20,}' },
  { label: 'Hasło w tekście', pattern: '(password|hasło|pass)\\s*[:=]\\s*\\S+' },
  { label: 'Token JWT', pattern: 'eyJ[a-zA-Z0-9_-]+\\.eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+' },
  { label: 'NIP', pattern: '\\d{3}[- ]?\\d{3}[- ]?\\d{2}[- ]?\\d{2}' },
];
