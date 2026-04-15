import { Shield, ShieldAlert, Eye, Zap, ArrowDown, CheckCircle, XCircle, Clock, AlertTriangle, Brain, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PipelineResult } from '@/types/tonoyan-filters';
import type { TonoyanFilterResult } from '@/lib/pipeline/alfa-shield';

interface TimelineStep {
  id: string;
  label: string;
  module: string;
  icon: React.ReactNode;
  status: 'pass' | 'warn' | 'block' | 'info' | 'skip';
  score?: number;
  detail: string;
  latency?: number;
  badges?: { label: string; variant: 'pass' | 'warn' | 'block' }[];
}

function buildTimeline(result: PipelineResult, shield?: TonoyanFilterResult | null): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // 1. INPUT
  steps.push({
    id: 'input',
    label: 'INPUT',
    module: 'User Prompt',
    icon: <Eye className="w-4 h-4" />,
    status: 'info',
    detail: `${result.input.length} chars · hash: ${result.input_hash}`,
  });

  // 2. SHIELD SCAN
  if (shield) {
    const shieldStatus = shield.verdict === 'BLOCK' ? 'block' : shield.verdict === 'WARN' || shield.verdict === 'AGE_VERIFY' ? 'warn' : 'pass';
    steps.push({
      id: 'shield',
      label: 'ALFA SHIELD',
      module: 'Pre-Scan v1.2',
      icon: <ShieldAlert className="w-4 h-4" />,
      status: shieldStatus,
      score: shield.scanner.risk_score,
      detail: shield.scanner.shield_signal.status === 'SOS'
        ? `${shield.scanner.shield_signal.category} · ${shield.scanner.shield_signal.severity}`
        : 'No threats detected',
      latency: shield.scanner.scan_ms,
      badges: [
        ...(shield.scanner.obfuscation_detected ? [{ label: 'OBFUSCATION', variant: 'block' as const }] : []),
        ...(shield.scanner.encoding_detected ? [{ label: 'ENCODING', variant: 'block' as const }] : []),
        ...(shield.age_gate ? [{ label: 'AGE GATE', variant: 'warn' as const }] : []),
        ...(shield.minor_block ? [{ label: 'MINOR BLOCK', variant: 'block' as const }] : []),
      ],
    });
  }

  // 3. TONOYAN FILTER
  if (shield) {
    const activeCount = [
      shield.kontrargument, shield.weryfikacja, shield.kontekst,
      shield.anti_magic, shield.dwuperspektywa, shield.backtrack,
      shield.atrybucja, shield.encoding_guard, shield.priming_guard,
      shield.age_gate, shield.minor_block,
    ].filter(Boolean).length;

    steps.push({
      id: 'tonoyan',
      label: 'FILTRY TONOYANA',
      module: `${activeCount}/11 aktywnych`,
      icon: <Shield className="w-4 h-4" />,
      status: activeCount >= 4 ? 'block' : activeCount > 0 ? 'warn' : 'pass',
      score: shield.filtr_score,
      detail: `Verdict: ${shield.verdict} · Score: ${(shield.filtr_score * 100).toFixed(0)}%`,
    });
  }

  // 4. ŁASUCH
  steps.push({
    id: 'lasuch',
    label: 'ŁASUCH',
    module: 'First Line Defense',
    icon: <Eye className="w-4 h-4" />,
    status: result.lasuch.risk_score > 0.6 ? 'block' : result.lasuch.risk_score > 0.3 ? 'warn' : 'pass',
    score: result.lasuch.risk_score,
    detail: `${result.lasuch.flags.length} flags · Goal: ${result.lasuch.extracted_goal.slice(0, 50)}`,
    latency: result.lasuch.processing_time_ms,
    badges: result.lasuch.flags.slice(0, 3).map(f => ({ label: f, variant: 'block' as const })),
  });

  // 5. CERBER
  steps.push({
    id: 'cerber',
    label: 'CERBER',
    module: 'Intent Destructor',
    icon: <AlertTriangle className="w-4 h-4" />,
    status: result.cerber.survival_status === 'SURVIVED' ? 'pass' : result.cerber.survival_status === 'FAILED' ? 'block' : 'warn',
    detail: `${result.cerber.iteration_count} iterations · ${result.cerber.survival_status} · ${result.cerber.needs_human ? 'NEEDS HUMAN' : 'auto'}`,
    latency: result.cerber.processing_time_ms,
  });

  // 6. GUARDIAN
  steps.push({
    id: 'guardian',
    label: 'GUARDIAN',
    module: 'Decision Engine',
    icon: result.guardian.decision === 'PASS' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />,
    status: result.guardian.decision === 'PASS' ? 'pass' : result.guardian.decision === 'BLOCK' ? 'block' : 'warn',
    detail: `${result.guardian.decision} · ${result.guardian.response_mode} · ${result.guardian.reason_codes.join(', ')}`,
    latency: result.guardian.processing_time_ms,
  });

  // 7. ROUTER
  steps.push({
    id: 'router',
    label: 'ROUTER',
    module: `→ ${result.route.model_tier}`,
    icon: <Zap className="w-4 h-4" />,
    status: result.route.should_dispatch ? 'pass' : 'warn',
    detail: `Lane: ${result.route.lane} · Profile: ${result.route.execution_profile} · Priority: ${result.route.priority}`,
    badges: [
      { label: result.route.model_tier, variant: 'pass' as const },
      ...(result.route.should_dispatch ? [] : [{ label: 'NO DISPATCH', variant: 'block' as const }]),
    ],
  });

  // 8. DELIBERATION (if exists)
  if (result.deliberation) {
    steps.push({
      id: 'deliberation',
      label: 'DELIBERATIVE CORE',
      module: 'Brain Simulation',
      icon: <Brain className="w-4 h-4" />,
      status: result.deliberation.verdict === 'ALLOW' ? 'pass' : result.deliberation.verdict === 'DENY' ? 'block' : 'warn',
      score: 1 - result.deliberation.confidence_gap,
      detail: `${result.deliberation.verdict} · ${result.deliberation.winning_argument.slice(0, 60)}`,
      badges: result.deliberation.hard_violation ? [{ label: 'HARD VIOLATION', variant: 'block' as const }] : [],
    });
  }

  // 9. MODEL OUTPUT
  if (result.model_response) {
    steps.push({
      id: 'model',
      label: 'MODEL OUTPUT',
      module: result.model_used || 'N/A',
      icon: <Zap className="w-4 h-4" />,
      status: 'info',
      detail: `${result.model_response.length} chars · Provider: ${result.provider_used || 'none'}`,
    });
  } else if (result.final_decision === 'BLOCK' || result.final_decision === 'HOLD') {
    steps.push({
      id: 'model',
      label: 'MODEL OUTPUT',
      module: 'Blocked',
      icon: <XCircle className="w-4 h-4" />,
      status: 'block',
      detail: 'Model not called — blocked by pipeline',
    });
  }

  // 10. PBD (if exists)
  if (result.pbd) {
    steps.push({
      id: 'pbd',
      label: 'PBD',
      module: 'Post-Block Deliberation',
      icon: <FileSearch className="w-4 h-4" />,
      status: result.pbd.final_review.analytical_verdict === 'JUSTIFIED_BLOCK' || result.pbd.final_review.analytical_verdict === 'PREVENTED_ESCALATION' ? 'pass' : 'warn',
      score: result.pbd.final_review.quality_score,
      detail: `${result.pbd.final_review.analytical_verdict} · Quality: ${(result.pbd.final_review.quality_score * 100).toFixed(0)}%`,
    });
  }

  // 11. FINAL DECISION
  steps.push({
    id: 'final',
    label: 'FINAL DECISION',
    module: result.final_decision,
    icon: result.final_decision === 'PASS' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />,
    status: result.final_decision === 'PASS' ? 'pass' : result.final_decision === 'BLOCK' ? 'block' : 'warn',
    detail: `${result.response_mode} · ${result.total_latency_ms}ms total · ~${result.token_estimate} tokens`,
  });

  return steps;
}

const STATUS_COLORS = {
  pass: { border: 'border-success/40', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  warn: { border: 'border-warning/40', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  block: { border: 'border-destructive/40', bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' },
  info: { border: 'border-primary/40', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  skip: { border: 'border-muted-foreground/20', bg: 'bg-muted/30', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

interface DecisionTimelineProps {
  result: PipelineResult;
  shieldResult?: TonoyanFilterResult | null;
}

export function DecisionTimeline({ result, shieldResult }: DecisionTimelineProps) {
  const steps = buildTimeline(result, shieldResult);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-1">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        Decision Timeline
        <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary ml-auto">
          {steps.length} steps
        </Badge>
      </h3>

      <div className="relative">
        {steps.map((step, i) => {
          const colors = STATUS_COLORS[step.status];
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="relative flex gap-3">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center shrink-0 w-6">
                <div className={`w-3 h-3 rounded-full ${colors.dot} ring-2 ring-background z-10 shrink-0`} />
                {!isLast && <div className="w-0.5 flex-1 bg-border min-h-[20px]" />}
              </div>

              {/* Step content */}
              <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 mb-2 flex-1 min-w-0`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={colors.text}>{step.icon}</span>
                  <span className={`text-xs font-display font-bold ${colors.text}`}>{step.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{step.module}</span>
                  {step.score !== undefined && (
                    <Badge variant="outline" className={`text-[9px] font-mono ml-auto ${colors.border} ${colors.text}`}>
                      {(step.score * 100).toFixed(0)}%
                    </Badge>
                  )}
                  {step.latency !== undefined && (
                    <span className="text-[9px] text-muted-foreground font-mono">{step.latency}ms</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 break-words">{step.detail}</p>
                {step.badges && step.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {step.badges.map((b, j) => (
                      <Badge key={j} variant="outline" className={`text-[8px] font-mono ${
                        STATUS_COLORS[b.variant].border
                      } ${STATUS_COLORS[b.variant].text}`}>
                        {b.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
