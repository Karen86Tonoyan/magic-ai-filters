import { useState, useCallback } from 'react';
import { Play, Shield, Eye, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { TEST_PROMPTS } from '@/types/tonoyan-filters';
import type { PipelineResult, PipelineMode } from '@/types/tonoyan-filters';
import type { ModelAdapter } from '@/lib/adapters/types';
import { LLMConnectionPanel } from '@/components/LLMConnectionPanel';

const DECISION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PASS: { bg: 'bg-success/10', text: 'text-success', label: '✅ PASS' },
  LIMITED_PASS: { bg: 'bg-warning/10', text: 'text-warning', label: '⚠️ LIMITED PASS' },
  HOLD: { bg: 'bg-warning/10', text: 'text-warning', label: '⏸️ HOLD' },
  BLOCK: { bg: 'bg-destructive/10', text: 'text-destructive', label: '🚫 BLOCK' },
  HUMAN_REVIEW: { bg: 'bg-info/10', text: 'text-info', label: '👤 HUMAN REVIEW' },
};

const SEVERITY_STYLES: Record<string, string> = {
  high: 'border-destructive/40 text-destructive bg-destructive/5',
  medium: 'border-warning/40 text-warning bg-warning/5',
  low: 'border-muted-foreground/30 text-muted-foreground bg-muted/30',
};

export default function LiveAnalysisPage() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<PipelineMode>('filtered');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showWeaknesses, setShowWeaknesses] = useState(false);
  const [adapter, setAdapter] = useState<ModelAdapter | null>(null);

  const handleAdapterChange = useCallback((a: ModelAdapter | null) => setAdapter(a), []);

  const runAnalysis = async () => {
    if (!input.trim()) return;
    setIsRunning(true);
    setResult(null);
    setCopied(false);

    setStage('ŁASUCH — skanowanie wzorców...');
    await new Promise(r => setTimeout(r, 300));
    setStage('CERBER — dekompozycja intencji...');
    await new Promise(r => setTimeout(r, 400));
    setStage('GUARDIAN — decyzja + ulepszanie promptu...');
    await new Promise(r => setTimeout(r, 200));
    setStage('RDZEŃ — kalkulacja value/risk...');

    const res = await runPipeline(input, { mode });
    setResult(res);
    setIsRunning(false);
    setStage('');
  };

  const loadTestPrompt = (promptId: string) => {
    const tp = TEST_PROMPTS.find(t => t.id === promptId);
    if (tp) setInput(tp.prompt);
  };

  const copyEnhanced = async () => {
    if (result?.enhancement?.enhanced) {
      await navigator.clipboard.writeText(result.enhancement.enhanced);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const useEnhanced = () => {
    if (result?.enhancement?.enhanced) {
      setInput(result.enhancement.enhanced);
      setResult(null);
    }
  };

  const ds = result ? DECISION_STYLES[result.final_decision] : null;

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-up max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          Live Analysis
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">ŁASUCH → CERBER → GUARDIAN → ENHANCER → RDZEŃ — pełny pipeline w akcji</p>
      </div>

      {/* Input area */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={mode} onValueChange={(v: PipelineMode) => setMode(v)}>
            <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="filtered">🛡️ Filtered</SelectItem>
              <SelectItem value="raw">⚡ Raw (bez filtrów)</SelectItem>
              <SelectItem value="benchmark">📊 Benchmark</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={loadTestPrompt}>
            <SelectTrigger className="w-full sm:w-[220px] bg-secondary border-border">
              <SelectValue placeholder="Załaduj test prompt..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {TEST_PROMPTS.map(tp => (
                <SelectItem key={tp.id} value={tp.id}>
                  {tp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Wpisz prompt do analizy... lub wybierz z testowych powyżej"
          className="bg-secondary border-border font-mono text-sm min-h-[100px]"
        />

        <Button onClick={runAnalysis} disabled={!input.trim() || isRunning} className="w-full gradient-primary text-primary-foreground font-display gap-2">
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isRunning ? stage : 'Uruchom Pipeline'}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Final Decision Banner */}
          <div className={`${ds?.bg} border rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
            <div>
              <p className={`text-2xl sm:text-3xl font-display font-bold ${ds?.text}`}>{ds?.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Mode: <span className="text-foreground">{result.response_mode}</span>
                {' · '}Latency: <span className="text-foreground">{result.total_latency_ms}ms</span>
                {' · '}Tokens: <span className="text-foreground">~{result.token_estimate}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.lasuch.flags.map(f => (
                <Badge key={f} variant="outline" className="text-xs font-mono border-destructive/30 text-destructive">{f}</Badge>
              ))}
              {result.lasuch.flags.length === 0 && (
                <Badge variant="outline" className="text-xs font-mono border-success/30 text-success">CLEAN</Badge>
              )}
            </div>
          </div>

          {/* ═══ PROMPT ENHANCER PANEL v2.0 ═══ */}
          {result.enhancement && result.enhancement.weaknesses.length > 0 && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  GUARDIAN Prompt Enhancer v2.0
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary ml-1">
                    {result.enhancement.mode.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-2">{result.enhancement.processing_time_ms}ms</span>
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono border-warning/30 text-warning">
                    Siła: {(result.enhancement.strength_score * 100).toFixed(0)}%
                  </Badge>
                  <Badge variant="outline" className={`text-xs font-mono ${
                    result.enhancement.modification_level === 'HIGH' ? 'border-destructive/30 text-destructive' :
                    result.enhancement.modification_level === 'MEDIUM' ? 'border-warning/30 text-warning' :
                    'border-success/30 text-success'
                  }`}>
                    Mod: {result.enhancement.modification_level}
                  </Badge>
                  {result.enhancement.risk_of_distortion > 0.3 && (
                    <Badge variant="outline" className="text-xs font-mono border-destructive/30 text-destructive">
                      ⚠️ Distortion: {(result.enhancement.risk_of_distortion * 100).toFixed(0)}%
                    </Badge>
                  )}
                  {result.enhancement.added_assumptions && (
                    <Badge variant="outline" className="text-xs font-mono border-destructive/40 text-destructive animate-pulse">
                      ⚠️ ASSUMPTIONS
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{result.enhancement.enhancement_summary}</p>

              {/* Weaknesses toggle */}
              <button
                onClick={() => setShowWeaknesses(!showWeaknesses)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showWeaknesses ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {result.enhancement.weaknesses.length} wykrytych słabości
              </button>

              {showWeaknesses && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.enhancement.weaknesses.map((w, i) => (
                    <div key={i} className={`border rounded-lg p-3 ${SEVERITY_STYLES[w.severity]}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {w.severity.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] font-mono">{w.category.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xs mb-1">{w.description}</p>
                      <p className="text-[10px] text-foreground/70">💡 {w.fix}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Dual Prompt Preview */}
              {result.enhancement.mode !== 'benchmark' && (
                <div className="space-y-3">
                  {/* System Guard */}
                  {result.enhancement.dual_prompt.system_guard && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        SYSTEM GUARD (auto-generated rules):
                      </p>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 font-mono text-[11px] text-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {result.enhancement.dual_prompt.system_guard}
                      </div>
                    </div>
                  )}
                  {/* Raw Input */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      USER INPUT (niezmieniony):
                    </p>
                    <div className="bg-success/5 border border-success/20 rounded-lg p-3 font-mono text-[11px] text-foreground whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                      {result.enhancement.dual_prompt.raw_input}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyEnhanced} className="gap-2 text-xs">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Skopiowano!' : 'Kopiuj SYSTEM GUARD'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Benchmark mode: analysis only */}
              {result.enhancement.mode === 'benchmark' && (
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground italic">Tryb BENCHMARK: tylko analiza, bez generowania reguł SYSTEM.</p>
                </div>
              )}
            </div>
          )}

          {/* Pipeline Modules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ŁASUCH */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-warning" />
                ŁASUCH — First Line
                <span className="text-xs text-muted-foreground ml-auto">{result.lasuch.processing_time_ms}ms</span>
              </h3>
              <div className="space-y-3">
                <ScoreBar label="Risk" value={result.lasuch.risk_score} color="destructive" />
                <ScoreBar label="Manipulation" value={result.lasuch.manipulation_score} color="warning" />
                <ScoreBar label="Exploit" value={result.lasuch.exploit_score} color="destructive" />
                <ScoreBar label="Confidence" value={result.lasuch.confidence} color="success" />
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Goal:</span> {result.lasuch.extracted_goal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Hidden:</span> {result.lasuch.suspected_hidden_intent}
                  </p>
                </div>
              </div>
            </div>

            {/* CERBER */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                CERBER — Intent Destructor
                <span className="text-xs text-muted-foreground ml-auto">{result.cerber.processing_time_ms}ms</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={`font-mono ${
                    result.cerber.survival_status === 'SURVIVED' ? 'border-success/30 text-success' :
                    result.cerber.survival_status === 'FAILED' ? 'border-destructive/30 text-destructive' :
                    'border-warning/30 text-warning'
                  }`}>
                    {result.cerber.survival_status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {result.cerber.iteration_count} iteracji
                  </span>
                </div>

                {result.cerber.iterations.map((iter, i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-primary">#{iter.iteration}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{iter.layer}</span>
                      <span className={`text-[10px] font-mono ml-auto ${iter.risk_delta > 0 ? 'text-destructive' : 'text-success'}`}>
                        {iter.risk_delta > 0 ? '+' : ''}{iter.risk_delta}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{iter.finding}</p>
                  </div>
                ))}

                {result.cerber.attack_hypotheses.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-foreground mb-1">Attack Hypotheses:</p>
                    {result.cerber.attack_hypotheses.map((h, i) => (
                      <p key={i} className="text-xs text-destructive">• {h}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* GUARDIAN */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                {result.guardian.decision === 'PASS' ? <CheckCircle className="w-5 h-5 text-success" /> :
                 result.guardian.decision === 'BLOCK' ? <XCircle className="w-5 h-5 text-destructive" /> :
                 <Clock className="w-5 h-5 text-warning" />}
                GUARDIAN — Decision
                <span className="text-xs text-muted-foreground ml-auto">{result.guardian.processing_time_ms}ms</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-display font-bold ${
                    DECISION_STYLES[result.guardian.decision]?.text || 'text-foreground'
                  }`}>
                    {DECISION_STYLES[result.guardian.decision]?.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Response mode: <span className="text-foreground font-mono">{result.guardian.response_mode}</span>
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Reason codes:</p>
                  {result.guardian.reason_codes.map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono mr-1">{r}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* CORE */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                ⚙️ RDZEŃ — Value vs Risk
              </h3>
              <div className="space-y-3">
                <ScoreBar label="Value" value={result.core.scores.value_score} color="success" />
                <ScoreBar label="Risk" value={result.core.scores.risk_score} color="destructive" />
                <ScoreBar label="Trust" value={result.core.scores.trust_score} color="primary" />
                <ScoreBar label="Confidence" value={result.core.scores.confidence_score} color="success" />
                <ScoreBar label="Uncertainty" value={result.core.scores.uncertainty_score} color="warning" />
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Recommendation:</span>{' '}
                    <span className="font-mono">{result.core.recommendation.toUpperCase()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{result.core.reasoning}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Model Response */}
          {result.model_response && (
            <div className="bg-card border border-primary/20 rounded-xl p-4 sm:p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">🤖 Model Response</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{result.model_response}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClass = color === 'destructive' ? 'text-destructive' :
    color === 'warning' ? 'text-warning' :
    color === 'success' ? 'text-success' :
    'text-primary';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            color === 'destructive' ? 'bg-destructive' :
            color === 'warning' ? 'bg-warning' :
            color === 'success' ? 'bg-success' :
            'bg-primary'
          }`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-10 text-right ${colorClass}`}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}
