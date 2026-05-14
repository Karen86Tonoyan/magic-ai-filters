import { Filter, Shield, Brain, Eye, GitBranch, Network, Layers } from 'lucide-react';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { FILTER_TYPE_INFO, DEFAULT_DLP_PATTERNS, type FilterType } from '@/types/ai-filters';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PIPELINE_FLOW = `flowchart LR
  U[User Prompt] --> L[ŁASUCH<br/>Pattern Filter]
  L -->|risk_score, flags| C[CERBER<br/>Intent Destruction]
  C -->|impact_simulation| G[GUARDIAN<br/>Final Decision]
  G -->|PASS / LIMITED| E[Prompt Enhancer<br/>SYSTEM GUARD]
  E --> M[Model<br/>LLM]
  M --> O[Output Filter<br/>Integrity Guard]
  O --> R[Response]
  G -.->|BLOCK| S[Silence / Handoff]
  G -.->|HUMAN_REVIEW| H[Human Operator]`;

const DECISION_TREE = `flowchart TD
  Start[Input] --> Sim{Cerber Impact<br/>= critical?}
  Sim -->|YES| Block1[BLOCK / silence]
  Sim -->|NO| Tag{Tagger:<br/>freeze / exploit?}
  Tag -->|YES| Block2[BLOCK / silence]
  Tag -->|NO| Risk{risk &gt; 0.6<br/>AND manip &gt; 0.55?}
  Risk -->|YES| Block3[BLOCK / silence]
  Risk -->|NO| Cluster{Coercive<br/>Cluster?}
  Cluster -->|YES| Block4[BLOCK / silence]
  Cluster -->|NO| Human{Cerber needs<br/>human?}
  Human -->|YES| HR[HUMAN_REVIEW]
  Human -->|NO| Hold{Hold tactic /<br/>tagger=hold?}
  Hold -->|YES| H2[HOLD / restricted]
  Hold -->|NO| Limit{Low confidence<br/>OR flags &gt; 0?}
  Limit -->|YES| LP[LIMITED_PASS]
  Limit -->|NO| Pass[PASS / normal]`;

const FIVE_MODULES = `flowchart TB
  subgraph PRE[Pre-Model Firewall - Tonoyan Cut]
    L[1 - LASUCH<br/>39 flags, fast pattern]
    C[2 - CERBER<br/>5 iterations max]
    G[3 - GUARDIAN<br/>Decision + Rule Zero]
    CORE[4 - CORE<br/>Orchestrator + PBD]
  end
  subgraph EXEC[Execution]
    M[5 - MODEL<br/>Isolated LLM]
  end
  L --> C --> G --> CORE --> M
  CORE -.feedback.-> L`;

const FLAG_GROUPS: { name: string; color: string; flags: string[] }[] = [
  {
    name: 'Exploity techniczne',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    flags: [
      'prompt_injection', 'jailbreak', 'hidden_commands', 'context_poisoning',
      'dlp_violation', 'resource_exhaustion', 'benchmark_gaming',
      'verbose_exploitation', 'safety_bypass_open_model', 'model_weakness_probe',
    ],
  },
  {
    name: 'Manipulacja Dark Tetrad',
    color: 'bg-warning/10 text-warning border-warning/30',
    flags: [
      'darvo', 'gaslighting', 'smear_campaign', 'projection', 'isolation',
      'toxic_relationship', 'parasitic_demand', 'guilt_tripping',
      'fog_coercion', 'emotional_manipulation', 'grooming',
      'authority_abuse', 'dissonance_masking',
    ],
  },
  {
    name: 'Taktyki przedłużania',
    color: 'bg-info/10 text-info border-info/30',
    flags: [
      'broda_tactic', 'hoovering', 'jade_trap', 'hidden_intent',
      'pseudo_authority', 'dependency_loop_attack',
    ],
  },
  {
    name: 'Sygnały kontekstowe',
    color: 'bg-muted text-muted-foreground border-border',
    flags: [
      'low_confidence', 'multi_flag', 'role_change_attempt',
      'system_leak_attempt', 'context_overflow', 'token_smuggling',
      'unicode_obfuscation', 'semantic_obfuscation',
    ],
  },
];

const filterTypes = Object.entries(FILTER_TYPE_INFO) as [FilterType, typeof FILTER_TYPE_INFO[FilterType]][];

const categoryStyle: Record<string, string> = {
  security: 'border-destructive/40 bg-destructive/5',
  control: 'border-primary/40 bg-primary/5',
  transform: 'border-info/40 bg-info/5',
};

export default function FiltersDocsPage() {
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Filter className="w-6 h-6 text-primary" />
          <h1 className="font-display text-3xl text-primary tracking-wider uppercase">
            Filtry — Dokumentacja
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Kompletna mapa Pre-Model Firewall (Tonoyan Cut). Architektura, decyzje, flagi, typy filtrów.
        </p>
      </header>

      <Tabs defaultValue="architecture" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="architecture"><Layers className="w-4 h-4 mr-2" />Architektura</TabsTrigger>
          <TabsTrigger value="flow"><Network className="w-4 h-4 mr-2" />Przepływ</TabsTrigger>
          <TabsTrigger value="decision"><GitBranch className="w-4 h-4 mr-2" />Decyzje</TabsTrigger>
          <TabsTrigger value="flags"><Shield className="w-4 h-4 mr-2" />Flagi i Typy</TabsTrigger>
        </TabsList>

        {/* ARCHITECTURE */}
        <TabsContent value="architecture" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">5-Module Architecture</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pełna izolacja Pre-Model Firewall od LLM. Model nie ma wpływu na decyzje filtrów.
            </p>
            <MermaidDiagram chart={FIVE_MODULES} id="five-modules" />
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Eye, name: 'ŁASUCH', role: 'Pierwsza linia obrony — szybkie filtrowanie wzorcowe na małych modelach. Wykrywa 39 flag (Grokus Alfa Pradactio).' },
              { icon: Brain, name: 'CERBER', role: 'Iteracyjna destrukcja intencji (max 5 iteracji). Symulacja impaktu zapytania. Fallback do human review.' },
              { icon: Shield, name: 'GUARDIAN', role: 'Finalna decyzja. Rule Zero — silence BLOCK przy critical impact. Dual Prompt System (SYSTEM GUARD).' },
              { icon: Layers, name: 'CORE + PBD', role: 'Orchestrator + Prevented Escalation Analysis. 4 fazy: Reakcja → Zebranie → Symulacja → Meta-werdykt.' },
              { icon: Filter, name: 'MODEL', role: 'Izolowany LLM. Brak ciągłej świadomości, brak ujawniania system promptu, brak zmiany roli.' },
            ].map(({ icon: Icon, name, role }) => (
              <Card key={name} className="p-4 border-primary/20">
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-display text-primary tracking-wider">{name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FLOW */}
        <TabsContent value="flow" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Przepływ Pipeline</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Każde zapytanie przechodzi przez sekwencję bramek. Linie przerywane = ścieżki blokujące.
            </p>
            <MermaidDiagram chart={PIPELINE_FLOW} id="pipeline-flow" />
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg text-primary mb-3">Wyjścia Guardiana</h3>
            <div className="grid md:grid-cols-5 gap-3 text-xs">
              {[
                { d: 'PASS', m: 'normal', c: 'border-success/40 bg-success/5 text-success' },
                { d: 'LIMITED_PASS', m: 'restricted', c: 'border-info/40 bg-info/5 text-info' },
                { d: 'HOLD', m: 'restricted', c: 'border-warning/40 bg-warning/5 text-warning' },
                { d: 'HUMAN_REVIEW', m: 'handoff', c: 'border-primary/40 bg-primary/5 text-primary' },
                { d: 'BLOCK', m: 'silence', c: 'border-destructive/40 bg-destructive/5 text-destructive' },
              ].map(({ d, m, c }) => (
                <div key={d} className={`p-3 rounded border font-mono ${c}`}>
                  <div className="font-bold tracking-wider">{d}</div>
                  <div className="text-[10px] mt-1 opacity-70">mode: {m}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* DECISION */}
        <TabsContent value="decision" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Drzewo decyzyjne Guardiana</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ścisła hierarchia: ryzyko {'>'} wartość → BLOCK. Niepewność → HOLD/SILENCE. Brak rollback.
            </p>
            <MermaidDiagram chart={DECISION_TREE} id="decision-tree" />
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg text-primary mb-3">Progi numeryczne</h3>
            <div className="grid md:grid-cols-3 gap-3 font-mono text-xs">
              {[
                ['risk_score', '> 0.60', 'High risk flag'],
                ['manipulation_score', '> 0.55', 'High manipulation'],
                ['exploit_score', '> 0.55', 'High exploit'],
                ['confidence', '< 0.50', 'Low confidence'],
                ['flags.length', '>= 3', 'Multi-flag amplifier'],
                ['cerber.iterations', '>= 5', 'Max iterations reached'],
              ].map(([k, v, d]) => (
                <div key={k} className="p-3 rounded border border-border bg-card/40">
                  <div className="text-primary">{k}</div>
                  <div className="text-warning">{v}</div>
                  <div className="text-muted-foreground text-[10px] mt-1">{d}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* FLAGS + TYPES */}
        <TabsContent value="flags" className="space-y-6 mt-6">
          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Taksonomia flag (Grokus Alfa Pradactio)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              39 flag zorganizowanych w 4 grupy. Wielokrotne flagi w jednym zapytaniu działają jako amplifier ryzyka.
            </p>
            <div className="space-y-4">
              {FLAG_GROUPS.map((g) => (
                <div key={g.name}>
                  <h3 className="font-display text-sm text-primary tracking-wider uppercase mb-2">{g.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {g.flags.map((f) => (
                      <span key={f} className={`text-[11px] font-mono px-2 py-1 rounded border ${g.color}`}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Typy filtrów</h2>
            <p className="text-sm text-muted-foreground mb-4">
              8 typów filtrów rozłożonych na fazy pre-model i post-model.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {filterTypes.map(([key, info]) => (
                <div key={key} className={`p-4 rounded border ${categoryStyle[info.category]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{info.icon}</span>
                    <span className="font-display text-primary tracking-wider">{info.label}</span>
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono uppercase">
                      {info.phase === 'pre_model' ? 'PRE' : 'POST'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {info.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">id: {key}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-xl text-primary mb-2">Domyślne wzorce DLP</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Skanowane PRZED wysyłką do modelu. Wykrycie = BLOCK / redact.
            </p>
            <div className="grid md:grid-cols-2 gap-2">
              {DEFAULT_DLP_PATTERNS.map((p) => (
                <div key={p.label} className="p-3 rounded border border-border bg-card/40 font-mono text-xs">
                  <div className="text-primary">{p.label}</div>
                  <div className="text-muted-foreground text-[10px] mt-1 break-all">{p.pattern}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
