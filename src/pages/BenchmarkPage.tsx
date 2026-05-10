import { useEffect, useState } from 'react';
import { BarChart3, Download, Loader2, Play, Radar, ShieldCheck, Target } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BENCHMARK_CASES, BENCHMARK_SUITE_META } from '@/lib/benchmark/catalog';
import { loadStoredBenchmarkSnapshot, runBenchmarkCase, runBenchmarkSnapshot, storeBenchmarkSnapshot } from '@/lib/benchmark/metrics';
import type { BenchmarkCaseRun, BenchmarkSnapshot, BenchmarkSuiteId } from '@/types/tonoyan-filters';

const ALL_SUITES = 'all-suites';

export default function BenchmarkPage() {
  const [input, setInput] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(BENCHMARK_CASES[0]?.id ?? '');
  const [selectedSuite, setSelectedSuite] = useState<BenchmarkSuiteId | typeof ALL_SUITES>(ALL_SUITES);
  const [singleRun, setSingleRun] = useState<BenchmarkCaseRun | null>(null);
  const [snapshot, setSnapshot] = useState<BenchmarkSnapshot | null>(null);
  const [isRunningSingle, setIsRunningSingle] = useState(false);
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = loadStoredBenchmarkSnapshot();
    if (stored) setSnapshot(stored);
  }, []);

  const visibleCases = selectedSuite === ALL_SUITES
    ? BENCHMARK_CASES
    : BENCHMARK_CASES.filter((item) => item.suite === selectedSuite);

  const currentCase = BENCHMARK_CASES.find((item) => item.id === selectedCaseId) ?? BENCHMARK_CASES[0];
  const exportPayload = snapshot ?? singleRun;
  const suiteChartData = snapshot?.suite_summaries.map((suite) => ({
    name: suite.label.replace(' Resistance', '').replace(' Safety', '').replace(' Precision', ''),
    protection: Math.round(suite.avg_protection_score * 100),
    hallucination: Math.round(suite.avg_hallucination_risk * 100),
    passRate: Math.round((suite.passed_count / Math.max(1, suite.case_count)) * 100),
  })) ?? [];
  const failedCases = snapshot?.case_runs.filter((item) => !item.passed) ?? [];

  const loadCasePrompt = (caseId: string) => {
    const benchmarkCase = BENCHMARK_CASES.find((item) => item.id === caseId);
    setSelectedCaseId(caseId);
    if (benchmarkCase) setInput(benchmarkCase.prompt);
  };

  const runSingleBenchmark = async () => {
    if (!input.trim() || !currentCase) return;
    setError('');
    setIsRunningSingle(true);
    try {
      const benchmarkCase = { ...currentCase, prompt: input };
      const result = await runBenchmarkCase(benchmarkCase);
      setSingleRun(result);
    } catch {
      setError('Nie udało się uruchomić pojedynczego benchmarku.');
    } finally {
      setIsRunningSingle(false);
    }
  };

  const runSuiteBenchmark = async () => {
    setError('');
    setIsRunningSuite(true);
    try {
      const result = await runBenchmarkSnapshot(visibleCases);
      setSnapshot(result);
      storeBenchmarkSnapshot(result);
    } catch {
      setError('Nie udało się policzyć pełnego suite benchmarków.');
    } finally {
      setIsRunningSuite(false);
    }
  };

  const exportJSON = () => {
    if (!exportPayload) return;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `benchmark-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-up">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            Benchmark Lab
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Pełna matryca odporności: exploit, manipulacja, dual-use, zasoby i integralność modelu.</p>
        </div>
        {exportPayload && (
          <Button variant="outline" onClick={exportJSON} className="gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <Select value={selectedSuite} onValueChange={(value: BenchmarkSuiteId | typeof ALL_SUITES) => setSelectedSuite(value)}>
              <SelectTrigger className="w-full lg:w-[240px] bg-secondary border-border">
                <SelectValue placeholder="Wybierz suite..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value={ALL_SUITES}>Wszystkie benchmarki</SelectItem>
                {Object.entries(BENCHMARK_SUITE_META).map(([suiteId, meta]) => (
                  <SelectItem key={suiteId} value={suiteId}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCaseId} onValueChange={loadCasePrompt}>
              <SelectTrigger className="w-full bg-secondary border-border">
                <SelectValue placeholder="Załaduj benchmark case..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-[280px]">
                {visibleCases.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSuite !== ALL_SUITES && (
            <div className="rounded-lg border border-primary/15 bg-secondary/30 p-3">
              <p className="text-sm font-medium text-foreground">{BENCHMARK_SUITE_META[selectedSuite].label}</p>
              <p className="text-xs text-muted-foreground mt-1">{BENCHMARK_SUITE_META[selectedSuite].description}</p>
            </div>
          )}

          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Wpisz prompt do pojedynczego benchmarku..."
            className="bg-secondary border-border font-mono text-sm min-h-[120px]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={runSingleBenchmark} disabled={!input.trim() || isRunningSingle} className="gradient-accent text-accent-foreground font-display gap-2">
              {isRunningSingle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunningSingle ? 'Uruchamiam case...' : 'Pojedynczy benchmark'}
            </Button>
            <Button onClick={runSuiteBenchmark} disabled={isRunningSuite} variant="outline" className="gap-2 border-primary/30 text-primary">
              {isRunningSuite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              {isRunningSuite ? 'Liczę suite...' : `Uruchom suite (${visibleCases.length})`}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MetricTile label="Cases" value={snapshot?.total_cases ?? visibleCases.length} description="aktywny katalog" icon={Target} />
          <MetricTile label="Pass Rate" value={snapshot ? `${Math.round(snapshot.pass_rate * 100)}%` : '—'} description="zgodność z oczekiwaniem" icon={ShieldCheck} />
          <MetricTile label="Protection" value={snapshot ? `${Math.round(snapshot.avg_protection_score * 100)}%` : '—'} description="średnia obrona" icon={BarChart3} />
          <MetricTile label="Hallucination" value={snapshot ? `${Math.round(snapshot.avg_hallucination_risk * 100)}%` : '—'} description="ryzyko, im mniej tym lepiej" icon={Radar} />
        </div>
      </div>

      {snapshot && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground">Benchmark Snapshot</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Ostatni run: <span className="font-mono text-foreground">{new Date(snapshot.timestamp).toLocaleString()}</span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-mono border-success/30 text-success">
                  Passed: {snapshot.passed_count}/{snapshot.total_cases}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                  Avg latency: {snapshot.avg_latency_ms}ms
                </Badge>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={suiteChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="protection" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="passRate" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="hallucination" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {snapshot.suite_summaries.map((suite) => (
                <div key={suite.suite} className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold text-foreground">{suite.label}</p>
                      <p className="text-xs text-muted-foreground">{BENCHMARK_SUITE_META[suite.suite].description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                      {suite.passed_count}/{suite.case_count}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <SuiteValue label="Protection" value={`${Math.round(suite.avg_protection_score * 100)}%`} />
                    <SuiteValue label="Hallucination" value={`${Math.round(suite.avg_hallucination_risk * 100)}%`} />
                    <SuiteValue label="Blocked" value={suite.blocked_count} />
                    <SuiteValue label="Latency" value={`${suite.avg_latency_ms}ms`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Cases wymagające uwagi</h2>
            {failedCases.length === 0 ? (
              <p className="text-sm text-success">Pełny snapshot przeszedł bez odchyleń od oczekiwań.</p>
            ) : (
              <div className="grid gap-3">
                {failedCases.map((item) => (
                  <div key={item.case_id} className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected: <span className="font-mono text-foreground">{item.expected_decision}</span>
                          {' · '}
                          Actual: <span className="font-mono text-warning">{item.actual_decision}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono border-warning/30 text-warning">
                        {BENCHMARK_SUITE_META[item.suite].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {singleRun && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RunPanel title="RAW" accent="warning" result={singleRun.raw} />
          <RunPanel title="FILTERED" accent="primary" result={singleRun.filtered} />
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Ocena benchmarku</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
              <MetricCard label="Decision Quality" value={singleRun.metrics.decision_quality} />
              <MetricCard label="Manipulation Resistance" value={singleRun.metrics.manipulation_resistance} />
              <MetricCard label="Refusal Discipline" value={singleRun.metrics.refusal_discipline} />
              <MetricCard label="Usefulness" value={singleRun.metrics.response_usefulness} />
              <MetricCard label="Uncertainty" value={singleRun.metrics.uncertainty_handling} />
              <MetricCard label="Hallucination Risk" value={1 - singleRun.metrics.hallucination_risk} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function SuiteValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground mt-1">{value}</p>
    </div>
  );
}

function RunPanel({ title, accent, result }: { title: string; accent: 'warning' | 'primary'; result: BenchmarkCaseRun['raw'] }) {
  return (
    <div className={`bg-card border rounded-xl p-4 sm:p-5 ${accent === 'warning' ? 'border-warning/20' : 'border-primary/20'}`}>
      <h3 className={`font-display font-semibold mb-4 ${accent === 'warning' ? 'text-warning' : 'text-primary'}`}>{title}</h3>
      <div className="space-y-2 text-xs">
        <Row label="Decision" value={result.final_decision} />
        <Row label="Risk Score" value={result.lasuch.risk_score.toFixed(3)} />
        <Row label="Manipulation" value={result.lasuch.manipulation_score.toFixed(3)} />
        <Row label="Exploit" value={result.lasuch.exploit_score.toFixed(3)} />
        <Row label="Cerber" value={result.cerber.survival_status} />
        <Row label="Latency" value={`${result.total_latency_ms}ms`} />
        <Row label="Tokens" value={`~${result.token_estimate}`} />
      </div>
      {result.lasuch.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {result.lasuch.flags.map((flag) => (
            <Badge key={flag} variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">
              {flag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground text-right">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <p className="text-lg font-display font-semibold text-foreground">{Math.round(value * 100)}%</p>
    </div>
  );
}
