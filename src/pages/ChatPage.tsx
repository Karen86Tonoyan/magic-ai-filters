import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Settings, Filter as FilterIcon } from 'lucide-react';
import { useModels, useChains, useFilters } from '@/hooks/useStore';
import { PROVIDER_INFO, FILTER_TYPE_INFO, type ChatMessage } from '@/types/ai-filters';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeModels = models.filter(m => m.isActive);
  const activeChains = chains.filter(c => c.isActive);
  const selectedModel = models.find(m => m.id === selectedModelId);
  const selectedChain = selectedChainId ? chains.find(c => c.id === selectedChainId) : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const getAppliedFilters = () => {
    if (!selectedChain) return [];
    return selectedChain.filterIds.map(id => filters.find(f => f.id === id)).filter(Boolean);
  };

  const simulateResponse = async (userMessage: string) => {
    setIsLoading(true);
    const appliedFilters = getAppliedFilters();
    const filterNames = appliedFilters.map(f => f!.name);

    // Simulate filter pipeline
    let processedInput = userMessage;
    const steps: string[] = [];

    for (const filter of appliedFilters) {
      if (!filter) continue;
      switch (filter.type) {
        case 'permission_rule':
          steps.push(`🔒 Sprawdzam regułę: "${filter.name}"`);
          // Simulate permission check
          const blocked = filter.content.toLowerCase().includes('dane prywatne') &&
            userMessage.toLowerCase().match(/dane (prywatne|osobowe|poufne)/);
          if (blocked) {
            await new Promise(r => setTimeout(r, 800));
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `⛔ **Filtr uprawnień zablokował zapytanie**\n\nReguła "${filter.name}" nie pozwala na to zapytanie.\n\n> ${filter.content}`,
              timestamp: new Date().toISOString(),
              modelId: selectedModelId,
              filtersApplied: filterNames,
            }]);
            setIsLoading(false);
            return;
          }
          break;
        case 'input_transform':
          steps.push(`🔄 Transformuję input: "${filter.name}"`);
          processedInput = `[Transformed by: ${filter.name}] ${processedInput}`;
          break;
        case 'system_prompt':
          steps.push(`💬 Dodaję system prompt: "${filter.name}"`);
          break;
        case 'output_filter':
          steps.push(`🛡️ Filtruję output: "${filter.name}"`);
          break;
      }
    }

    await new Promise(r => setTimeout(r, 1500));

    const pipelineInfo = steps.length > 0
      ? `\n\n---\n📋 **Pipeline filtrów:**\n${steps.map(s => `- ${s}`).join('\n')}`
      : '';

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `To jest symulowana odpowiedź od **${selectedModel?.name}** (${selectedModel?.modelId}).\n\nTwoje zapytanie: "${userMessage}"\n\n> W pełnej wersji ta wiadomość byłaby prawdziwą odpowiedzią AI, przetworzoną przez ${appliedFilters.length} filtr(ów).${pipelineInfo}`,
      timestamp: new Date().toISOString(),
      modelId: selectedModelId,
      filtersApplied: filterNames,
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
              {getAppliedFilters().map(f => (
                <Badge key={f!.id} variant="outline" className="text-xs font-mono border-accent/30 text-accent">
                  {FILTER_TYPE_INFO[f!.type].icon} {f!.name}
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
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">Chat Testowy</h3>
            <p className="text-muted-foreground max-w-md">
              Wybierz model i opcjonalnie łańcuch filtrów, aby przetestować działanie pipeline'u.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[70%] rounded-xl p-4 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.filtersApplied && msg.filtersApplied.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {msg.filtersApplied.map(name => (
                    <span key={name} className="text-[10px] font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded">{name}</span>
                  ))}
                </div>
              )}
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
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
            placeholder={selectedModelId ? 'Napisz wiadomość...' : 'Najpierw wybierz model'}
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
