import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, Server, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { ModelAdapter } from '@/lib/adapters/types';
import { createAdapter } from '@/lib/adapters/factory';
import { PROVIDER_INFO, type AIProvider } from '@/types/ai-filters';

interface LLMConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  enabled: boolean;
}

const STORAGE_KEY = 'alfa_llm_config';

const DEFAULT_MODELS: Record<string, string> = {
  ollama: 'llama3.2:1b',
  openai: 'gpt-4-turbo',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-2.0-flash',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
  custom: '',
};

function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434', modelId: 'llama3.2:1b', enabled: false };
}

function saveConfig(config: LLMConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface Props {
  onAdapterChange: (adapter: ModelAdapter | null) => void;
}

export function LLMConnectionPanel({ onAdapterChange }: Props) {
  const [config, setConfig] = useState<LLMConfig>(loadConfig);
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  const needsApiKey = config.provider !== 'ollama';

  useEffect(() => {
    saveConfig(config);
    if (config.enabled) {
      const adapter = createAdapter(config.provider, {
        baseUrl: config.baseUrl || PROVIDER_INFO[config.provider]?.defaultUrl || '',
        apiKey: config.apiKey,
        modelId: config.modelId,
      });
      onAdapterChange(adapter);
    } else {
      onAdapterChange(null);
    }
  }, [config, onAdapterChange]);

  const updateConfig = (updates: Partial<LLMConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setStatus('idle');
  };

  const switchProvider = (provider: AIProvider) => {
    updateConfig({
      provider,
      baseUrl: PROVIDER_INFO[provider]?.defaultUrl || '',
      modelId: DEFAULT_MODELS[provider] || '',
      apiKey: provider === 'ollama' ? '' : config.apiKey,
    });
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const adapter = createAdapter(config.provider, {
        baseUrl: config.baseUrl || PROVIDER_INFO[config.provider]?.defaultUrl || '',
        apiKey: config.apiKey,
        modelId: config.modelId,
      });
      const ok = await adapter.testConnection();
      setStatus(ok ? 'connected' : 'error');
      if (ok) updateConfig({ enabled: true });
    } catch {
      setStatus('error');
    }
    setTesting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {config.enabled && status === 'connected' ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-display font-semibold text-sm text-foreground">
            LLM Connection
          </span>
          {config.enabled && (
            <Badge variant="outline" className="text-[10px] font-mono border-success/30 text-success">
              {PROVIDER_INFO[config.provider]?.label} / {config.modelId}
            </Badge>
          )}
          {!config.enabled && (
            <span className="text-xs text-muted-foreground">Pipeline dziala bez modelu (analiza only)</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-sm">Aktywne polaczenie</Label>
            <Switch checked={config.enabled} onCheckedChange={v => updateConfig({ enabled: v })} />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1 block">Provider</Label>
            <Select value={config.provider} onValueChange={(v: AIProvider) => switchProvider(v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="ollama">
                  <div className="flex items-center gap-2">
                    <Server className="w-3 h-3" /> Ollama (Lokalny)
                  </div>
                </SelectItem>
                <SelectItem value="openai">
                  <div className="flex items-center gap-2">
                    <Key className="w-3 h-3" /> OpenAI
                  </div>
                </SelectItem>
                <SelectItem value="anthropic">
                  <div className="flex items-center gap-2">
                    <Key className="w-3 h-3" /> Anthropic
                  </div>
                </SelectItem>
                <SelectItem value="google">
                  <div className="flex items-center gap-2">
                    <Key className="w-3 h-3" /> Google AI
                  </div>
                </SelectItem>
                <SelectItem value="groq">
                  <div className="flex items-center gap-2">
                    <Key className="w-3 h-3" /> Groq
                  </div>
                </SelectItem>
                <SelectItem value="mistral">
                  <div className="flex items-center gap-2">
                    <Key className="w-3 h-3" /> Mistral
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Key className="w-3 h-3" /> Custom API
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs mb-1 block">Model ID</Label>
            <Input
              value={config.modelId}
              onChange={e => updateConfig({ modelId: e.target.value })}
              placeholder={DEFAULT_MODELS[config.provider]}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>

          {needsApiKey && (
            <div>
              <Label className="text-muted-foreground text-xs mb-1 block">API Key</Label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={e => updateConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="bg-secondary border-border font-mono text-sm"
              />
            </div>
          )}

          <div>
            <Label className="text-muted-foreground text-xs mb-1 block">Base URL</Label>
            <Input
              value={config.baseUrl}
              onChange={e => updateConfig({ baseUrl: e.target.value })}
              placeholder={PROVIDER_INFO[config.provider]?.defaultUrl}
              className="bg-secondary border-border font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={testConnection}
              disabled={testing || (needsApiKey && !config.apiKey)}
              className="gap-2"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
              Test Connection
            </Button>
            {status === 'connected' && (
              <Badge variant="outline" className="text-xs font-mono border-success/30 text-success">
                Connected
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant="outline" className="text-xs font-mono border-destructive/30 text-destructive">
                Connection Failed
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
