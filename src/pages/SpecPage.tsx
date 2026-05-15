import { useRef, useState } from 'react';
import { BookOpen, Shield, Layers, AlertCircle, Download, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { toast } from '@/hooks/use-toast';

const PIPELINE = `flowchart LR
  IN[User Input] --> T[TAGGER / ROUTER]
  T --> L[LASUCH]
  L --> C[CERBER]
  C --> F[TONOYAN F1-F7]
  F --> CO[CORE Signals]
  CO --> G[GUARDIAN]
  G -->|PASS / LIMITED_PASS| M[Model / Tool / Runtime]
  M --> O[Output Validation]
  O --> P[Provenance Log]
  G -.->|BLOCK / HOLD| S[Silence / Handoff]`;

type Tonoyan = {
  id: string;
  name: string;
  purpose: string;
  detects: string[];
  failure: string;
  action: string;
  blocking: boolean;
};

const TONOYAN: Tonoyan[] = [
  {
    id: 'F1',
    name: 'Counterargument Filter',
    purpose: 'Wykrywa nadmierną pewność i brak falsyfikowalności.',
    detects: ['absolute statements', 'no alternative explanations', 'no counterargument', '"this is always true"', '"the only explanation"'],
    failure: 'OVERCONFIDENT',
    action: 'WARN/BLOCK gdy odpowiedź nie ma ścieżki falsyfikacji.',
    blocking: true,
  },
  {
    id: 'F2',
    name: 'Verification Filter',
    purpose: 'Wykrywa claimy bez źródeł.',
    detects: ['"studies show"', '"experts say"', '"data indicates"', 'unsupported factual claims', 'no URL / DOI / docs / spec / reference'],
    failure: 'UNSOURCED_CLAIM',
    action: 'Wymaga evidence przed zaakceptowaniem faktu.',
    blocking: true,
  },
  {
    id: 'F3',
    name: 'Context Filter',
    purpose: 'Wykrywa context drift i zbyt proste wyjaśnienia.',
    detects: ['missing context', 'oversimplification', 'ambiguous framing', '"obviously"', '"everyone knows"', '"just" / "simply"', '"all you need"'],
    failure: 'CONTEXT_DRIFT',
    action: 'WARN/BLOCK gdy kontekst niewystarczający.',
    blocking: true,
  },
  {
    id: 'F4',
    name: 'Anti-Magic Filter',
    purpose: 'Wykrywa magiczne myślenie i życzeniowe założenia.',
    detects: ['"automagically" / "magically"', '"instantly" / "without effort"', '"just works" / "somehow"', 'undefined mechanism'],
    failure: 'WISHFUL_THINKING',
    action: 'Wymaga mechanism, constraints, execution path.',
    blocking: true,
  },
  {
    id: 'F5',
    name: 'Dual Perspective Filter',
    purpose: 'Wykrywa polaryzację i brak drugiej perspektywy.',
    detects: ['demonization', '"they always lie"', '"they are enemies"', 'one-sided framing', 'no alternative viewpoint'],
    failure: 'POLARIZATION',
    action: 'Wymaga co najmniej jednej konkurencyjnej interpretacji.',
    blocking: true,
  },
  {
    id: 'F6',
    name: 'Backtrack Filter',
    purpose: 'Sprawdza chain-of-reasoning i logiczne skoki.',
    detects: ['"therefore obviously"', '"clearly therefore"', 'circular reasoning', 'missing Plan B', 'unsupported conclusion jump'],
    failure: 'LOGICAL_JUMP',
    action: 'Warning-only — nigdy nie blokuje twardo.',
    blocking: false,
  },
  {
    id: 'F7',
    name: 'Attribution Filter',
    purpose: 'Wykrywa błędy atrybucji przyczyn.',
    detects: ['"because stupid" / "because lazy"', '"by nature" / "innately"', 'ignoring external/contextual causes'],
    failure: 'ATTRIBUTION_ERROR',
    action: 'Wymaga context-aware causal explanation.',
    blocking: true,
  },
];

const HALL_TYPES = ['OVERCONFIDENT', 'UNSOURCED_CLAIM', 'CONTEXT_DRIFT', 'WISHFUL_THINKING', 'POLARIZATION', 'LOGICAL_JUMP', 'ATTRIBUTION_ERROR'];

type AlfaModule = {
  name: string;
  purpose: string;
  outputs: string[];
  extra?: { label: string; items: string[] };
};

const ALFA_MODULES: AlfaModule[] = [
  {
    name: '1. ŁASUCH — Manipulation & Exploit Detector',
    purpose: 'Wykrywa manipulację, prompt injection, hidden intent, social pressure, exploit attempts.',
    outputs: ['risk_score', 'manipulation_score', 'exploit_score', 'flags[]', 'extracted_goal', 'suspected_hidden_intent', 'confidence'],
    extra: {
      label: 'Flag categories',
      items: [
        'prompt_injection', 'jailbreak', 'hidden_commands', 'context_poisoning', 'dlp_violation',
        'multi_layer_bypass', 'emotional_manipulation', 'grooming', 'gaslighting', 'authority_abuse',
        'fomo_pressure', 'pseudo_authority', 'guilt_tripping', 'hidden_intent', 'darvo',
        'love_bombing', 'fog_coercion', 'double_bind', 'resource_exhaustion', 'model_weakness_probe',
        'benchmark_gaming', 'safety_bypass_open_model', 'dependency_loop_attack',
      ],
    },
  },
  {
    name: '2. CERBER — Adversarial Survival Filter',
    purpose: 'Testuje czy prompt próbuje zmienić zachowanie modelu, obejść safety, wyciec system info, wyczerpać zasoby.',
    outputs: ['survival_status: SURVIVED / FAILED / UNCERTAIN', 'clean_intent', 'hidden_objective', 'attack_hypotheses[]', 'impact_simulation', 'needs_human'],
    extra: {
      label: 'Impact simulation checks',
      items: [
        'would_alter_model_behavior', 'would_change_role', 'would_leak_system_info',
        'would_disable_safety', 'would_exfiltrate_sensitive_data', 'would_exhaust_resources',
        'would_compromise_integrity',
      ],
    },
  },
  {
    name: '3. GUARDIAN — Final Runtime Gate',
    purpose: 'Finalna decyzja przed wykonaniem lub odpowiedzią.',
    outputs: ['decision: PASS / LIMITED_PASS / HOLD / BLOCK / HUMAN_REVIEW', 'mode: normal / restricted / silence / handoff'],
  },
  {
    name: '4. TAGGER / ROUTER',
    purpose: 'Klasyfikuje intent, risk, control, domain, execution route.',
    outputs: [
      'intent: recall / analyze / execute / plan / predict / reflect',
      'risk: safe / suspicious / manipulative / exploit_attempt / undefined',
      'control: allow / review / restrict / hold / freeze',
      'domain: code / data / ops / research / creative / conversation',
      'signals: urgency / authority_claim / emotional_pressure / instruction_chain / unknown_context',
    ],
  },
  {
    name: '5. CORE Filter',
    purpose: 'Liczy raw decision signals — bez "magicznego trustu".',
    outputs: ['value_score', 'risk_score', 'trust_score', 'confidence_score', 'uncertainty_score', 'recommendation: pass / block / hold / silence'],
  },
  {
    name: '6. Prompt Enhancer',
    purpose: 'Ulepsza prompty mierząc ryzyko zniekształcenia.',
    outputs: ['modes: safe / aggressive / benchmark', 'enhanced prompt', 'dual prompt', 'weaknesses[]', 'improvement_delta', 'modification_level', 'risk_of_distortion', 'added_assumptions[]'],
  },
  {
    name: '7. Resilience Layer',
    purpose: 'Śledzi czy pipeline przeżył adversarial pressure. Stress-test, benchmark mode, model weakness detection, exploit hardening.',
    outputs: ['resilience_score', 'survived_attacks[]', 'breakpoints[]'],
  },
];

export default function SpecPage() {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<null | 'json' | 'pdf'>(null);

  const handleExportJson = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      version: '1.0',
      decision_model: ['PASS', 'WARN', 'BLOCK'],
      severity: ['INFO', 'LOW', 'MEDIUM', 'HIGH'],
      hallucination_types: HALL_TYPES,
      pipeline_mermaid: PIPELINE,
      tonoyan_filters: TONOYAN,
      alfa_runtime_modules: ALFA_MODULES,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alfa-spec-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'JSON wyeksportowany', description: a.download });
  };

  const handleExportPdf = async () => {
    if (!exportRef.current) return;
    setExporting('pdf');
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      // Render every tab off-screen by toggling display
      const root = exportRef.current;
      const tabPanels = root.querySelectorAll<HTMLElement>('[role="tabpanel"]');
      tabPanels.forEach((p) => {
        p.removeAttribute('hidden');
        p.dataset.prevDisplay = p.style.display;
        p.style.display = 'block';
      });
      // Wait a tick so mermaid mounts in newly visible panels
      await new Promise((r) => setTimeout(r, 800));

      const canvas = await html2canvas(root, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || '#0a0a0a',
        scale: 2,
        useCORS: true,
        windowWidth: root.scrollWidth,
      });

      tabPanels.forEach((p) => {
        p.style.display = p.dataset.prevDisplay ?? '';
        delete p.dataset.prevDisplay;
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 40;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 20;
      pdf.addImage(imgData, 'JPEG', 20, position, imgW, imgH);
      heightLeft -= pageH - 40;
      while (heightLeft > 0) {
        pdf.addPage();
        position = 20 - (imgH - heightLeft);
        pdf.addImage(imgData, 'JPEG', 20, position, imgW, imgH);
        heightLeft -= pageH - 40;
      }

      pdf.save(`alfa-spec-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: 'PDF wygenerowany', description: 'Diagram + opisy wszystkich zakładek' });
    } catch (e) {
      toast({ title: 'Błąd eksportu PDF', description: String(e), variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="font-display text-3xl text-primary tracking-wider uppercase">
              Consolidated Filter Spec
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <Download className="w-4 h-4 mr-2" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting === 'pdf'}>
              <FileText className="w-4 h-4 mr-2" />
              {exporting === 'pdf' ? 'Generowanie…' : 'PDF'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Dwa poziomy filtrów: <span className="text-primary">Tonoyan F1–F7</span> jako anty-halucynacyjny reasoning firewall
          oraz <span className="text-primary">ALFA runtime</span> jako security/governance pipeline.
        </p>
      </header>

      <div ref={exportRef} className="space-y-8">

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="pipeline"><Layers className="w-4 h-4 mr-2" />Pipeline</TabsTrigger>
          <TabsTrigger value="tonoyan"><AlertCircle className="w-4 h-4 mr-2" />Tonoyan F1–F7</TabsTrigger>
          <TabsTrigger value="alfa"><Shield className="w-4 h-4 mr-2" />ALFA Runtime</TabsTrigger>
        </TabsList>

        {/* PIPELINE */}
        <TabsContent value="pipeline" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Recommended ALFA Filter Pipeline</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Żaden tool, browser agent, MCP action ani code execution nie powinien się uruchomić, dopóki GUARDIAN nie zwróci
              <span className="text-success font-mono"> PASS </span>lub<span className="text-info font-mono"> LIMITED_PASS</span>.
            </p>
            <MermaidDiagram chart={PIPELINE} id="spec-pipeline" />
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg text-primary mb-3">Decision model</h3>
            <div className="grid md:grid-cols-3 gap-3 text-xs font-mono">
              {[
                { d: 'PASS', c: 'border-success/40 bg-success/5 text-success' },
                { d: 'WARN', c: 'border-warning/40 bg-warning/5 text-warning' },
                { d: 'BLOCK', c: 'border-destructive/40 bg-destructive/5 text-destructive' },
              ].map(({ d, c }) => (
                <div key={d} className={`p-3 rounded border ${c} font-bold tracking-wider`}>{d}</div>
              ))}
            </div>
            <h3 className="font-display text-lg text-primary mt-6 mb-3">Severity</h3>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {['INFO', 'LOW', 'MEDIUM', 'HIGH'].map((s) => (
                <span key={s} className="px-2 py-1 rounded border border-border bg-card/40">{s}</span>
              ))}
            </div>
            <h3 className="font-display text-lg text-primary mt-6 mb-3">Hallucination types</h3>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {HALL_TYPES.map((t) => (
                <span key={t} className="px-2 py-1 rounded border border-warning/30 bg-warning/5 text-warning">{t}</span>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* TONOYAN */}
        <TabsContent value="tonoyan" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Layer A — Tonoyan Anti-Hallucination Filters v1.0</h2>
            <p className="text-sm text-muted-foreground">
              Uruchamiane na każdym high-risk reasoning output. F6 jest warning-only; pozostałe mogą blokować.
              Aggregate score → PASS / WARN / BLOCK.
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {TONOYAN.map((f) => (
              <Card key={f.id} className="p-4 border-primary/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-primary text-lg tracking-wider">{f.id}</span>
                    <span className="font-display text-sm">{f.name}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-mono ${f.blocking ? 'border-destructive/40 text-destructive' : 'border-warning/40 text-warning'}`}>
                    {f.blocking ? 'CAN BLOCK' : 'WARN ONLY'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{f.purpose}</p>
                <div className="space-y-2 text-[11px]">
                  <div>
                    <div className="font-mono text-primary mb-1">Detects:</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {f.detects.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <span className="font-mono text-muted-foreground">Failure:</span>
                    <span className="font-mono text-warning">{f.failure}</span>
                  </div>
                  <div>
                    <span className="font-mono text-muted-foreground">Action: </span>
                    <span className="text-foreground">{f.action}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ALFA */}
        <TabsContent value="alfa" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Layer B — ALFA Runtime Filters / Governance Pipeline</h2>
            <p className="text-sm text-muted-foreground">
              7 modułów runtime: detekcja, survival, decyzja, routing, raw signals, prompt enhancement, resilience.
            </p>
          </Card>

          <div className="space-y-4">
            {ALFA_MODULES.map((m) => (
              <Card key={m.name} className="p-5 border-primary/20">
                <h3 className="font-display text-primary tracking-wider mb-1">{m.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{m.purpose}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-mono text-[11px] text-primary mb-1">Outputs</div>
                    <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                      {m.outputs.map((o) => <li key={o} className="font-mono">{o}</li>)}
                    </ul>
                  </div>
                  {m.extra && (
                    <div>
                      <div className="font-mono text-[11px] text-primary mb-1">{m.extra.label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.extra.items.map((i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-card/40 text-muted-foreground">
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
