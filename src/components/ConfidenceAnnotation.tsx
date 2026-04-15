import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, AlertTriangle, Brain, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { PipelineResult } from '@/types/tonoyan-filters';

// ─── Annotation Types ────────────────────────────────────────

export type AnnotationLabel = 'true_positive' | 'false_positive' | 'true_negative' | 'false_negative';

export interface Annotation {
  id: string;
  input_hash: string;
  label: AnnotationLabel;
  decision: string;
  risk_score: number;
  note: string;
  timestamp: string;
}

function loadAnnotations(): Annotation[] {
  try {
    return JSON.parse(localStorage.getItem('alfa_annotations') || '[]');
  } catch { return []; }
}

function saveAnnotations(a: Annotation[]) {
  localStorage.setItem('alfa_annotations', JSON.stringify(a));
}

// ─── Confidence & Escalation Panel ───────────────────────────

interface ConfidenceEscalationProps {
  result: PipelineResult;
}

export function ConfidenceEscalationPanel({ result }: ConfidenceEscalationProps) {
  const escalationReasons = buildEscalationReasons(result);
  const overallConfidence = computeOverallConfidence(result);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        Confidence & Escalation
      </h3>

      {/* Confidence meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Pipeline Confidence</span>
          <span className={`text-sm font-mono font-bold ${
            overallConfidence > 0.7 ? 'text-success' : overallConfidence > 0.4 ? 'text-warning' : 'text-destructive'
          }`}>
            {(overallConfidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              overallConfidence > 0.7 ? 'bg-success' : overallConfidence > 0.4 ? 'bg-warning' : 'bg-destructive'
            }`}
            style={{ width: `${overallConfidence * 100}%` }}
          />
        </div>
      </div>

      {/* Escalation reasons */}
      {escalationReasons.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-warning flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Escalation Triggers ({escalationReasons.length})
          </p>
          <div className="space-y-1">
            {escalationReasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg p-2">
                <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                <p className="text-[11px] text-warning">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {escalationReasons.length === 0 && (
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-2">
          <ShieldCheck className="w-3 h-3 text-success" />
          <p className="text-[11px] text-success">No escalation triggers — standard processing</p>
        </div>
      )}

      {/* Module confidence breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ConfidenceChip label="ŁASUCH" value={result.lasuch.confidence} />
        <ConfidenceChip label="Tagger" value={result.tagger.confidence} />
        <ConfidenceChip label="Core" value={result.core.scores.confidence_score} />
        {result.deliberation && (
          <ConfidenceChip label="Brain" value={result.deliberation.consensus_score} />
        )}
      </div>
    </div>
  );
}

function ConfidenceChip({ label, value }: { label: string; value: number }) {
  const color = value > 0.7 ? 'text-success border-success/30' : value > 0.4 ? 'text-warning border-warning/30' : 'text-destructive border-destructive/30';
  return (
    <div className={`border rounded-lg p-2 text-center ${color}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-mono font-bold">{(value * 100).toFixed(0)}%</p>
    </div>
  );
}

function buildEscalationReasons(result: PipelineResult): string[] {
  const reasons: string[] = [];

  if (result.lasuch.risk_score > 0.6)
    reasons.push(`risk_score > 0.6 (${(result.lasuch.risk_score * 100).toFixed(0)}%) — high threat detected by ŁASUCH`);

  if (result.lasuch.manipulation_score > 0.5)
    reasons.push(`manipulation_score > 0.5 — psychological manipulation pattern detected`);

  if (result.lasuch.flags.length >= 3)
    reasons.push(`${result.lasuch.flags.length} flags raised — multi-vector attack suspected`);

  if (result.cerber.needs_human)
    reasons.push(`CERBER flagged for human review — intent too complex for auto-resolution`);

  if (result.cerber.survival_status === 'FAILED')
    reasons.push(`CERBER intent destruction FAILED — attack survived all ${result.cerber.iteration_count} iterations`);

  if (result.tagger.confidence < 0.4)
    reasons.push(`Low tagger confidence (${(result.tagger.confidence * 100).toFixed(0)}%) — ambiguous intent classification`);

  if (result.core.scores.uncertainty_score > 0.7)
    reasons.push(`High uncertainty (${(result.core.scores.uncertainty_score * 100).toFixed(0)}%) — insufficient data for confident decision`);

  if (result.route.model_tier === 'model_a')
    reasons.push(`Escalated to higher-tier model (${result.route.model_tier}) for complex analysis`);

  if (result.deliberation?.hard_violation)
    reasons.push(`Deliberative Core detected hard violation — mandatory block`);

  if (result.shield?.shield_signal.status === 'SOS')
    reasons.push(`ALFA Shield SOS: ${result.shield.shield_signal.category} (${result.shield.shield_signal.severity})`);

  if (result.resilience.degraded)
    reasons.push(`Pipeline degraded — ${result.resilience.fault_codes.join(', ')}`);

  return reasons;
}

function computeOverallConfidence(result: PipelineResult): number {
  const weights = { lasuch: 0.25, tagger: 0.15, core: 0.35, deliberation: 0.25 };
  let sum = result.lasuch.confidence * weights.lasuch
    + result.tagger.confidence * weights.tagger
    + result.core.scores.confidence_score * weights.core;

  if (result.deliberation) {
    sum += result.deliberation.consensus_score * weights.deliberation;
  } else {
    sum += result.core.scores.confidence_score * weights.deliberation;
  }

  return Math.min(1, Math.max(0, sum));
}

// ─── False Positive Annotation Panel ─────────────────────────

interface AnnotationPanelProps {
  result: PipelineResult;
}

export function AnnotationPanel({ result }: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(loadAnnotations);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const existing = annotations.find(a => a.input_hash === result.input_hash);
  const isBlocked = result.final_decision === 'BLOCK' || result.final_decision === 'HOLD';

  useEffect(() => { saveAnnotations(annotations); }, [annotations]);

  const annotate = (label: AnnotationLabel) => {
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      input_hash: result.input_hash,
      label,
      decision: result.final_decision,
      risk_score: result.lasuch.risk_score,
      note,
      timestamp: new Date().toISOString(),
    };

    setAnnotations(prev => {
      const filtered = prev.filter(a => a.input_hash !== result.input_hash);
      return [...filtered, annotation];
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-3">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        Annotation
        {existing && (
          <Badge variant="outline" className={`text-[10px] font-mono ml-2 ${
            existing.label.includes('false') ? 'border-warning/30 text-warning' : 'border-success/30 text-success'
          }`}>
            {existing.label.replace('_', ' ').toUpperCase()}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
          {annotations.length} total annotations
        </span>
      </h3>

      <p className="text-xs text-muted-foreground">
        Oznacz wynik jako poprawny lub błędny — budujesz dataset do kalibracji.
      </p>

      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Opcjonalna notatka..."
        className="bg-secondary border-border text-xs min-h-[60px]"
      />

      <div className="grid grid-cols-2 gap-2">
        {isBlocked ? (
          <>
            <Button variant="outline" size="sm" onClick={() => annotate('true_positive')}
              className="gap-2 text-xs border-success/30 text-success hover:bg-success/10">
              <ThumbsUp className="w-3 h-3" />
              True Positive (słusznie zablokowano)
            </Button>
            <Button variant="outline" size="sm" onClick={() => annotate('false_positive')}
              className="gap-2 text-xs border-warning/30 text-warning hover:bg-warning/10">
              <ThumbsDown className="w-3 h-3" />
              False Positive (bezpieczny prompt)
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => annotate('true_negative')}
              className="gap-2 text-xs border-success/30 text-success hover:bg-success/10">
              <ThumbsUp className="w-3 h-3" />
              True Negative (słusznie przepuszczono)
            </Button>
            <Button variant="outline" size="sm" onClick={() => annotate('false_negative')}
              className="gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
              <ThumbsDown className="w-3 h-3" />
              False Negative (powinno zablokować)
            </Button>
          </>
        )}
      </div>

      {saved && (
        <p className="text-xs text-success flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Zapisano do datasetu
        </p>
      )}
    </div>
  );
}
