import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Shield, ShieldOff, Loader2, Lock, Unlock, AlertTriangle, History, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LLMConnectionPanel } from '@/components/LLMConnectionPanel';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { useLockdown } from '@/hooks/useLockdown';
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
      <div className={`flex items-center gap-2 p-3 border-b ${borderClass}`}>
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <span className="font-display font-semibold text-sm text-foreground">{title}</span>
      </div>
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

// ═══ Lockdown Banner ═══
function LockdownBanner({ 
  report, 
  blockCount,
  onUnlock, 
  onShowHistory 
}: { 
  report: string | null;
  blockCount: number;
  onUnlock: () => void;
  onShowHistory: () => void;
}) {
  const [unlockConfirm, setUnlockConfirm] = useState(false);

  return (
    <div className="border-2 border-destructive rounded-xl bg-destructive/5 p-4 mx-3 mt-3 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            PIPELINE ZAMKNIĘTY — LOCKDOWN
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Po {blockCount} blokadach CERBER przeprowadził pełną symulację intencji i zamknął pipeline.
            Wymagana weryfikacja operatora.
          </p>
          {report && (
            <pre className="mt-3 text-[10px] font-mono bg-background/80 border border-destructive/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-foreground/80 max-h-48 overflow-y-auto">
              {report}
            </pre>
          )}
          <div className="flex gap-2 mt-3">
            {!unlockConfirm ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setUnlockConfirm(true)}
                >
                  <Unlock className="w-3.5 h-3.5 mr-1" />
                  Odblokuj ręcznie
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={onShowHistory}
                >
                  <History className="w-3.5 h-3.5 mr-1" />
                  Historia promptów
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => { onUnlock(); setUnlockConfirm(false); }}
                >
                  ✓ Potwierdzam odblokowanie
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setUnlockConfirm(false)}
                >
                  Anuluj
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ Block Counter Bar ═══
function BlockCounterBar({ blockCount, threshold }: { blockCount: number; threshold: number }) {
  if (blockCount === 0) return null;
  const pct = Math.min((blockCount / threshold) * 100, 100);
  const isWarning = blockCount >= threshold * 0.7;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card">
      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isWarning ? 'text-destructive' : 'text-muted-foreground'}`} />
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isWarning ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono font-bold ${isWarning ? 'text-destructive' : 'text-muted-foreground'}`}>
        {blockCount}/{threshold} BLOCK
      </span>
    </div>
  );
}

// ═══ Prompt History Drawer ═══
function PromptHistoryDrawer({
  log,
  onClose,
  onClear,
}: {
  log: { id: string; timestamp: string; input: string; decision: string; flags: string[]; reason_codes: string[] }[];
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col animate-fade-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Historia zablokowanych promptów
          </h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={onClear}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {log.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Brak wpisów</p>
            )}
            {[...log].reverse().map(entry => (
              <div key={entry.id} className="border border-border rounded-lg p-3 bg-secondary/30">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[9px] font-mono border-destructive/40 text-destructive">
                    {entry.decision}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 mt-1 break-all">{entry.input}</p>
                {entry.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.flags.map(f => (
                      <Badge key={f} variant="outline" className="text-[8px] font-mono border-destructive/20 text-destructive/70">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
                {entry.reason_codes.length > 0 && (
                  <p className="text-[9px] text-muted-foreground mt-1 font-mono">
                    {entry.reason_codes.join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ═══ MAIN PAGE ═══
export default function DualChatPage() {
  const [input, setInput] = useState('');
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [adapter, setAdapter] = useState<ModelAdapter | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const handleAdapterChange = useCallback((a: ModelAdapter | null) => setAdapter(a), []);

  const lockdown = useLockdown();

  const handleSend = async () => {
    const text = input.trim();
    if (!text || lockdown.isLocked) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setRawMessages(prev => [...prev, { ...userMsg, id: crypto.randomUUID() }]);
    setFilteredMessages(prev => [...prev, { ...userMsg, id: crypto.randomUUID() }]);

    setRawLoading(true);
    setFilteredLoading(true);

    // RAW
    const rawPromise = (async () => {
      try {
        const result = await runPipeline(text, { mode: 'raw', adapter: adapter || undefined });
        setRawMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.model_response || '[Brak odpowiedzi — podłącz model LLM]',
          timestamp: new Date().toISOString(),
        }]);
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

    // FILTERED
    const filteredPromise = (async () => {
      try {
        const result = await runPipeline(text, { mode: 'filtered', adapter: adapter || undefined });

        if (result.final_decision === 'BLOCK') {
          lockdown.registerBlock(text, result);

          setFilteredMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'system',
            content: `🚫 ZABLOKOWANE\n\nDecyzja: ${result.final_decision}\nPowody: ${result.guardian.reason_codes.join(', ')}\nFlagi: ${result.lasuch.flags.join(', ') || 'brak'}\n\nModel NIE otrzymał tej wiadomości.\n\n⚠️ Blokada ${lockdown.blockCount + 1}/${lockdown.threshold}`,
            timestamp: new Date().toISOString(),
            pipelineResult: result,
            blocked: true,
          }]);
        } else if (result.final_decision === 'HOLD' || result.final_decision === 'HUMAN_REVIEW') {
          lockdown.registerBlock(text, result);

          setFilteredMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'system',
            content: `⏸ WSTRZYMANE — wymaga weryfikacji.\n\nDecyzja: ${result.final_decision}\nPowody: ${result.guardian.reason_codes.join(', ')}\n\n⚠️ Blokada ${lockdown.blockCount + 1}/${lockdown.threshold}`,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Dual Chat — RAW vs ALFA
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              To samo zapytanie, dwa wyniki. Lewy panel bez filtrów, prawy z pełnym pipeline ALFA.
            </p>
          </div>
          {lockdown.blockLog.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-3.5 h-3.5 mr-1" />
              Historia ({lockdown.blockLog.length})
            </Button>
          )}
        </div>
        <LLMConnectionPanel onAdapterChange={handleAdapterChange} />
      </div>

      {/* Block counter */}
      <BlockCounterBar blockCount={lockdown.blockCount} threshold={lockdown.threshold} />

      {/* Lockdown banner */}
      {lockdown.isLocked && (
        <LockdownBanner
          report={lockdown.fullSimulationReport}
          blockCount={lockdown.blockCount}
          onUnlock={() => lockdown.operatorUnlock('Operator manually unlocked')}
          onShowHistory={() => setShowHistory(true)}
        />
      )}

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
            placeholder={
              lockdown.isLocked
                ? '🔒 Pipeline zamknięty — odblokuj powyżej aby kontynuować'
                : adapter
                ? 'Wpisz wiadomość — trafi jednocześnie do RAW i ALFA...'
                : 'Podłącz model LLM powyżej, potem pisz...'
            }
            disabled={rawLoading || filteredLoading || lockdown.isLocked}
            className={`bg-secondary border-border flex-1 ${lockdown.isLocked ? 'opacity-50' : ''}`}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || rawLoading || filteredLoading || lockdown.isLocked}
            className="gradient-primary text-primary-foreground px-6"
          >
            {lockdown.isLocked ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* History drawer */}
      {showHistory && (
        <PromptHistoryDrawer
          log={lockdown.blockLog}
          onClose={() => setShowHistory(false)}
          onClear={() => lockdown.clearHistory()}
        />
      )}
    </div>
  );
}
