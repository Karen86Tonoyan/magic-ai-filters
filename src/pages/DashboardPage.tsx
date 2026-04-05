import { Shield, Eye, BarChart3, AlertTriangle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TEST_PROMPTS } from '@/types/tonoyan-filters';
import { runLasuch } from '@/lib/pipeline/lasuch';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import type { LasuchResult } from '@/types/tonoyan-filters';

export default function DashboardPage() {
  const [quickResults, setQuickResults] = useState<{ id: string; label: string; result: LasuchResult }[]>([]);

  useEffect(() => {
    // Run ŁASUCH on all test prompts for quick stats
    const results = TEST_PROMPTS.map(tp => ({
      id: tp.id,
      label: tp.label,
      result: runLasuch(tp.prompt),
    }));
    setQuickResults(results);
  }, []);

  const blocked = quickResults.filter(r => r.result.risk_score > 0.3);
  const clean = quickResults.filter(r => r.result.flags.length === 0);
  const totalFlags = quickResults.reduce((sum, r) => sum + r.result.flags.length, 0);

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Filtry Tonoyana</h1>
        <p className="text-muted-foreground mt-1 text-sm">ALFA Core MVP — ŁASUCH → CERBER → GUARDIAN</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Test Prompts" value={TEST_PROMPTS.length} description="wbudowanych" variant="primary" />
        <StatCard icon={AlertTriangle} label="Wykryte zagrożenia" value={blocked.length} description={`z ${TEST_PROMPTS.length}`} variant="warning" />
        <StatCard icon={Activity} label="Wykryte flagi" value={totalFlags} description="łącznie" variant="accent" />
        <StatCard icon={Eye} label="Czyste" value={clean.length} description="bezpieczne" variant="info" />
      </div>

      {/* Quick ŁASUCH scan results */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground">⚡ ŁASUCH Quick Scan</h2>
        <div className="grid gap-3">
          {quickResults.map(({ id, label, result }) => (
            <div key={id} className={`bg-card border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
              result.flags.length > 0 ? 'border-destructive/20' : 'border-success/20'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{label}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.flags.length > 0 ? result.flags.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">{f}</Badge>
                  )) : (
                    <Badge variant="outline" className="text-[10px] font-mono border-success/30 text-success">CLEAN</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                <span className={result.risk_score > 0.3 ? 'text-destructive' : 'text-success'}>
                  R:{(result.risk_score * 100).toFixed(0)}%
                </span>
                <span className={result.manipulation_score > 0.3 ? 'text-warning' : 'text-muted-foreground'}>
                  M:{(result.manipulation_score * 100).toFixed(0)}%
                </span>
                <span className={result.exploit_score > 0.3 ? 'text-destructive' : 'text-muted-foreground'}>
                  E:{(result.exploit_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/analysis" className="bg-card border border-primary/20 rounded-xl p-6 hover:border-primary/50 transition-all text-center">
          <Eye className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Live Analysis</p>
          <p className="text-xs text-muted-foreground mt-1">Pełny pipeline</p>
        </Link>
        <Link to="/benchmark" className="bg-card border border-accent/20 rounded-xl p-6 hover:border-accent/50 transition-all text-center">
          <BarChart3 className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Benchmark Lab</p>
          <p className="text-xs text-muted-foreground mt-1">Raw vs Filtered</p>
        </Link>
        <Link to="/incidents" className="bg-card border border-warning/20 rounded-xl p-6 hover:border-warning/50 transition-all text-center">
          <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Incidents</p>
          <p className="text-xs text-muted-foreground mt-1">Review queue</p>
        </Link>
      </div>
    </div>
  );
}
