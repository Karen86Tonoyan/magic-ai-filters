import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, RefreshCw, Activity, Bug, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  clearDiagnostics,
  getDiagnostics,
  subscribeDiagnostics,
  isLazyDebugEnabled,
  setLazyDebugEnabled,
  isSilentModeEnabled,
  setSilentModeEnabled,
  getLazyStats,
  type DiagEntry,
  type DiagSeverity,
} from '@/lib/diagnostics';

const SEVERITY_STYLES: Record<DiagSeverity, string> = {
  INFO: 'border-info/30 text-info',
  WARN: 'border-warning/30 text-warning',
  ERROR: 'border-destructive/30 text-destructive',
};

export default function DiagnosticsPage() {
  const [items, setItems] = useState<DiagEntry[]>(() => getDiagnostics());
  const [filter, setFilter] = useState<DiagSeverity | 'ALL'>('ALL');
  const [debug, setDebug] = useState<boolean>(() => isLazyDebugEnabled());
  const [silent, setSilent] = useState<boolean>(() => isSilentModeEnabled());
  const [stats, setStats] = useState(() => getLazyStats());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    subscribeDiagnostics((next) => { setItems(next); setStats(getLazyStats()); });
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && items.some((i) => i.id === hash)) {
      setHighlightedId(hash);
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [items]);

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.severity === filter);
  const counts = items.reduce(
    (acc, i) => ({ ...acc, [i.severity]: (acc[i.severity] ?? 0) + 1 }),
    {} as Record<DiagSeverity, number>,
  );

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-wider">
            DIAGNOSTYKA
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Telemetria ładowania dynamicznych modułów (lazy import), uncaught errors i unhandled rejections.
            Bufor: 200 wpisów, persist w localStorage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setItems(getDiagnostics())} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Odśwież
          </Button>
          <Button variant="destructive" size="sm" onClick={clearDiagnostics} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Wyczyść
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total" value={items.length} icon={Activity} active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
        <StatTile label="Errors" value={counts.ERROR ?? 0} icon={AlertTriangle} variant="destructive" active={filter === 'ERROR'} onClick={() => setFilter('ERROR')} />
        <StatTile label="Warnings" value={counts.WARN ?? 0} icon={AlertTriangle} variant="warning" active={filter === 'WARN'} onClick={() => setFilter('WARN')} />
        <StatTile label="Info" value={counts.INFO ?? 0} icon={Activity} variant="info" active={filter === 'INFO'} onClick={() => setFilter('INFO')} />
      </div>

      <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" />
            <Label htmlFor="lazy-debug" className="text-sm font-display tracking-wider text-primary cursor-pointer">
              DEBUG LAZY IMPORTÓW
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground font-mono">
              {debug ? 'ON — meta: start/finish/retry' : 'OFF — minimalna telemetria'}
            </span>
            <Switch
              id="lazy-debug"
              checked={debug}
              onCheckedChange={(v) => { setLazyDebugEnabled(v); setDebug(v); }}
            />
          </div>
        </div>
        {stats.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-1 pr-3">Moduł</th>
                  <th className="py-1 pr-3">Att</th>
                  <th className="py-1 pr-3">Retry</th>
                  <th className="py-1 pr-3">OK</th>
                  <th className="py-1 pr-3">Fail</th>
                  <th className="py-1 pr-3">Last ms</th>
                  <th className="py-1 pr-3">Start</th>
                  <th className="py-1 pr-3">Finish</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.name} className="border-b border-border/40">
                    <td className="py-1 pr-3 text-foreground">{s.name}</td>
                    <td className="py-1 pr-3">{s.attempts}</td>
                    <td className={`py-1 pr-3 ${s.retries > 0 ? 'text-warning' : ''}`}>{s.retries}</td>
                    <td className="py-1 pr-3 text-info">{s.successes}</td>
                    <td className={`py-1 pr-3 ${s.failures > 0 ? 'text-destructive' : ''}`}>{s.failures}</td>
                    <td className="py-1 pr-3">{s.lastDurationMs ?? '—'}</td>
                    <td className="py-1 pr-3 text-muted-foreground">{s.lastStart ? new Date(s.lastStart).toLocaleTimeString() : '—'}</td>
                    <td className="py-1 pr-3 text-muted-foreground">{s.lastFinish ? new Date(s.lastFinish).toLocaleTimeString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Brak wpisów. Pipeline czysty — żadne moduły nie zgłosiły błędu fetch.
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              id={entry.id}
              className={`rounded-xl border bg-card p-4 space-y-2 transition-all ${
                entry.id === highlightedId ? 'ring-2 ring-destructive/50 bg-destructive/5' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] font-mono ${SEVERITY_STYLES[entry.severity]}`}>
                    {entry.severity}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    {entry.source}
                  </Badge>
                  {entry.status !== undefined && (
                    <Badge variant="outline" className="text-[10px] font-mono border-accent/30 text-accent">
                      status: {String(entry.status)}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(entry.timestamp).toISOString()}
                </span>
              </div>
              <p className="text-sm text-foreground font-medium break-words">{entry.message}</p>
              {entry.url && (
                <p className="text-[11px] font-mono text-muted-foreground break-all">
                  URL: <span className="text-foreground">{entry.url}</span>
                </p>
              )}
              {entry.meta && Object.keys(entry.meta).length > 0 && (
                <pre className="text-[11px] font-mono text-muted-foreground bg-secondary/40 border border-border rounded-md p-2 overflow-auto">
                  {JSON.stringify(entry.meta, null, 2)}
                </pre>
              )}
              {entry.stack && (
                <details className="text-[11px]">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Stack trace</summary>
                  <pre className="font-mono text-muted-foreground bg-secondary/40 border border-border rounded-md p-2 overflow-auto mt-1 max-h-60">
                    {entry.stack}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  variant = 'primary',
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'destructive' | 'warning' | 'info';
  active?: boolean;
  onClick?: () => void;
}) {
  const colorMap = {
    primary: 'text-primary border-primary/30',
    destructive: 'text-destructive border-destructive/30',
    warning: 'text-warning border-warning/30',
    info: 'text-info border-info/30',
  } as const;
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border bg-card p-4 transition-all hover:bg-secondary/30 ${
        active ? 'ring-2 ring-primary/40' : ''
      } ${colorMap[variant]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-display font-bold mt-2">{value}</p>
    </button>
  );
}
