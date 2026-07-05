import { useState, useCallback } from 'react';
import {
  ScanLine, ShieldAlert, ShieldCheck, Play, Square, Download,
  AlertTriangle, CheckCircle2, Clock, Zap, ChevronDown, ChevronRight,
  RotateCcw, FileSearch, XCircle
} from 'lucide-react';
import { TEST_PROMPTS } from '@/types/tonoyan-filters';
import type { PipelineResult, GuardianDecision } from '@/types/tonoyan-filters';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/StatCard';

// ─── helpers ──────────────────────────────────────────────────────────────────

const DECISION_STYLE: Record<GuardianDecision, { color: string; label: string }> = {
  PASS:         { color: 'text-green-400 border-green-400/40',  label: 'PASS' },
  LIMITED_PASS: { color: 'text-yellow-400 border-yellow-400/40', label: 'LIMITED' },
  HOLD:         { color: 'text-orange-400 border-orange-400/40', label: 'HOLD' },
  BLOCK:        { color: 'text-red-400 border-red-400/40',      label: 'BLOCK' },
  HUMAN_REVIEW: { color: 'text-purple-400 border-purple-400/40', label: 'REVIEW' },
};

function DecisionBadge({ decision }: { decision: GuardianDecision }) {
  const s = DECISION_STYLE[decision];
  return (
    <Badge variant="outline" className={`font-mono text-[10px] ${s.color}`}>
      {s.label}
    </Badge>
  );
}

function ScoreBar({ label, value, warn = 0.3 }: { label: string; value: number; warn?: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? 'bg-red-500' : value >= warn ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 text-muted-foreground font-mono shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-7 text-right font-mono shrink-0 ${value >= warn ? 'text-yellow-400' : 'text-muted-foreground'}`}>
        {pct}%
      </span>
    </div>
  );
}

interface ScanEntry {
  id: string;
  label: string;
  prompt: string;
  result: PipelineResult;
  expanded: boolean;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SecureScanPage() {
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [customScanning, setCustomScanning] = useState(false);
  const [customResult, setCustomResult] = useState<PipelineResult | null>(null);
  const [aborted, setAborted] = useState(false);
  const abortRef = { current: false };

  const runBatchScan = useCallback(async () => {
    setScanning(true);
    setEntries([]);
    setProgress(0);
    setAborted(false);
    abortRef.current = false;

    for (let i = 0; i < TEST_PROMPTS.length; i++) {
      if (abortRef.current) break;
      const tp = TEST_PROMPTS[i];
      const result = await runPipeline(tp.prompt, { mode: 'benchmark' });
      setEntries(prev => [...prev, { id: tp.id, label: tp.label, prompt: tp.prompt, result, expanded: false }]);
      setProgress(Math.round(((i + 1) / TEST_PROMPTS.length) * 100));
      // yield to render
      await new Promise(r => setTimeout(r, 0));
    }

    setScanning(false);
  }, []);

  const stopScan = useCallback(() => {
    abortRef.current = true;
    setAborted(true);
    setScanning(false);
  }, []);

  const resetScan = useCallback(() => {
    setEntries([]);
    setProgress(0);
    setAborted(false);
    setCustomResult(null);
    setCustomInput('');
  }, []);

  const toggleExpand = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
  };

  const runCustomScan = useCallback(async () => {
    if (!customInput.trim()) return;
    setCustomScanning(true);
    setCustomResult(null);
    const result = await runPipeline(customInput.trim(), { mode: 'benchmark' });
    setCustomResult(result);
    setCustomScanning(false);
  }, [customInput]);

  const exportResults = useCallback(() => {
    const data = {
      exported_at: new Date().toISOString(),
      scan_count: entries.length,
      summary: buildSummary(entries),
      results: entries.map(e => ({
        id: e.id,
        label: e.label,
        prompt: e.prompt.slice(0, 120),
        final_decision: e.result.final_decision,
        risk_score: e.result.lasuch.risk_score,
        manipulation_score: e.result.lasuch.manipulation_score,
        exploit_score: e.result.lasuch.exploit_score,
        flags: e.result.lasuch.flags,
        cerber_status: e.result.cerber.survival_status,
        latency_ms: e.result.total_latency_ms,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alfa-secure-scan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const summary = buildSummary(entries);

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-wider">
              Secure Scan
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Full-pipeline batch analysis — LASUCH / CERBER / GUARDIAN / CORE
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {entries.length > 0 && !scanning && (
            <Button variant="outline" size="sm" onClick={exportResults} className="gap-2">
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </Button>
          )}
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetScan} className="gap-2 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}
          {scanning ? (
            <Button variant="destructive" size="sm" onClick={stopScan} className="gap-2">
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={runBatchScan} className="gap-2" disabled={scanning}>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Batch Scan ({TEST_PROMPTS.length} prompts)
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(scanning || (entries.length > 0 && progress < 100 && !aborted)) && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{scanning ? 'Scanning…' : aborted ? 'Stopped' : 'Complete'}</span>
            <span>{entries.length} / {TEST_PROMPTS.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Aggregate metrics — shown once at least one result exists */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileSearch} label="Scanned"      value={entries.length}      description="prompts" variant="primary" />
          <StatCard icon={XCircle}   label="Threats"       value={summary.threats}     description={`of ${entries.length}`} variant="warning" />
          <StatCard icon={ShieldAlert} label="Blocked"     value={summary.blocked}     description="BLOCK / REVIEW" variant="accent" />
          <StatCard icon={ShieldCheck} label="Passed"      value={summary.passed}      description="PASS / LIMITED" variant="info" />
        </div>
      )}

      {/* Results table */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-foreground tracking-wide">
              Scan Results
            </h2>
            {aborted && (
              <Badge variant="outline" className="text-orange-400 border-orange-400/40 text-[10px] font-mono">
                SCAN STOPPED
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            {entries.map(entry => (
              <div
                key={entry.id}
                className={`bg-card border rounded-lg transition-colors ${
                  entry.result.final_decision === 'BLOCK' || entry.result.final_decision === 'HUMAN_REVIEW'
                    ? 'border-destructive/20'
                    : entry.result.final_decision === 'PASS'
                    ? 'border-success/10'
                    : 'border-border'
                }`}
              >
                {/* Row summary */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <span className="text-muted-foreground w-4 shrink-0">
                    {entry.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.label}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                      {entry.prompt.slice(0, 80)}{entry.prompt.length > 80 ? '…' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {entry.result.lasuch.flags.length > 0 && (
                      <span className="text-[10px] font-mono text-destructive">
                        {entry.result.lasuch.flags.length} flag{entry.result.lasuch.flags.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entry.result.total_latency_ms}ms
                    </span>
                    <DecisionBadge decision={entry.result.final_decision} />
                  </div>
                </button>

                {/* Expanded detail */}
                {entry.expanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-4">
                    {/* Scores */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">LASUCH Scores</p>
                      <ScoreBar label="R" value={entry.result.lasuch.risk_score} />
                      <ScoreBar label="M" value={entry.result.lasuch.manipulation_score} />
                      <ScoreBar label="E" value={entry.result.lasuch.exploit_score} />
                    </div>

                    {/* Flags */}
                    {entry.result.lasuch.flags.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Flags</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.result.lasuch.flags.map(f => (
                            <Badge key={f} variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CERBER */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CERBER</p>
                        <p className="text-xs font-mono">
                          Status:{' '}
                          <span className={
                            entry.result.cerber.survival_status === 'FAILED' ? 'text-red-400' :
                            entry.result.cerber.survival_status === 'SURVIVED' ? 'text-green-400' : 'text-yellow-400'
                          }>
                            {entry.result.cerber.survival_status}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Severity: <span className="font-mono">{entry.result.cerber.impact_simulation.severity}</span>
                        </p>
                        {entry.result.cerber.hidden_objective && (
                          <p className="text-[11px] text-muted-foreground italic">
                            "{entry.result.cerber.hidden_objective}"
                          </p>
                        )}
                      </div>

                      <div className="bg-secondary/30 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">GUARDIAN</p>
                        <p className="text-xs">
                          Decision: <DecisionBadge decision={entry.result.guardian.decision} />
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Mode: {entry.result.guardian.response_mode}
                        </p>
                        {entry.result.guardian.reason_codes.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {entry.result.guardian.reason_codes.slice(0, 3).map(rc => (
                              <Badge key={rc} variant="outline" className="text-[9px] border-muted text-muted-foreground">{rc}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CORE */}
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">CORE Scores</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono">
                        {Object.entries(entry.result.core.scores).map(([k, v]) => (
                          <div key={k} className="text-center">
                            <p className="text-muted-foreground text-[9px] uppercase">{k.replace('_score', '')}</p>
                            <p className={v > 0.5 ? 'text-yellow-400' : 'text-muted-foreground'}>{Math.round((v as number) * 100)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!scanning && entries.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <ScanLine className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-foreground font-medium mb-1">No scans yet</p>
          <p className="text-muted-foreground text-sm">
            Run the batch scan to analyse all {TEST_PROMPTS.length} built-in test prompts,
            or enter a custom prompt below.
          </p>
        </div>
      )}

      {/* Custom scan */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-base font-display font-semibold text-foreground tracking-wide">
            Custom Prompt Scan
          </h2>
        </div>

        <Textarea
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          placeholder="Enter any prompt to scan through the full ALFA pipeline…"
          className="font-mono text-sm resize-none h-24"
        />

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={runCustomScan}
            disabled={!customInput.trim() || customScanning}
            className="gap-2"
          >
            {customScanning ? (
              <>
                <ScanLine className="w-3.5 h-3.5 animate-pulse" />
                Scanning…
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Scan
              </>
            )}
          </Button>
          {customResult && (
            <div className="flex items-center gap-2">
              <DecisionBadge decision={customResult.final_decision} />
              {customResult.lasuch.flags.length > 0 ? (
                <span className="text-xs text-destructive font-mono">
                  {customResult.lasuch.flags.length} flag{customResult.lasuch.flags.length !== 1 ? 's' : ''} detected
                </span>
              ) : (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Clean
                </span>
              )}
              <span className="text-xs text-muted-foreground font-mono">
                {customResult.total_latency_ms}ms
              </span>
            </div>
          )}
        </div>

        {/* Custom result detail */}
        {customResult && (
          <div className="border border-border rounded-lg p-4 space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">LASUCH</p>
                <ScoreBar label="R" value={customResult.lasuch.risk_score} />
                <ScoreBar label="M" value={customResult.lasuch.manipulation_score} />
                <ScoreBar label="E" value={customResult.lasuch.exploit_score} />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CERBER</p>
                <p className="text-xs font-mono">
                  <span className={
                    customResult.cerber.survival_status === 'FAILED' ? 'text-red-400' :
                    customResult.cerber.survival_status === 'SURVIVED' ? 'text-green-400' : 'text-yellow-400'
                  }>
                    {customResult.cerber.survival_status}
                  </span>
                  {' — '}
                  <span className="text-muted-foreground">{customResult.cerber.impact_simulation.severity}</span>
                </p>
                {customResult.cerber.hidden_objective && (
                  <p className="text-[11px] text-muted-foreground italic">
                    "{customResult.cerber.hidden_objective}"
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">GUARDIAN</p>
                <DecisionBadge decision={customResult.final_decision} />
                <p className="text-xs text-muted-foreground font-mono">
                  mode: {customResult.guardian.response_mode}
                </p>
              </div>
            </div>

            {customResult.lasuch.flags.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Flags</p>
                <div className="flex flex-wrap gap-1">
                  {customResult.lasuch.flags.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {customResult.lasuch.suspected_hidden_intent && (
              <div className="bg-secondary/40 rounded p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Suspected Intent</p>
                <p className="text-xs text-muted-foreground italic">"{customResult.lasuch.suspected_hidden_intent}"</p>
              </div>
            )}

            {customResult.enhancement?.weaknesses && customResult.enhancement.weaknesses.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  ENHANCER — {customResult.enhancement.weaknesses.length} weakness{customResult.enhancement.weaknesses.length !== 1 ? 'es' : ''}
                </p>
                <div className="space-y-1.5">
                  {customResult.enhancement.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${
                        w.severity === 'high' ? 'text-red-400' : w.severity === 'medium' ? 'text-yellow-400' : 'text-muted-foreground'
                      }`} />
                      <span className="text-muted-foreground">{w.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── summary helper ───────────────────────────────────────────────────────────

function buildSummary(entries: ScanEntry[]) {
  const threats = entries.filter(e =>
    e.result.lasuch.flags.length > 0 || e.result.lasuch.risk_score > 0.3
  ).length;
  const blocked = entries.filter(e =>
    e.result.final_decision === 'BLOCK' || e.result.final_decision === 'HUMAN_REVIEW'
  ).length;
  const passed = entries.filter(e =>
    e.result.final_decision === 'PASS' || e.result.final_decision === 'LIMITED_PASS'
  ).length;
  return { threats, blocked, passed };
}
