import { useEffect, useMemo, useState } from 'react';
import { loadAllRuns, RunManifest } from '@/lib/rc21/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const MISSING = <span className="text-muted-foreground italic">missing</span>;

function decisionBadge(d: string) {
  if (d === 'ALLOW') return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">ALLOW</Badge>;
  if (d === 'REJECT') return <Badge className="bg-red-600 hover:bg-red-600 text-white">REJECT</Badge>;
  return <Badge variant="outline">{d}</Badge>;
}

function gateBadge(g: string | null) {
  if (!g) return <span className="text-muted-foreground">—</span>;
  if (g === 'schema_gate') return <Badge className="bg-orange-500 hover:bg-orange-500 text-white">{g}</Badge>;
  return <Badge variant="destructive">{g}</Badge>;
}

export default function RC21DashboardPage() {
  const [runs, setRuns] = useState<RunManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [filterReject, setFilterReject] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStrict, setFilterStrict] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadAllRuns()
      .then(r => { setRuns(r); setSelectedId(r[0]?.run_id ?? null); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => runs.filter(r =>
    (filterDecision === 'all' || r.decision === filterDecision) &&
    (filterReject === 'all' || (r.reject_type ?? 'none') === filterReject) &&
    (filterSource === 'all' || r.source === filterSource) &&
    (filterStrict === 'all' || String(r.strict_passed) === filterStrict)
  ), [runs, filterDecision, filterReject, filterSource, filterStrict]);

  const selected = runs.find(r => r.run_id === selectedId) ?? null;

  const metrics = useMemo(() => {
    if (!runs.length) return null;
    const total = runs.length;
    const reject = runs.filter(r => r.decision === 'REJECT').length;
    const schemaValid = runs.filter(r => r.schema_valid).length;
    const withEvidence = runs.filter(r => r.evidence_count > 0).length;
    const avgConf = runs.reduce((s, r) => s + r.confidence, 0) / total;
    const avgLat = runs.reduce((s, r) => s + r.latency_ms, 0) / total;
    return {
      reject_rate: reject / total,
      schema_valid_rate: schemaValid / total,
      evidence_coverage: withEvidence / total,
      avg_confidence: avgConf,
      avg_latency: avgLat,
    };
  }, [runs]);

  const bySource = useMemo(() => {
    const map = new Map<string, RunManifest[]>();
    runs.forEach(r => { (map.get(r.source) ?? map.set(r.source, []).get(r.source)!).push(r); });
    return Array.from(map.entries()).map(([source, rs]) => ({
      source,
      reject_rate: rs.filter(x => x.decision === 'REJECT').length / rs.length,
      schema_valid_rate: rs.filter(x => x.schema_valid).length / rs.length,
      evidence_coverage: rs.filter(x => x.evidence_count > 0).length / rs.length,
      avg_confidence: rs.reduce((s, x) => s + x.confidence, 0) / rs.length,
      avg_latency: rs.reduce((s, x) => s + x.latency_ms, 0) / rs.length,
    }));
  }, [runs]);

  const decisionPie = useMemo(() => {
    const a = runs.filter(r => r.decision === 'ALLOW').length;
    const r = runs.filter(r => r.decision === 'REJECT').length;
    return [
      { name: 'ALLOW', value: a, color: 'hsl(142 71% 45%)' },
      { name: 'REJECT', value: r, color: 'hsl(0 72% 51%)' },
    ];
  }, [runs]);

  const latencyTrend = useMemo(() =>
    [...runs].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map(r => ({ run: r.run_id, latency: r.latency_ms, confidence: Math.round(r.confidence * 100) })),
    [runs]
  );

  const rejectTypes = Array.from(new Set(runs.map(r => r.reject_type ?? 'none')));
  const sources = Array.from(new Set(runs.map(r => r.source)));

  if (loading) return <div className="p-8 text-muted-foreground">Loading RC2.1 artifacts…</div>;
  if (error) return <div className="p-8 text-destructive">Failed to load: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary tracking-wider">RC2.1 SAFETY DASHBOARD</h1>
          <p className="text-sm text-muted-foreground tracking-widest uppercase mt-1">
            Reject-First · Evidence-Verified · Schema-Gated
          </p>
        </div>
        <div className="flex gap-2 text-xs font-mono">
          <Badge variant="outline" className="border-emerald-600/40">ALLOW {decisionPie[0].value}</Badge>
          <Badge variant="outline" className="border-red-600/40">REJECT {decisionPie[1].value}</Badge>
          <Badge variant="outline">runs {runs.length}</Badge>
        </div>
      </header>

      <Tabs defaultValue="runs" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="runs">Runs History</TabsTrigger>
          <TabsTrigger value="details">Run Details</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="metrics">Safety Metrics</TabsTrigger>
        </TabsList>

        {/* RUNS HISTORY */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Decision" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All decisions</SelectItem>
                  <SelectItem value="ALLOW">ALLOW</SelectItem>
                  <SelectItem value="REJECT">REJECT</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterReject} onValueChange={setFilterReject}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Reject type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reject types</SelectItem>
                  {rejectTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStrict} onValueChange={setFilterStrict}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Strict passed" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Strict: any</SelectItem>
                  <SelectItem value="true">strict_passed: true</SelectItem>
                  <SelectItem value="false">strict_passed: false</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left p-3">Run</th>
                      <th className="text-left p-3">Decision</th>
                      <th className="text-left p-3">Failed gate</th>
                      <th className="text-left p-3">Reject type</th>
                      <th className="text-right p-3">Confidence</th>
                      <th className="text-right p-3">Evidence</th>
                      <th className="text-right p-3">Latency</th>
                      <th className="text-left p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.run_id}
                          onClick={() => setSelectedId(r.run_id)}
                          className={`border-t border-border cursor-pointer hover:bg-muted/30 ${selectedId === r.run_id ? 'bg-muted/40' : ''}`}>
                        <td className="p-3 font-mono">{r.run_id}{r.false_accept_critical && <Badge className="ml-2 bg-red-700">false_accept_critical</Badge>}</td>
                        <td className="p-3">{decisionBadge(r.decision)}</td>
                        <td className="p-3">{gateBadge(r.failed_gate)}</td>
                        <td className="p-3 text-xs">{r.reject_type ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-3 text-right font-mono">{(r.confidence * 100).toFixed(1)}%</td>
                        <td className="p-3 text-right font-mono">{r.evidence_count}</td>
                        <td className="p-3 text-right font-mono">{r.latency_ms}ms</td>
                        <td className="p-3 text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No runs match filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RUN DETAILS */}
        <TabsContent value="details" className="space-y-4">
          {!selected ? (
            <Card><CardContent className="p-6 text-muted-foreground">Select a run from Runs History.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-mono">
                    {selected.run_id}
                    {decisionBadge(selected.decision)}
                    {selected.false_accept_critical && <Badge className="bg-red-700">false_accept_critical</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <Field label="schema_version" value={selected.schema_version} />
                  <Field label="failed_gate" value={selected.failed_gate ?? null} render={v => v ? gateBadge(v) : MISSING} />
                  <Field label="reject_type" value={selected.reject_type} />
                  <Field label="reject_reason" value={selected.reject_reason} />
                  <Field label="confidence" value={`${(selected.confidence * 100).toFixed(1)}%`} />
                  <Field label="evidence_count" value={selected.evidence_count} />
                  <Field label="latency_ms" value={`${selected.latency_ms}ms`} />
                  <Field label="source" value={selected.source} />
                  <Field label="strict_passed" value={String(selected.strict_passed)} />
                  <Field label="schema_valid" value={String(selected.schema_valid)} />
                  <Field label="query" value={selected.query} />
                  <Field label="timestamp" value={new Date(selected.timestamp).toLocaleString()} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Full run_manifest.json</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <pre className="text-xs font-mono bg-muted/30 rounded p-4 overflow-x-auto">
                      {JSON.stringify(selected, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* EVIDENCE EXPLORER */}
        <TabsContent value="evidence" className="space-y-4">
          {!selected ? (
            <Card><CardContent className="p-6 text-muted-foreground">Select a run first.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">evidence_paths · {selected.evidence_paths.length}</CardTitle></CardHeader>
                <CardContent className="space-y-1 font-mono text-xs">
                  {selected.evidence_paths.length === 0 && MISSING}
                  {selected.evidence_paths.map((p, i) => (
                    <div key={i} className="px-2 py-1 rounded bg-muted/30">{p}</div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">matched_sections</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {selected.matched_sections.length === 0 && MISSING}
                  {selected.matched_sections.map(s => (
                    <div key={s.section_id} className="border border-border rounded p-3">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <span>{s.parent}</span>
                        <span>›</span>
                        <span className="text-primary">{s.section_id}</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">depth {s.depth}</Badge>
                      </div>
                      <div className="text-sm font-medium mt-1">{s.title}</div>
                      <p className="text-xs text-muted-foreground mt-2">{s.content_preview}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* SAFETY METRICS */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard label="Reject rate" value={`${(metrics.reject_rate * 100).toFixed(1)}%`} tone="danger" />
              <MetricCard label="Schema valid" value={`${(metrics.schema_valid_rate * 100).toFixed(1)}%`} tone="warn" />
              <MetricCard label="Evidence coverage" value={`${(metrics.evidence_coverage * 100).toFixed(1)}%`} tone="ok" />
              <MetricCard label="Avg confidence" value={`${(metrics.avg_confidence * 100).toFixed(1)}%`} tone="ok" />
              <MetricCard label="Avg latency" value={`${metrics.avg_latency.toFixed(0)}ms`} tone="neutral" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Decision distribution</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={decisionPie} dataKey="value" nameKey="name" outerRadius={90} label>
                      {decisionPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Latency & confidence trend</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={latencyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="run" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="l" dataKey="latency" stroke="hsl(0 72% 51%)" name="latency_ms" />
                    <Line yAxisId="r" dataKey="confidence" stroke="hsl(45 93% 50%)" name="confidence %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Per-source metrics</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={bySource.map(s => ({
                    source: s.source,
                    reject_rate: +(s.reject_rate * 100).toFixed(1),
                    schema_valid_rate: +(s.schema_valid_rate * 100).toFixed(1),
                    evidence_coverage: +(s.evidence_coverage * 100).toFixed(1),
                    avg_confidence: +(s.avg_confidence * 100).toFixed(1),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reject_rate" fill="hsl(0 72% 51%)" />
                    <Bar dataKey="schema_valid_rate" fill="hsl(25 95% 53%)" />
                    <Bar dataKey="evidence_coverage" fill="hsl(142 71% 45%)" />
                    <Bar dataKey="avg_confidence" fill="hsl(45 93% 50%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, render }: { label: string; value: any; render?: (v: any) => React.ReactNode }) {
  const isMissing = value === null || value === undefined || value === '';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-mono mt-1">
        {isMissing ? MISSING : (render ? render(value) : String(value))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' }) {
  const colors = {
    ok: 'border-emerald-600/40 text-emerald-500',
    warn: 'border-orange-500/40 text-orange-500',
    danger: 'border-red-600/40 text-red-500',
    neutral: 'border-border text-foreground',
  }[tone];
  return (
    <Card className={`border ${colors}`}>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-2xl font-mono mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
