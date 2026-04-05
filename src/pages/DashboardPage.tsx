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
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-wider">ALFA</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pipeline Control System — LASUCH / CERBER / GUARDIAN</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Test Prompts" value={TEST_PROMPTS.length} description="built-in" variant="primary" />
        <StatCard icon={AlertTriangle} label="Threats Detected" value={blocked.length} description={`of ${TEST_PROMPTS.length}`} variant="warning" />
        <StatCard icon={Activity} label="Flags Raised" value={totalFlags} description="total" variant="accent" />
        <StatCard icon={Eye} label="Clean" value={clean.length} description="passed" variant="info" />
      </div>

      {/* Quick scan */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground tracking-wide">LASUCH Quick Scan</h2>
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
                <span className={result.manipulation_score > 0.3 ? 'text-primary' : 'text-muted-foreground'}>
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

      {/* ALFA — Architecture */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground tracking-wide">ALFA — Pipeline Control</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Definition</p>
              <p className="text-muted-foreground text-xs">LLMs do not understand — they simulate responses via statistics. ALFA does not increase model intelligence, it <span className="text-primary font-medium">controls model behavior</span> through input validation, interpretation correction and output filtration.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Problem</p>
              <ul className="text-muted-foreground text-xs space-y-0.5 list-none">
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">—</span> LLMs hallucinate and fabricate missing data</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">—</span> Simulate empathy and logic without world model</li>
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">—</span> Risk: false decisions, user manipulation, fake comprehension</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-accent mb-1 text-xs uppercase tracking-wider">Critical Rule</p>
              <ul className="text-muted-foreground text-xs space-y-0.5 list-none">
                <li className="flex items-start gap-2"><span className="text-accent mt-0.5">—</span> Guardian <span className="text-accent font-medium">CANNOT</span> alter user intent</li>
                <li className="flex items-start gap-2"><span className="text-accent mt-0.5">—</span> Enhancer <span className="text-accent font-medium">CANNOT</span> inject data absent from input</li>
                <li className="flex items-start gap-2"><span className="text-accent mt-0.5">—</span> System detects when model fakes understanding</li>
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
                <Badge variant="outline" className="border-info/30 text-info">MODEL</Badge>
              </div>
              <p className="text-muted-foreground text-xs mt-1">Model is not truth source — it is a proposal generator.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1 text-xs uppercase tracking-wider">Output Validation</p>
              <ol className="text-muted-foreground text-xs space-y-0.5 list-decimal list-inside">
                <li>Does it follow from input?</li>
                <li>Does it contain assumptions?</li>
                <li>Does it violate scope?</li>
                <li>Is it a hallucination?</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-1">If no — <span className="text-accent font-medium">BLOCK</span> or force clarification.</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="font-semibold text-foreground text-xs mb-1">Test: "give data"</p>
              <p className="text-muted-foreground text-[11px] font-mono">Lasuch: ambiguity / Guardian: no context / Cerber: CLARIFY</p>
              <p className="text-primary text-[11px] font-mono mt-1">Output: "Which data do you mean?"</p>
            </div>
            <div className="bg-card border border-primary/15 rounded-lg p-3">
              <p className="text-primary font-semibold text-xs uppercase tracking-wider">ALFA Edge</p>
              <p className="text-muted-foreground text-[11px]">Most systems improve AI responses. ALFA controls <span className="font-medium text-foreground">whether AI has the right to respond</span>.</p>
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
          <p className="text-xs text-muted-foreground mt-1">Raw vs Filtered</p>
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
