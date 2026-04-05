import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Shield, ShieldOff, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LLMConnectionPanel } from '@/components/LLMConnectionPanel';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import type { ModelAdapter } from '@/lib/adapters/types';
import type { PipelineResult } from '@/types/tonoyan-filters';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  pipelineResult?: PipelineResult;
  blocked?: boolean;
}

function ChatPanel({
  title,
  icon: Icon,
  iconClass,
  messages,
  isLoading,
  accentClass,
  borderClass,
}: {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  messages: ChatMessage[];
  isLoading: boolean;
  accentClass: string;
  borderClass: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={`flex flex-col flex-1 min-w-0 border ${borderClass} rounded-xl bg-card overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 p-3 border-b ${borderClass}`}>
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <span className="font-display font-semibold text-sm text-foreground">{title}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <Icon className={`w-10 h-10 ${iconClass} mb-2`} />
            <p className="text-xs text-muted-foreground">Wpisz wiadomość poniżej</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                msg.blocked ? 'bg-destructive/10' : 'bg-secondary'
              }`}>
                {msg.blocked ? <Lock className="w-3.5 h-3.5 text-destructive" /> : <Bot className={`w-3.5 h-3.5 ${iconClass}`} />}
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : msg.blocked
                ? 'bg-destructive/5 border border-destructive/30'
                : `bg-secondary/50 border ${borderClass}`
            }`}>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
              {msg.pipelineResult && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className={`text-[9px] font-mono ${accentClass}`}>
                    {msg.pipelineResult.final_decision}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                    {msg.pipelineResult.total_latency_ms}ms
                  </Badge>
                  {msg.pipelineResult.lasuch.flags.map(f => (
                    <Badge key={f} variant="outline" className="text-[9px] font-mono border-destructive/30 text-destructive">{f}</Badge>
                  ))}
                </div>
              )}
              <span className="text-[9px] text-muted-foreground mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentClass.includes('destructive') ? 'bg-destructive/10' : 'bg-secondary'}`}>
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${iconClass}`} />
            </div>
            <div className="bg-secondary/50 border border-border rounded-xl p-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DualChatPage() {
  const [input, setInput] = useState('');
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [adapter, setAdapter] = useState<ModelAdapter | null>(null);
  const handleAdapterChange = useCallback((a: ModelAdapter | null) => setAdapter(a), []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Add user message to both panels
    setRawMessages(prev => [...prev, { ...userMsg, id: crypto.randomUUID() }]);
    setFilteredMessages(prev => [...prev, { ...userMsg, id: crypto.randomUUID() }]);

    // Run both in parallel
    setRawLoading(true);
    setFilteredLoading(true);

    // RAW — no filters, straight to model
    const rawPromise = (async () => {
      try {
        const result = await runPipeline(text, { mode: 'raw', adapter: adapter || undefined });
        const response: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.model_response || '[Brak odpowiedzi — podłącz model LLM w panelu powyżej]',
          timestamp: new Date().toISOString(),
        };
        setRawMessages(prev => [...prev, response]);
      } catch {
        setRawMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '[ERROR] Nie udało się uzyskać odpowiedzi.',
          timestamp: new Date().toISOString(),
        }]);
      }
      setRawLoading(false);
    })();

    // FILTERED — full ALFA pipeline
    const filteredPromise = (async () => {
      try {
        const result = await runPipeline(text, { mode: 'filtered', adapter: adapter || undefined });

        if (result.final_decision === 'BLOCK') {
          setFilteredMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Zapytanie ZABLOKOWANE przez pipeline ALFA.\n\nDecyzja: ${result.final_decision}\nPowody: ${result.guardian.reason_codes.join(', ')}\nFlagi: ${result.lasuch.flags.join(', ') || 'brak'}\n\nModel NIE otrzymał tej wiadomości.`,
            timestamp: new Date().toISOString(),
            pipelineResult: result,
            blocked: true,
          }]);
        } else if (result.final_decision === 'HOLD' || result.final_decision === 'HUMAN_REVIEW') {
          setFilteredMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Zapytanie WSTRZYMANE — wymaga weryfikacji.\n\nDecyzja: ${result.final_decision}\nPowody: ${result.guardian.reason_codes.join(', ')}`,
            timestamp: new Date().toISOString(),
            pipelineResult: result,
            blocked: true,
          }]);
        } else {
          setFilteredMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.model_response || '[Brak odpowiedzi — podłącz model LLM]',
            timestamp: new Date().toISOString(),
            pipelineResult: result,
          }]);
        }
      } catch {
        setFilteredMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '[ERROR] Pipeline ALFA zwrócił błąd.',
          timestamp: new Date().toISOString(),
        }]);
      }
      setFilteredLoading(false);
    })();

    await Promise.all([rawPromise, filteredPromise]);
  };

  return (
    <div className="flex flex-col h-screen animate-fade-up">
      {/* Header */}
      <div className="border-b border-border p-4 bg-card space-y-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Dual Chat — RAW vs ALFA
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            To samo zapytanie, dwa wyniki. Lewy panel bez filtrów, prawy z pełnym pipeline ALFA.
          </p>
        </div>
        <LLMConnectionPanel onAdapterChange={handleAdapterChange} />
      </div>

      {/* Dual panels */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">
        <ChatPanel
          title="RAW — Bez filtrów"
          icon={ShieldOff}
          iconClass="text-muted-foreground"
          messages={rawMessages}
          isLoading={rawLoading}
          accentClass="border-muted-foreground/30 text-muted-foreground"
          borderClass="border-border"
        />
        <ChatPanel
          title="ALFA — Pełny pipeline"
          icon={Shield}
          iconClass="text-primary"
          messages={filteredMessages}
          isLoading={filteredLoading}
          accentClass="border-primary/30 text-primary"
          borderClass="border-primary/20"
        />
      </div>

      {/* Shared input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={adapter ? 'Wpisz wiadomość — trafi jednocześnie do RAW i ALFA...' : 'Podłącz model LLM powyżej, potem pisz...'}
            disabled={rawLoading || filteredLoading}
            className="bg-secondary border-border flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || rawLoading || filteredLoading}
            className="gradient-primary text-primary-foreground px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
