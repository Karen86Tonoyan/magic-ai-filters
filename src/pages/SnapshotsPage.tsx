import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HallucinationSnapshotDB, type SnapshotRow } from '@/lib/pipeline/t9/snapshot-db';
import { Database, Trash2, Download, RefreshCw } from 'lucide-react';

const db = new HallucinationSnapshotDB();

type DecisionFilter = 'ALL' | 'BLOCK' | 'HOLD' | 'PASS';

export default function SnapshotsPage() {
  const [tick, setTick] = useState(0);
  const [decision, setDecision] = useState<DecisionFilter>('ALL');
  const [violation, setViolation] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const all = useMemo(() => db.list(), [tick]);
  const stats = useMemo(() => db.stats(), [tick]);

  const violationTypes = useMemo(() => {
    const set = new Set<string>();
    all.forEach((r) => r.overclaims.forEach((v) => set.add(v)));
    return Array.from(set).sort();
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (decision !== 'ALL' && r.final_decision !== decision) return false;
      if (violation !== 'ALL' && !r.overclaims.includes(violation)) return false;
      if (search && !r.user_input.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [all, decision, violation, search]);

  const refresh = () => setTick((t) => t + 1);

  const handleClear = () => {
    if (!confirm('Wyczyścić wszystkie snapshoty T9?')) return;
    db.clear();
    refresh();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alfa-t9-snapshots-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionVariant = (d: string) =>
    d === 'BLOCK' ? 'destructive' : d === 'HOLD' ? 'secondary' : 'default';

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold text-primary tracking-wider">
            T9 Snapshot Database
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            HallucinationSnapshotDB — historia trajektorii i naruszeń
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'BLOCK', value: stats.blocks },
          { label: 'HOLD', value: stats.holds },
          { label: 'Trusted Exec', value: stats.trusted },
          { label: 'Pass rate', value: `${stats.pass_rate}%` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{s.label}</p>
            <p className="text-2xl font-mono font-bold text-primary mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Szukaj</label>
            <Input
              placeholder="fragment promptu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[160px]">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Decyzja</label>
            <Select value={decision} onValueChange={(v) => setDecision(v as DecisionFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Wszystkie</SelectItem>
                <SelectItem value="BLOCK">BLOCK</SelectItem>
                <SelectItem value="HOLD">HOLD</SelectItem>
                <SelectItem value="PASS">PASS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Naruszenie</label>
            <Select value={violation} onValueChange={setViolation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Wszystkie typy</SelectItem>
                {violationTypes.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-1" /> Odśwież
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Export JSON
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={all.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" /> Wyczyść
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Pokazuję {filtered.length} z {all.length} snapshotów
        </p>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Predicted → Observed</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Naruszenia</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Brak snapshotów spełniających filtry.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r: SnapshotRow) => (
                  <TableRow key={r.id + r.timestamp}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs" title={r.user_input}>
                      {r.user_input}
                    </TableCell>
                    <TableCell className="text-xs">{r.intent}</TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {r.predicted_state} → {r.observed_state}
                    </TableCell>
                    <TableCell>
                      <Badge variant={decisionVariant(r.final_decision) as 'default' | 'secondary' | 'destructive'}>
                        {r.final_decision}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.overclaims.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          r.overclaims.map((v) => (
                            <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.filter_score.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
