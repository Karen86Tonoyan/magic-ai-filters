import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Settings, Filter as FilterIcon, Shield, AlertTriangle, Lock, CheckCircle, XCircle, Save, Trash2 } from 'lucide-react';
import { useModels, useChains, useFilters } from '@/hooks/useStore';
import { PROVIDER_INFO, FILTER_TYPE_INFO, DEFAULT_DLP_PATTERNS, type ChatMessage, type FilterLog } from '@/types/ai-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function ChatPage() {
  const { models } = useModels();
  const { chains } = useChains();
  const { filters } = useFilters();
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedChainId, setSelectedChainId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState<Record<string, boolean>>({});
  const [savedToast, setSavedToast] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-load last saved session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('alfa_chat_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (parsed.modelId) setSelectedModelId(parsed.modelId);
        if (parsed.chainId) setSelectedChainId(parsed.chainId);
      }
    } catch { /* ignore */ }
  }, []);

  const saveSession = () => {
    const payload = {
      savedAt: new Date().toISOString(),
      modelId: selectedModelId,
      chainId: selectedChainId,
      messages,
    };
    localStorage.setItem('alfa_chat_session', JSON.stringify(payload));
    // also offer download
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alfa-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedToast('Zapisano sesje (localStorage + JSON)');
    setTimeout(() => setSavedToast(''), 2500);
  };

  const clearSession = () => {
    setMessages([]);
    localStorage.removeItem('alfa_chat_session');
  };

  const activeModels = models.filter(m => m.isActive);
  const activeChains = chains.filter(c => c.isActive);
  const selectedModel = models.find(m => m.id === selectedModelId);
  const selectedChain = selectedChainId && selectedChainId !== 'none' ? chains.find(c => c.id === selectedChainId) : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const getChainFilters = () => {
    if (!selectedChain) return [];
    return selectedChain.filterIds.map(id => filters.find(f => f.id === id)).filter(Boolean);
  };

  const runPreModelFilters = (userMessage: string) => {
    const chainFilters = getChainFilters();
    const preModelFilters = chainFilters.filter(f => f && f.phase === 'pre_model' && f.isActive);
    const logs: FilterLog[] = [];
    let blocked = false;
    let blockedBy = '';
    let processedMessage = userMessage;

    for (const filter of preModelFilters) {
      if (!filter) continue;
      const now = new Date().toISOString();

      switch (filter.type) {
        case 'dlp_scanner': {
          let dlpMatch = false;
          const patterns = filter.config.blockedPatterns || [];
          
          // Check built-in patterns
          if (filter.config.blockPII) {
            const piiPatterns = DEFAULT_DLP_PATTERNS.filter(p => 
              ['Email', 'Telefon PL', 'PESEL', 'NIP'].includes(p.label)
            );
            for (const p of piiPatterns) {
              if (new RegExp(p.pattern, 'i').test(userMessage)) {
                dlpMatch = true;
                break;
              }
            }
          }
          if (filter.config.blockCredentials) {
            const credPatterns = DEFAULT_DLP_PATTERNS.filter(p => 
              ['API Key', 'Hasło w tekście', 'Token JWT'].includes(p.label)
            );
            for (const p of credPatterns) {
              if (new RegExp(p.pattern, 'i').test(userMessage)) {
                dlpMatch = true;
                break;
              }
            }
          }
          for (const pat of patterns) {
            if (new RegExp(pat, 'i').test(userMessage)) {
              dlpMatch = true;
              break;
            }
          }

          if (dlpMatch && filter.config.failAction === 'block') {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'block', reason: 'Wykryto wrażliwe dane (DLP)', timestamp: now });
            blocked = true;
            blockedBy = filter.name;
          } else {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: dlpMatch ? 'warn' : 'pass', reason: dlpMatch ? 'Wykryto dane ale akcja = warn/log' : 'Brak wrażliwych danych', timestamp: now });
          }
          break;
        }
        case 'permission_rule': {
          const blockedTopics = filter.config.blockedTopics || [];
          const topicMatch = blockedTopics.some(topic => 
            userMessage.toLowerCase().includes(topic.toLowerCase())
          );
          // Also check content-based rules
          const contentMatch = filter.content && userMessage.toLowerCase().match(
            new RegExp(filter.content.split(/\s+/).filter(w => w.length > 4).slice(0, 5).join('|'), 'i')
          );

          if ((topicMatch || contentMatch) && filter.config.failAction !== 'log') {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: filter.config.failAction === 'block' ? 'block' : 'warn', reason: `Reguła uprawnień: "${filter.name}"`, timestamp: now });
            if (filter.config.failAction === 'block') {
              blocked = true;
              blockedBy = filter.name;
            }
          } else {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'pass', reason: 'Zapytanie zgodne z regułami', timestamp: now });
          }
          break;
        }
        case 'confidence_gate': {
          // Simulate confidence score (in real system would check against knowledge base)
          const simulatedConfidence = Math.random() * 0.4 + 0.3; // 0.3 - 0.7
          const threshold = filter.config.confidenceThreshold || 0.55;
          if (simulatedConfidence < threshold && filter.config.failAction === 'block') {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'block', reason: `Pewność ${simulatedConfidence.toFixed(2)} < próg ${threshold}`, timestamp: now });
            blocked = true;
            blockedBy = filter.name;
          } else {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'pass', reason: `Pewność ${simulatedConfidence.toFixed(2)} ≥ próg ${threshold}`, timestamp: now });
          }
          break;
        }
        case 'context_gate': {
          // Simulate: no real knowledge base connected
          const hasContext = Math.random() > 0.5;
          if (!hasContext && filter.config.failAction === 'block') {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'block', reason: 'Brak zweryfikowanych źródeł w bazie wiedzy', timestamp: now });
            blocked = true;
            blockedBy = filter.name;
          } else {
            logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'pass', reason: hasContext ? 'Znaleziono źródła' : 'Brak źródeł ale akcja ≠ block', timestamp: now });
          }
          break;
        }
        case 'input_transform': {
          processedMessage = `[${filter.name}] ${processedMessage}`;
          logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'transform', reason: 'Input przetransformowany', timestamp: now });
          break;
        }
        case 'system_prompt': {
          logs.push({ filterId: filter.id, filterName: filter.name, phase: 'pre_model', action: 'pass', reason: 'System prompt dodany do kontekstu', timestamp: now });
          break;
        }
      }

      if (blocked) break; // Stop pipeline on block
    }

    return { blocked, blockedBy, logs, processedMessage };
  };

  const simulateResponse = async (userMessage: string) => {
    setIsLoading(true);

    // Run pre-model filters FIRST — architecturally independent from AI
    const { blocked, blockedBy, logs, processedMessage } = runPreModelFilters(userMessage);

    await new Promise(r => setTimeout(r, 800));

    if (blocked) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'filter',
        content: `⛔ **Zapytanie zablokowane przez filtr pre-model**\n\nFiltr **"${blockedBy}"** zablokował to zapytanie PRZED wysłaniem do modelu AI.\n\nModel **nigdy nie zobaczył** tej wiadomości.\n\n> Filozofia: "Lepiej zapytać niż skłamać"`,
        timestamp: new Date().toISOString(),
        blocked: true,
        blockedBy,
        filterLogs: logs,
      }]);
      setIsLoading(false);
      return;
    }

    // If not blocked, simulate AI response
    await new Promise(r => setTimeout(r, 1000));

    // Run post-model filters
    const postLogs: FilterLog[] = [];
    const chainFilters = getChainFilters();
    const postFilters = chainFilters.filter(f => f && f.phase === 'post_model' && f.isActive);
    for (const filter of postFilters) {
      if (!filter) continue;
      postLogs.push({
        filterId: filter.id,
        filterName: filter.name,
        phase: 'post_model',
        action: 'pass',
        reason: `Output przefiltrowany przez "${filter.name}"`,
        timestamp: new Date().toISOString(),
      });
    }

    const allLogs = [...logs, ...postLogs];

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Symulowana odpowiedź od **${selectedModel?.name}** (${selectedModel?.modelId}).\n\nZapytanie przeszło przez ${logs.length} filtr(ów) pre-model i ${postLogs.length} filtr(ów) post-model.`,
      timestamp: new Date().toISOString(),
      modelId: selectedModelId,
      filtersApplied: allLogs.map(l => l.filterName),
      filterLogs: allLogs,
    }]);
    setIsLoading(false);
  };

  const handleSend = () => {
    if (!input.trim() || !selectedModelId) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    simulateResponse(input);
  };

  const renderFilterLogs = (msg: ChatMessage) => {
    if (!msg.filterLogs?.length || !showLogs[msg.id]) return null;
    return (
      <div className="mt-3 space-y-1 border-t border-border pt-2">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Filter Pipeline Log</p>
        {msg.filterLogs.map((log, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            {log.action === 'pass' && <CheckCircle className="w-3 h-3 text-success shrink-0" />}
            {log.action === 'block' && <XCircle className="w-3 h-3 text-destructive shrink-0" />}
            {log.action === 'warn' && <AlertTriangle className="w-3 h-3 text-warning shrink-0" />}
            {log.action === 'transform' && <span className="text-info shrink-0">🔄</span>}
            <span className={`font-mono ${log.phase === 'pre_model' ? 'text-destructive' : 'text-info'}`}>
              [{log.phase === 'pre_model' ? 'PRE' : 'POST'}]
            </span>
            <span className="text-foreground font-medium">{log.filterName}</span>
            <span className="text-muted-foreground">— {log.reason}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen animate-fade-up">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger className="w-[200px] bg-secondary border-border">
                <SelectValue placeholder="Wybierz model" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {activeModels.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_INFO[m.provider].color }} />
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedChainId} onValueChange={setSelectedChainId}>
              <SelectTrigger className="w-[200px] bg-secondary border-border">
                <SelectValue placeholder="Bez łańcucha" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none">Bez filtrów</SelectItem>
                {activeChains.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedChain && (
            <div className="flex items-center gap-1 flex-wrap">
              {getChainFilters().map(f => f && (
                <Badge key={f.id} variant="outline" className={`text-xs font-mono ${
                  f.phase === 'pre_model' ? 'border-destructive/30 text-destructive' : 'border-info/30 text-info'
                }`}>
                  {FILTER_TYPE_INFO[f.type].icon} {f.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">Chat Testowy — NOWA Logika</h3>
            <p className="text-muted-foreground max-w-md">
              Testuj pipeline filtrów. Filtry pre-model działają architekturalnie — model AI nie ma na nie wpływu.
            </p>
            <div className="mt-4 flex gap-3 flex-wrap justify-center">
              <span className="text-xs font-mono bg-destructive/10 text-destructive px-3 py-1 rounded-full">⬆ Pre-Model = Firewall</span>
              <span className="text-xs font-mono bg-info/10 text-info px-3 py-1 rounded-full">⬇ Post-Model = Moderacja</span>
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {(msg.role === 'assistant' || msg.role === 'filter') && (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === 'filter' ? 'bg-destructive/10' : 'bg-secondary'
              }`}>
                {msg.role === 'filter' ? <Lock className="w-4 h-4 text-destructive" /> : <Bot className="w-4 h-4 text-primary" />}
              </div>
            )}
            <div className={`max-w-[70%] rounded-xl p-4 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : msg.role === 'filter'
                ? 'bg-destructive/5 border border-destructive/30'
                : 'bg-card border border-border'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.filterLogs && msg.filterLogs.length > 0 && (
                <button
                  onClick={() => setShowLogs(s => ({ ...s, [msg.id]: !s[msg.id] }))}
                  className="text-[10px] font-mono text-primary hover:underline mt-2 block"
                >
                  {showLogs[msg.id] ? '▼ Ukryj logi filtrów' : `▶ Pokaż logi (${msg.filterLogs.length} filtrów)`}
                </button>
              )}
              {renderFilterLogs(msg)}
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-destructive animate-pulse" />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground mb-2">Uruchamiam pipeline filtrów...</p>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-destructive rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-info rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={selectedModelId ? 'Napisz wiadomość... (spróbuj: "moje hasło to test123")' : 'Najpierw wybierz model'}
            disabled={!selectedModelId || isLoading}
            className="bg-secondary border-border flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim() || !selectedModelId || isLoading} className="gradient-primary text-primary-foreground px-6">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
