import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Eye, Loader2, Shield, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { BENCHMARK_CASES, BENCHMARK_SUITE_META } from '@/lib/benchmark/catalog';
import { loadStoredBenchmarkSnapshot, runBenchmarkSnapshot, storeBenchmarkSnapshot } from '@/lib/benchmark/metrics';
import type { BenchmarkSnapshot } from '@/types/tonoyan-filters';

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<BenchmarkSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = loadStoredBenchmarkSnapshot();
    if (stored) {
      setSnapshot(stored);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError('');

    runBenchmarkSnapshot()
      .then((result) => {
        if (!active) return;
        setSnapshot(result);
        storeBenchmarkSnapshot(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Nie udało się załadować benchmark snapshotu.');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const suiteChartData = snapshot?.suite_summaries.map((suite) => ({
    name: suite.label.replace(' Resistance', '').replace(' Safety', '').replace(' Precision', ''),
    protection: Math.round(suite.avg_protection_score * 100),
    passRate: Math.round((suite.passed_count / Math.max(1, suite.case_count)) * 100),
  })) ?? [];

  const topCriticalCases = snapshot?.case_runs
    .filter((item) => item.expected_decision === 'BLOCK' || item.expected_decision === 'HOLD')
    .slice(0, 6) ?? [];

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-wider">ALFA</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pipeline Control System - benchmark-first hardening dla LASUCH / CERBER / GUARDIAN.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Benchmark Cases" value={snapshot?.total_cases ?? BENCHMARK_CASES.length} description="pełna matryca" variant="primary" />
        <StatCard icon={Target} label="Pass Rate" value={snapshot ? `${Math.round(snapshot.pass_rate * 100)}%` : '...'} description="zgodność z oczekiwaniem" variant="warning" />
        <StatCard icon={Activity} label="Protection" value={snapshot ? `${Math.round(snapshot.avg_protection_score * 100)}%` : '...'} description="średnia obrona" variant="accent" />
        <StatCard icon={Eye} label="Hallucination" value={snapshot ? `${Math.round(snapshot.avg_hallucination_risk * 100)}%` : '...'} description="ryzyko średnie" variant="info" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground tracking-wide">Benchmark Overview</h2>
              <p className="text-xs text-muted-foreground mt-1">Jedna wspólna matryca benchmarków zasila dashboard i Benchmark Lab.</p>
            </div>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>

          {snapshot ? (
            <>
              <div className="h-[260px] w-full">
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
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {snapshot.suite_summaries.map((suite) => (
                  <div key={suite.suite} className="rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-semibold text-foreground">{suite.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{BENCHMARK_SUITE_META[suite.suite].description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                        {suite.passed_count}/{suite.case_count}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                      <SuiteMetric label="Protection" value={`${Math.round(suite.avg_protection_score * 100)}%`} />
                      <SuiteMetric label="Latency" value={`${suite.avg_latency_ms}ms`} />
                      <SuiteMetric label="Blocked" value={suite.blocked_count} />
                      <SuiteMetric label="Limited" value={suite.limited_count} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">{error || 'Ładuję snapshot benchmarków dla dashboardu...'}</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground tracking-wide">Critical Cases</h2>
            <p className="text-xs text-muted-foreground mt-1">Najważniejsze przypadki odporności, które powinny być stale monitorowane.</p>
          </div>

          <div className="grid gap-3">
            {topCriticalCases.map((item) => (
              <div key={item.case_id} className={`rounded-lg border p-4 ${
                item.actual_decision === item.expected_decision ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{BENCHMARK_SUITE_META[item.suite].label}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-mono ${
                    item.actual_decision === item.expected_decision ? 'border-success/30 text-success' : 'border-warning/30 text-warning'
                  }`}>
                    {item.actual_decision}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.filtered.lasuch.flags.slice(0, 4).map((flag) => (
                    <Badge key={flag} variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground tracking-wide">ALFA - Pipeline Control</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Definition</p>
              <p className="text-muted-foreground text-xs">ALFA nie próbuje „robić modelu mądrzejszym”. ALFA buduje warstwę odporności, która mierzy ryzyko, integralność i jakość decyzji zanim model dostanie prawo odpowiedzi.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Scalability</p>
              <ul className="text-muted-foreground text-xs space-y-0.5 list-none">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">-</span> Wspólny snapshot benchmarków dla dashboardu i laboratorium</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">-</span> Suite’y grupujące exploit, manipulację, dual-use, zasoby i integralność</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">-</span> Metryki ochrony gotowe do dalszej rozbudowy i eksportu</li>
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Pipeline</p>
              <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                <Badge variant="outline" className="border-primary/30 text-primary">LASUCH</Badge>
                <span className="text-muted-foreground">/</span>
                <Badge variant="outline" className="border-accent/30 text-accent">CERBER</Badge>
                <span className="text-muted-foreground">/</span>
                <Badge variant="outline" className="border-primary/30 text-primary">GUARDIAN</Badge>
                <span className="text-muted-foreground">/</span>
                <Badge variant="outline" className="border-gold-dark text-gold-light">ENHANCER</Badge>
                <span className="text-muted-foreground">/</span>
                <Badge variant="outline" className="border-info/30 text-info">BENCHMARKS</Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-1">Każdy suite benchmarków mierzy inny sposób obejścia systemu i podaje ten wynik z powrotem na dashboard.</p>
            </div>
            <div className="bg-card border border-primary/15 rounded-lg p-3">
              <p className="text-primary font-semibold text-xs uppercase tracking-wider">ALFA Edge</p>
              <p className="text-muted-foreground text-[11px]">Benchmarki są już częścią produktu, a nie tylko testem developerskim. Dzięki temu odporność można obserwować tak samo jak latency i pass rate.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/analysis" className="bg-card border border-primary/15 rounded-xl p-6 hover:border-primary/30 transition-all text-center">
          <Eye className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Live Analysis</p>
          <p className="text-xs text-muted-foreground mt-1">Full pipeline</p>
        </Link>
        <Link to="/benchmark" className="bg-card border border-primary/15 rounded-xl p-6 hover:border-primary/30 transition-all text-center">
          <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Benchmark Lab</p>
          <p className="text-xs text-muted-foreground mt-1">Suite matrix</p>
        </Link>
        <Link to="/incidents" className="bg-card border border-accent/15 rounded-xl p-6 hover:border-accent/30 transition-all text-center">
          <AlertTriangle className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Incidents</p>
          <p className="text-xs text-muted-foreground mt-1">Review queue</p>
        </Link>
      </div>
    </div>
  );
}

function SuiteMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground mt-1">{value}</p>
    </div>
  );
}
