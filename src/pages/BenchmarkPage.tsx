import { useState } from 'react';
import { Play, BarChart3, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { TEST_PROMPTS } from '@/types/tonoyan-filters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PipelineResult } from '@/types/tonoyan-filters';

export default function BenchmarkPage() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<{ raw: PipelineResult | null; filtered: PipelineResult | null }>({ raw: null, filtered: null });
  const [isRunning, setIsRunning] = useState(false);

  const runBenchmark = async () => {
    if (!input.trim()) return;
    setIsRunning(true);

    const [raw, filtered] = await Promise.all([
      runPipeline(input, { mode: 'raw' }),
      runPipeline(input, { mode: 'filtered' }),
    ]);

    setResults({ raw, filtered });
    setIsRunning(false);
  };

  const loadTestPrompt = (id: string) => {
    const tp = TEST_PROMPTS.find(t => t.id === id);
    if (tp) setInput(tp.prompt);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            Benchmark Lab
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Raw vs Filtered — porównaj ten sam prompt</p>
        </div>
        {results.raw && (
          <Button variant="outline" onClick={exportJSON} className="gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
        <Select onValueChange={loadTestPrompt}>
          <SelectTrigger className="w-full sm:w-[220px] bg-secondary border-border">
            <SelectValue placeholder="Załaduj test prompt..." />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {TEST_PROMPTS.map(tp => (
              <SelectItem key={tp.id} value={tp.id}>{tp.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Wpisz prompt do benchmarku..."
          className="bg-secondary border-border font-mono text-sm min-h-[80px]"
        />

        <Button onClick={runBenchmark} disabled={!input.trim() || isRunning} className="w-full gradient-accent text-accent-foreground font-display gap-2">
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Benchmarking...' : 'Uruchom Benchmark'}
        </Button>
      </div>

      {results.raw && results.filtered && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* RAW */}
          <div className="bg-card border border-warning/20 rounded-xl p-4 sm:p-5">
            <h3 className="font-display font-semibold text-warning mb-4">⚡ RAW — Bez filtrów</h3>
            <div className="space-y-2 text-xs">
              <Row label="Decision" value={results.raw.final_decision} />
              <Row label="Risk Score" value={results.raw.lasuch.risk_score.toFixed(3)} />
              <Row label="Flags" value={results.raw.lasuch.flags.length.toString()} />
              <Row label="Latency" value={`${results.raw.total_latency_ms}ms`} />
              <Row label="Tokens" value={`~${results.raw.token_estimate}`} />
            </div>
          </div>

          {/* FILTERED */}
          <div className="bg-card border border-primary/20 rounded-xl p-4 sm:p-5">
            <h3 className="font-display font-semibold text-primary mb-4">🛡️ FILTERED — Z Filtrami Tonoyana</h3>
            <div className="space-y-2 text-xs">
              <Row label="Decision" value={results.filtered.final_decision} />
              <Row label="Risk Score" value={results.filtered.lasuch.risk_score.toFixed(3)} />
              <Row label="Manipulation" value={results.filtered.lasuch.manipulation_score.toFixed(3)} />
              <Row label="Exploit" value={results.filtered.lasuch.exploit_score.toFixed(3)} />
              <Row label="Cerber Status" value={results.filtered.cerber.survival_status} />
              <Row label="Cerber Iterations" value={results.filtered.cerber.iteration_count.toString()} />
              <Row label="Guardian" value={results.filtered.guardian.decision} />
              <Row label="Core Recommendation" value={results.filtered.core.recommendation.toUpperCase()} />
              <Row label="Latency" value={`${results.filtered.total_latency_ms}ms`} />
              <Row label="Tokens" value={`~${results.filtered.token_estimate}`} />
            </div>
            {results.filtered.lasuch.flags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {results.filtered.lasuch.flags.map(f => (
                  <Badge key={f} variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">{f}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Comparison Summary */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">📊 Porównanie</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Manipulation Resistance"
                raw={results.raw.lasuch.flags.length === 0 ? 'NONE' : 'EXPOSED'}
                filtered={results.filtered.final_decision === 'BLOCK' ? 'BLOCKED' : results.filtered.final_decision}
                filteredGood={results.filtered.final_decision === 'BLOCK' || results.filtered.final_decision === 'HOLD'}
              />
              <MetricCard
                label="Refusal Discipline"
                raw="N/A"
                filtered={results.filtered.cerber.survival_status === 'FAILED' ? 'STRONG' : results.filtered.cerber.survival_status === 'UNCERTAIN' ? 'MODERATE' : 'CLEAN'}
                filteredGood={results.filtered.cerber.survival_status === 'FAILED'}
              />
              <MetricCard
                label="Decision Quality"
                raw="No decision"
                filtered={results.filtered.guardian.reason_codes.join(', ') || 'CLEAN'}
                filteredGood={results.filtered.guardian.reason_codes.length > 0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function MetricCard({ label, raw, filtered, filteredGood }: { label: string; raw: string; filtered: string; filteredGood: boolean }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1">
        <p className="text-xs"><span className="text-warning">RAW:</span> <span className="font-mono">{raw}</span></p>
        <p className="text-xs"><span className="text-primary">FLT:</span> <span className={`font-mono ${filteredGood ? 'text-success' : 'text-foreground'}`}>{filtered}</span></p>
      </div>
    </div>
  );
}
