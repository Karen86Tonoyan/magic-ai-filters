import { useState, useCallback, useEffect } from 'react';
import { Play, Shield, Eye, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Sparkles, Copy, Check, ChevronDown, ChevronUp, Save, Trash2, FileText, Fingerprint, Lock, ShieldAlert, Zap, Download, Ban, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { ALFAInputScanner, tonoyanFilter } from '@/lib/pipeline/alfa-shield';
import type { TonoyanFilterResult } from '@/lib/pipeline/alfa-shield';
import { TEST_PROMPTS } from '@/types/tonoyan-filters';
import type { PipelineResult, PipelineMode } from '@/types/tonoyan-filters';
import type { ModelAdapter } from '@/lib/adapters/types';
import { LLMConnectionPanel } from '@/components/LLMConnectionPanel';
import { createAdapter } from '@/lib/adapters/factory';
import type { AIProvider } from '@/types/ai-filters';
import { DecisionTimeline } from '@/components/DecisionTimeline';
import { ConfidenceEscalationPanel, AnnotationPanel } from '@/components/ConfidenceAnnotation';
import { AgeVerificationStatus } from '@/components/AgeVerificationStatus';
import {
  recordIncident, annotateIncident, checkAutoBan, executeBan,
  loadIncidents, loadBannedUsers, exportAsJSON, exportAsCSV,
  getIncidentStats, adminLogin, adminLogout, isAdminSessionValid, saveIncidents,
  type IncidentRecord, type AnnotationLabel,
} from '@/lib/pipeline/incident-log';

// ─── Saved Tests ─────────────────────────────────────────────

interface SavedTest {
  id: string;
  name: string;
  prompt: string;
  expectedDecision?: string;
  createdAt: string;
}

function loadSavedTests(): SavedTest[] {
  try {
    return JSON.parse(localStorage.getItem('alfa_saved_tests') || '[]');
  } catch { return []; }
}

function saveSavedTests(tests: SavedTest[]) {
  localStorage.setItem('alfa_saved_tests', JSON.stringify(tests));
}

// ─── Multi-model config ─────────────────────────────────────

interface ModelSlot {
  id: string;
  label: string;
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  enabled: boolean;
}

function loadModelSlots(): ModelSlot[] {
  try {
    const raw = localStorage.getItem('alfa_model_slots');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { id: 'slot-1', label: 'Model A', provider: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434', modelId: 'llama3.2:1b', enabled: false },
    { id: 'slot-2', label: 'Model B', provider: 'ollama', apiKey: '', baseUrl: 'http://localhost:11434', modelId: 'mistral:7b', enabled: false },
  ];
}

function saveModelSlots(slots: ModelSlot[]) {
  localStorage.setItem('alfa_model_slots', JSON.stringify(slots));
}

// ─── Styles ──────────────────────────────────────────────────

const DECISION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PASS: { bg: 'bg-success/10', text: 'text-success', label: '✅ PASS' },
  LIMITED_PASS: { bg: 'bg-warning/10', text: 'text-warning', label: '⚠️ LIMITED PASS' },
  HOLD: { bg: 'bg-warning/10', text: 'text-warning', label: '⏸️ HOLD' },
  BLOCK: { bg: 'bg-destructive/10', text: 'text-destructive', label: '🚫 BLOCK' },
  HUMAN_REVIEW: { bg: 'bg-info/10', text: 'text-info', label: '👤 HUMAN REVIEW' },
};

const SEVERITY_STYLES: Record<string, string> = {
  high: 'border-destructive/40 text-destructive bg-destructive/5',
  medium: 'border-warning/40 text-warning bg-warning/5',
  low: 'border-muted-foreground/30 text-muted-foreground bg-muted/30',
};

// ─── Multi-Model Result ──────────────────────────────────────

interface MultiModelResult {
  slotId: string;
  label: string;
  modelId: string;
  result: PipelineResult;
  shieldResult: TonoyanFilterResult;
}

export default function LiveAnalysisPage() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<PipelineMode>('filtered');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [shieldResult, setShieldResult] = useState<TonoyanFilterResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showWeaknesses, setShowWeaknesses] = useState(false);
  const [adapter, setAdapter] = useState<ModelAdapter | null>(null);

  // Saved tests
  const [savedTests, setSavedTests] = useState<SavedTest[]>(loadSavedTests);
  const [testName, setTestName] = useState('');
  const [showSavedTests, setShowSavedTests] = useState(false);

  // Multi-model
  const [multiMode, setMultiMode] = useState(false);
  const [modelSlots, setModelSlots] = useState<ModelSlot[]>(loadModelSlots);
  const [multiResults, setMultiResults] = useState<MultiModelResult[]>([]);

  // Incident & ban system
  const [incidents, setIncidents] = useState<IncidentRecord[]>(loadIncidents);
  const [stats, setStats] = useState(getIncidentStats());
  const [banAlert, setBanAlert] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(() => isAdminSessionValid());
  const [adminLogin_, setAdminLogin] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const sessionId = useState(() => 'sess_' + Date.now().toString(36))[0];
  const [scanner] = useState(() => new ALFAInputScanner(sessionId));

  useEffect(() => saveSavedTests(savedTests), [savedTests]);
  useEffect(() => saveModelSlots(modelSlots), [modelSlots]);

  const refreshIncidents = () => {
    setIncidents(loadIncidents());
    setStats(getIncidentStats());
  };

  const handleAdapterChange = useCallback((a: ModelAdapter | null) => setAdapter(a), []);

  const runShieldScan = (text: string): TonoyanFilterResult => {
    return tonoyanFilter(text, scanner);
  };

  const runAnalysis = async () => {
    if (!input.trim()) return;
    setIsRunning(true);
    setResult(null);
    setShieldResult(null);
    setMultiResults([]);
    setCopied(false);

    // Run Shield standalone scan
    setStage('ALFA SHIELD — pre-skan...');
    await new Promise(r => setTimeout(r, 150));
    const shield = runShieldScan(input);
    setShieldResult(shield);

    if (multiMode) {
      // Multi-model: run pipeline for each enabled slot
      const enabledSlots = modelSlots.filter(s => s.enabled);
      const results: MultiModelResult[] = [];

      for (const slot of enabledSlots) {
        setStage(`${slot.label} (${slot.modelId}) — pipeline...`);
        try {
          const slotAdapter = createAdapter(slot.provider, {
            apiKey: slot.apiKey,
            baseUrl: slot.baseUrl,
            modelId: slot.modelId,
          });
          const res = await runPipeline(input, { mode, adapter: slotAdapter });
          results.push({
            slotId: slot.id,
            label: slot.label,
            modelId: slot.modelId,
            result: res,
            shieldResult: shield,
          });
        } catch (err) {
          // Run without adapter on failure
          const res = await runPipeline(input, { mode });
          results.push({
            slotId: slot.id,
            label: slot.label,
            modelId: slot.modelId,
            result: res,
            shieldResult: shield,
          });
        }
      }

      if (results.length === 0) {
        // No models enabled, run without adapter
        setStage('Pipeline (bez modelu)...');
        const res = await runPipeline(input, { mode });
        setResult(res);
      } else {
        setMultiResults(results);
        setResult(results[0].result);
      }
    } else {
      setStage('ŁASUCH → CERBER → GUARDIAN → RDZEŃ...');
      await new Promise(r => setTimeout(r, 300));
      const res = await runPipeline(input, { mode, adapter: adapter || undefined });
      setResult(res);
    }

    // Record incident & check auto-ban
    if (shield.scanner.risk_score > 0) {
      recordIncident(shield.scanner, input, shield.verdict, sessionId);
      const banCheck = checkAutoBan(sessionId);
      if (banCheck.should_ban) {
        executeBan(sessionId, `Auto-ban: ${banCheck.attack_count} attacks detected`);
        setBanAlert(`⛔ UŻYTKOWNIK ZBANOWANY — ${banCheck.attack_count} ataków wykrytych. ${banCheck.ban_evasion_detected ? '🔍 Wykryto próbę obejścia bana (fingerprint match)!' : ''}`);
      } else if (banCheck.should_analyze) {
        setBanAlert(`🔍 ANALIZA WŁĄCZONA — ${banCheck.attack_count} ataków. System analizuje intencje i styl pisania.`);
      }
      refreshIncidents();
    }

    setIsRunning(false);
    setStage('');
  };

  const loadTestPrompt = (promptId: string) => {
    const tp = TEST_PROMPTS.find(t => t.id === promptId);
    if (tp) setInput(tp.prompt);
  };

  const saveCurrentTest = () => {
    if (!input.trim()) return;
    const name = testName.trim() || `Test ${savedTests.length + 1}`;
    const newTest: SavedTest = {
      id: crypto.randomUUID(),
      name,
      prompt: input,
      expectedDecision: result?.final_decision,
      createdAt: new Date().toISOString(),
    };
    setSavedTests(prev => [...prev, newTest]);
    setTestName('');
  };

  const deleteTest = (id: string) => {
    setSavedTests(prev => prev.filter(t => t.id !== id));
  };

  const loadSavedTest = (test: SavedTest) => {
    setInput(test.prompt);
    setResult(null);
    setShieldResult(null);
  };

  const copyEnhanced = async () => {
    if (result?.enhancement?.enhanced) {
      await navigator.clipboard.writeText(result.enhancement.enhanced);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateSlot = (id: string, updates: Partial<ModelSlot>) => {
    setModelSlots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addSlot = () => {
    setModelSlots(prev => [...prev, {
      id: crypto.randomUUID(),
      label: `Model ${prev.length + 1}`,
      provider: 'ollama' as AIProvider,
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      modelId: 'llama3.2:1b',
      enabled: false,
    }]);
  };

  const ds = result ? DECISION_STYLES[result.final_decision] : null;

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-up max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          Live Analysis
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">SHIELD → ŁASUCH → CERBER → GUARDIAN → RDZEŃ — pełny pipeline + ALFA Shield</p>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-secondary">
          <TabsTrigger value="analysis">Analiza</TabsTrigger>
          <TabsTrigger value="incidents">Incydenty ({stats.attacks})</TabsTrigger>
          <TabsTrigger value="saved">Testy ({savedTests.length})</TabsTrigger>
          <TabsTrigger value="models">Multi-Model</TabsTrigger>
          <TabsTrigger value="admin">🔒 Admin</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: ANALIZA ═══ */}
        <TabsContent value="analysis" className="space-y-4 mt-4">
          {/* LLM Connection (single mode) */}
          {!multiMode && <LLMConnectionPanel onAdapterChange={handleAdapterChange} />}

          {/* Multi-model toggle */}
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <Switch checked={multiMode} onCheckedChange={setMultiMode} id="multi-mode" />
            <Label htmlFor="multi-mode" className="text-sm cursor-pointer">
              Multi-Model Testing
            </Label>
            {multiMode && (
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary ml-auto">
                {modelSlots.filter(s => s.enabled).length} aktywnych
              </Badge>
            )}
          </div>

          {/* Input area */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Select value={mode} onValueChange={(v: PipelineMode) => setMode(v)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="filtered">🛡️ Filtered</SelectItem>
                  <SelectItem value="raw">⚡ Raw (bez filtrów)</SelectItem>
                  <SelectItem value="benchmark">📊 Benchmark</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={loadTestPrompt}>
                <SelectTrigger className="w-full sm:w-[220px] bg-secondary border-border">
                  <SelectValue placeholder="Załaduj test prompt..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {TEST_PROMPTS.map(tp => (
                    <SelectItem key={tp.id} value={tp.id}>{tp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Wpisz prompt do analizy... lub wybierz z testowych powyżej"
              className="bg-secondary border-border font-mono text-sm min-h-[100px]"
            />

            {/* Save test controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={testName}
                onChange={e => setTestName(e.target.value)}
                placeholder="Nazwa testu (opcjonalnie)"
                className="bg-secondary border-border text-sm flex-1"
              />
              <Button variant="outline" size="sm" onClick={saveCurrentTest} disabled={!input.trim()} className="gap-2">
                <Save className="w-3 h-3" />
                Zapisz test
              </Button>
            </div>

            <Button onClick={runAnalysis} disabled={!input.trim() || isRunning} className="w-full gradient-primary text-primary-foreground font-display gap-2">
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? stage : (multiMode ? 'Uruchom na wszystkich modelach' : 'Uruchom Pipeline')}
            </Button>
          </div>

          {/* ═══ ALFA SHIELD PANEL ═══ */}
          {shieldResult && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 sm:p-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                ALFA SHIELD — Pre-Scan v1.2
                <Badge variant="outline" className={`text-[10px] font-mono ml-auto ${
                  shieldResult.verdict === 'BLOCK' ? 'border-destructive/40 text-destructive' :
                  shieldResult.verdict === 'AGE_VERIFY' ? 'border-warning/40 text-warning' :
                  shieldResult.verdict === 'WARN' ? 'border-warning/40 text-warning' :
                  'border-success/40 text-success'
                }`}>
                  {shieldResult.verdict}
                </Badge>
              </h3>

              {/* Shield metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ShieldMetric label="Risk Score" value={`${(shieldResult.scanner.risk_score * 100).toFixed(0)}%`}
                  color={shieldResult.scanner.risk_score > 0.6 ? 'destructive' : shieldResult.scanner.risk_score > 0.3 ? 'warning' : 'success'} />
                <ShieldMetric label="Session Flags" value={String(shieldResult.scanner.session_flags)}
                  color={shieldResult.scanner.session_flags > 3 ? 'destructive' : shieldResult.scanner.session_flags > 0 ? 'warning' : 'success'} />
                <ShieldMetric label="Session Status" value={shieldResult.scanner.session_status}
                  color={shieldResult.scanner.session_status === 'COMPROMISED' ? 'destructive' : shieldResult.scanner.session_status === 'WATCH' ? 'warning' : 'success'} />
                <ShieldMetric label="Obfuscation" value={shieldResult.scanner.obfuscation_detected ? 'DETECTED' : 'Clean'}
                  color={shieldResult.scanner.obfuscation_detected ? 'destructive' : 'success'} icon={<Fingerprint className="w-3 h-3" />} />
                <ShieldMetric label="Encoding" value={shieldResult.scanner.encoding_detected ? 'DETECTED' : 'Clean'}
                  color={shieldResult.scanner.encoding_detected ? 'destructive' : 'success'} icon={<Lock className="w-3 h-3" />} />
                <ShieldMetric label="Steganography" value={shieldResult.scanner.steganography_detected ? `${shieldResult.scanner.invisible_chars_stripped} chars` : 'Clean'}
                  color={shieldResult.scanner.steganography_detected ? 'destructive' : 'success'} />
                <ShieldMetric label="Cmd Density" value={`${(shieldResult.scanner.command_density * 100).toFixed(0)}%`}
                  color={shieldResult.scanner.command_density > 0.15 ? 'destructive' : shieldResult.scanner.command_density > 0.08 ? 'warning' : 'success'} />
                <ShieldMetric label="Context Shift" value={shieldResult.scanner.context_shift.shift_detected ? shieldResult.scanner.context_shift.shift_type.toUpperCase() : 'Stable'}
                  color={shieldResult.scanner.context_shift.shift_type === 'radical' ? 'destructive' : shieldResult.scanner.context_shift.shift_type === 'significant' ? 'warning' : 'success'} />
                <ShieldMetric label="Cosine Sim" value={`${(shieldResult.scanner.context_shift.similarity * 100).toFixed(0)}%`}
                  color={shieldResult.scanner.context_shift.similarity < 0.15 ? 'destructive' : shieldResult.scanner.context_shift.similarity < 0.35 ? 'warning' : 'success'} />
                <ShieldMetric label="Semantic Sim" value={shieldResult.scanner.semantic_obfuscation?.detected ? `${(shieldResult.scanner.semantic_obfuscation.max_score * 100).toFixed(0)}%` : 'Clean'}
                  color={shieldResult.scanner.semantic_obfuscation?.detected ? 'destructive' : 'success'} />
              </div>

              {/* Ban Alert */}
              {banAlert && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive">{banAlert}</p>
                </div>
              )}

              {/* v1.6: Semantic Obfuscation Matches */}
              {shieldResult.scanner.semantic_obfuscation?.detected && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-warning flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Semantic Obfuscation — parafraza wykryta ({shieldResult.scanner.semantic_obfuscation.matches.length} dopasowań)
                  </p>
                  <div className="space-y-1">
                    {shieldResult.scanner.semantic_obfuscation.matches.slice(0, 3).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] border-warning/30 text-warning">{m.category}</Badge>
                        <span>tri:{(m.similarity * 100).toFixed(0)}% wrd:{(m.word_overlap * 100).toFixed(0)}% → {(m.combined_score * 100).toFixed(0)}%</span>
                        <span className="text-warning/60">({m.template_id})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOS Signal */}
              {shieldResult.scanner.shield_signal.status === 'SOS' && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-destructive text-destructive-foreground text-[10px]">SOS</Badge>
                    <Badge variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive">
                      {shieldResult.scanner.shield_signal.category}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {shieldResult.scanner.shield_signal.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      → {shieldResult.scanner.shield_signal.recommended_action}
                    </Badge>
                  </div>
                  {shieldResult.scanner.shield_signal.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-destructive">• {r}</p>
                  ))}
                  {shieldResult.scanner.shield_signal.matched_patterns.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {shieldResult.scanner.shield_signal.matched_patterns.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] font-mono border-destructive/20 text-destructive/80">
                          {p.slice(0, 40)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tonoyan Filters */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Filtry Tonoyana (filtr_score: {(shieldResult.filtr_score * 100).toFixed(0)}%)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <FilterChip label="Kontrargument" active={shieldResult.kontrargument} />
                  <FilterChip label="Weryfikacja" active={shieldResult.weryfikacja} />
                  <FilterChip label="Kontekst" active={shieldResult.kontekst} />
                  <FilterChip label="Anti-Magic" active={shieldResult.anti_magic} />
                  <FilterChip label="Dwuperspektywa" active={shieldResult.dwuperspektywa} />
                  <FilterChip label="Backtrack" active={shieldResult.backtrack} />
                  <FilterChip label="Atrybucja" active={shieldResult.atrybucja} />
                  <FilterChip label="Encoding Guard" active={shieldResult.encoding_guard} icon={<Lock className="w-2.5 h-2.5" />} />
                  <FilterChip label="Priming Guard" active={shieldResult.priming_guard} icon={<Zap className="w-2.5 h-2.5" />} />
                  <FilterChip label="Age Gate" active={shieldResult.age_gate} />
                  <FilterChip label="Minor Block" active={shieldResult.minor_block} />
                  <FilterChip label="Front Attack" active={shieldResult.front_attack_guard} icon={<Shield className="w-2.5 h-2.5" />} />
                  <FilterChip label="Social Eng." active={shieldResult.social_engineering_guard} />
                  <FilterChip label="Emotional" active={shieldResult.emotional_guard} />
                  <FilterChip label="Lang Switch" active={shieldResult.language_switch_guard} />
                  <FilterChip label="Tool Chain" active={shieldResult.tool_chain_guard} />
                  <FilterChip label="Context Poison" active={shieldResult.context_poison_guard} />
                  <FilterChip label="Semantic" active={shieldResult.semantic_guard} />
                  <FilterChip label="Legal Exploit" active={shieldResult.legal_exploit_guard} />
                  <FilterChip label="Steganography" active={shieldResult.steganography_guard} icon={<Fingerprint className="w-2.5 h-2.5" />} />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground font-mono">
                scan: {shieldResult.scanner.scan_ms}ms · hash: {shieldResult.scanner.input_hash}
              </p>
            </div>
          )}

          {/* ═══ MULTI-MODEL COMPARISON ═══ */}
          {multiResults.length > 1 && (
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Porównanie modeli ({multiResults.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {multiResults.map(mr => {
                  const mds = DECISION_STYLES[mr.result.final_decision];
                  return (
                    <div key={mr.slotId} className={`${mds?.bg} border rounded-xl p-4 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <span className="font-display font-semibold text-sm">{mr.label}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{mr.modelId}</Badge>
                      </div>
                      <p className={`text-xl font-display font-bold ${mds?.text}`}>{mds?.label}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span>Risk: <span className="text-foreground font-mono">{(mr.result.lasuch.risk_score * 100).toFixed(0)}%</span></span>
                        <span>Latency: <span className="text-foreground font-mono">{mr.result.total_latency_ms}ms</span></span>
                        <span>Mode: <span className="text-foreground font-mono">{mr.result.response_mode}</span></span>
                      </div>
                      {mr.result.model_response && (
                        <div className="bg-card/50 border border-border rounded-lg p-2 mt-2">
                          <p className="text-xs text-foreground line-clamp-3">{mr.result.model_response}</p>
                        </div>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs"
                        onClick={() => { setResult(mr.result); setShieldResult(mr.shieldResult); }}>
                        Pokaż szczegóły
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ DECISION TIMELINE ═══ */}
          {result && (
            <DecisionTimeline result={result} shieldResult={shieldResult} />
          )}

          {/* ═══ CONFIDENCE & ESCALATION + ANNOTATION ═══ */}
          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConfidenceEscalationPanel result={result} />
              <AnnotationPanel result={result} />
            </div>
          )}

          {/* ═══ AGE VERIFICATION STATUS ═══ */}
          <AgeVerificationStatus />

          {/* ═══ PIPELINE RESULTS (existing panels) ═══ */}
          {result && (
            <div className="space-y-4">
              {/* Final Decision Banner */}
              <div className={`${ds?.bg} border rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                <div>
                  <p className={`text-2xl sm:text-3xl font-display font-bold ${ds?.text}`}>{ds?.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mode: <span className="text-foreground">{result.response_mode}</span>
                    {' · '}Latency: <span className="text-foreground">{result.total_latency_ms}ms</span>
                    {' · '}Tokens: <span className="text-foreground">~{result.token_estimate}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.lasuch.flags.map(f => (
                    <Badge key={f} variant="outline" className="text-xs font-mono border-destructive/30 text-destructive">{f}</Badge>
                  ))}
                  {result.lasuch.flags.length === 0 && (
                    <Badge variant="outline" className="text-xs font-mono border-success/30 text-success">CLEAN</Badge>
                  )}
                </div>
              </div>

              {/* PROMPT ENHANCER */}
              {result.enhancement && result.enhancement.weaknesses.length > 0 && (
                <div className="bg-card border border-primary/30 rounded-xl p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      GUARDIAN Prompt Enhancer v2.0
                      <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary ml-1">
                        {result.enhancement.mode.toUpperCase()}
                      </Badge>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono border-warning/30 text-warning">
                        Siła: {(result.enhancement.strength_score * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="outline" className={`text-xs font-mono ${
                        result.enhancement.modification_level === 'HIGH' ? 'border-destructive/30 text-destructive' :
                        result.enhancement.modification_level === 'MEDIUM' ? 'border-warning/30 text-warning' :
                        'border-success/30 text-success'
                      }`}>
                        Mod: {result.enhancement.modification_level}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.enhancement.enhancement_summary}</p>

                  <button onClick={() => setShowWeaknesses(!showWeaknesses)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {showWeaknesses ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {result.enhancement.weaknesses.length} wykrytych słabości
                  </button>

                  {showWeaknesses && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.enhancement.weaknesses.map((w, i) => (
                        <div key={i} className={`border rounded-lg p-3 ${SEVERITY_STYLES[w.severity]}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-mono">{w.severity.toUpperCase()}</Badge>
                            <span className="text-[10px] font-mono">{w.category.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-xs mb-1">{w.description}</p>
                          <p className="text-[10px] text-foreground/70">💡 {w.fix}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.enhancement.mode !== 'benchmark' && (
                    <div className="space-y-3">
                      {result.enhancement.dual_prompt.system_guard && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-primary flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            SYSTEM GUARD:
                          </p>
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 font-mono text-[11px] text-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {result.enhancement.dual_prompt.system_guard}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          USER INPUT (niezmieniony):
                        </p>
                        <div className="bg-success/5 border border-success/20 rounded-lg p-3 font-mono text-[11px] text-foreground whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                          {result.enhancement.dual_prompt.raw_input}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={copyEnhanced} className="gap-2 text-xs">
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Skopiowano!' : 'Kopiuj SYSTEM GUARD'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline Modules Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ŁASUCH */}
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-warning" />
                    ŁASUCH — First Line
                    <span className="text-xs text-muted-foreground ml-auto">{result.lasuch.processing_time_ms}ms</span>
                  </h3>
                  <div className="space-y-3">
                    <ScoreBar label="Risk" value={result.lasuch.risk_score} color="destructive" />
                    <ScoreBar label="Manipulation" value={result.lasuch.manipulation_score} color="warning" />
                    <ScoreBar label="Exploit" value={result.lasuch.exploit_score} color="destructive" />
                    <ScoreBar label="Confidence" value={result.lasuch.confidence} color="success" />
                    <div className="border-t border-border pt-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">Goal:</span> {result.lasuch.extracted_goal}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">Hidden:</span> {result.lasuch.suspected_hidden_intent}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CERBER */}
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    CERBER — Intent Destructor
                    <span className="text-xs text-muted-foreground ml-auto">{result.cerber.processing_time_ms}ms</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant="outline" className={`font-mono ${
                        result.cerber.survival_status === 'SURVIVED' ? 'border-success/30 text-success' :
                        result.cerber.survival_status === 'FAILED' ? 'border-destructive/30 text-destructive' :
                        'border-warning/30 text-warning'
                      }`}>{result.cerber.survival_status}</Badge>
                      <span className="text-xs text-muted-foreground">{result.cerber.iteration_count} iteracji</span>
                    </div>
                    {result.cerber.iterations.map((iter, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-primary">#{iter.iteration}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{iter.layer}</span>
                          <span className={`text-[10px] font-mono ml-auto ${iter.risk_delta > 0 ? 'text-destructive' : 'text-success'}`}>
                            {iter.risk_delta > 0 ? '+' : ''}{iter.risk_delta}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{iter.finding}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GUARDIAN */}
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                    {result.guardian.decision === 'PASS' ? <CheckCircle className="w-5 h-5 text-success" /> :
                     result.guardian.decision === 'BLOCK' ? <XCircle className="w-5 h-5 text-destructive" /> :
                     <Clock className="w-5 h-5 text-warning" />}
                    GUARDIAN — Decision
                    <span className="text-xs text-muted-foreground ml-auto">{result.guardian.processing_time_ms}ms</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-display font-bold ${
                        DECISION_STYLES[result.guardian.decision]?.text || 'text-foreground'
                      }`}>
                        {DECISION_STYLES[result.guardian.decision]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Response mode: <span className="text-foreground font-mono">{result.guardian.response_mode}</span>
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Reason codes:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.guardian.reason_codes.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-mono">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CORE */}
                <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
                    ⚙️ RDZEŃ — Value vs Risk
                  </h3>
                  <div className="space-y-3">
                    <ScoreBar label="Value" value={result.core.scores.value_score} color="success" />
                    <ScoreBar label="Risk" value={result.core.scores.risk_score} color="destructive" />
                    <ScoreBar label="Trust" value={result.core.scores.trust_score} color="primary" />
                    <ScoreBar label="Confidence" value={result.core.scores.confidence_score} color="success" />
                    <ScoreBar label="Uncertainty" value={result.core.scores.uncertainty_score} color="warning" />
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">Recommendation:</span>{' '}
                        <span className="font-mono">{result.core.recommendation.toUpperCase()}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{result.core.reasoning}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Response */}
              {result.model_response && (
                <div className="bg-card border border-primary/20 rounded-xl p-4 sm:p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">🤖 Model Response</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{result.model_response}</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: INCYDENTY ═══ */}
        <TabsContent value="incidents" className="space-y-4 mt-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Łączne</p>
              <p className="text-lg font-mono font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Ataki</p>
              <p className="text-lg font-mono font-bold text-destructive">{stats.attacks}</p>
            </div>
            <div className="bg-card border border-success/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">True Positive</p>
              <p className="text-lg font-mono font-bold text-success">{stats.true_positives}</p>
            </div>
            <div className="bg-card border border-warning/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">False Positive</p>
              <p className="text-lg font-mono font-bold text-warning">{stats.false_positives}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Do przeglądu</p>
              <p className="text-lg font-mono font-bold text-muted-foreground">{stats.unreviewed}</p>
            </div>
            <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Zbanowani</p>
              <p className="text-lg font-mono font-bold text-destructive">{stats.banned_users}</p>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const data = exportAsJSON(incidents);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `alfa_dataset_${Date.now()}.json`; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-3 h-3" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const data = exportAsCSV(incidents);
              const blob = new Blob([data], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `alfa_dataset_${Date.now()}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-3 h-3" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => {
              if (confirm('Wyczyścić wszystkie incydenty?')) {
                saveIncidents([]);
                refreshIncidents();
              }
            }}>
              <Trash2 className="w-3 h-3" /> Wyczyść
            </Button>
          </div>

          {/* Incident list */}
          {incidents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Brak incydentów. Uruchom analizę — każdy skan z risk &gt; 0 jest automatycznie rejestrowany.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...incidents].reverse().slice(0, 50).map(inc => (
                <div key={inc.id} className={`bg-card border rounded-xl p-3 space-y-2 ${
                  inc.ban_evasion_suspected ? 'border-destructive/50' :
                  inc.risk_score > 0.6 ? 'border-destructive/30' :
                  inc.risk_score > 0.3 ? 'border-warning/30' : 'border-border'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] font-mono ${
                      inc.verdict === 'BLOCK' ? 'border-destructive/40 text-destructive' :
                      inc.verdict === 'WARN' ? 'border-warning/40 text-warning' :
                      'border-success/40 text-success'
                    }`}>{inc.verdict}</Badge>
                    {inc.category && <Badge variant="outline" className="text-[9px] font-mono">{inc.category}</Badge>}
                    <span className="text-[10px] font-mono text-muted-foreground">risk: {(inc.risk_score * 100).toFixed(0)}%</span>
                    {inc.ban_evasion_suspected && <Badge className="bg-destructive text-destructive-foreground text-[9px]">BAN EVASION</Badge>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{new Date(inc.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-mono text-foreground line-clamp-2">{inc.input}</p>

                  {/* FP/TP annotation */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Annotacja:</span>
                    {(['true_positive', 'false_positive', 'unreviewed'] as AnnotationLabel[]).map(label => (
                      <Button key={label} size="sm" variant={inc.annotation === label ? 'default' : 'outline'}
                        className={`text-[10px] h-6 px-2 ${
                          inc.annotation === label
                            ? label === 'true_positive' ? 'bg-success text-success-foreground'
                            : label === 'false_positive' ? 'bg-warning text-warning-foreground'
                            : ''
                            : ''
                        }`}
                        onClick={() => {
                          annotateIncident(inc.id, label);
                          refreshIncidents();
                        }}>
                        {label === 'true_positive' ? '✅ TP' : label === 'false_positive' ? '⚠️ FP' : '❓'}
                      </Button>
                    ))}
                    {inc.context_shift?.shift_detected && (
                      <Badge variant="outline" className="text-[9px] border-warning/30 text-warning ml-auto">
                        shift: {inc.context_shift.shift_type}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 mt-4">
          {savedTests.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Brak zapisanych testów. Uruchom analizę i kliknij "Zapisz test".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedTests.map(test => (
                <div key={test.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm">{test.name}</span>
                      {test.expectedDecision && (
                        <Badge variant="outline" className={`text-[10px] font-mono ${
                          DECISION_STYLES[test.expectedDecision]?.text || ''
                        }`}>
                          {test.expectedDecision}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => loadSavedTest(test)} className="text-xs gap-1">
                        <Play className="w-3 h-3" /> Załaduj
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTest(test.id)} className="text-xs text-destructive gap-1">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono line-clamp-2">{test.prompt}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(test.createdAt).toLocaleString()}</p>
                </div>
              ))}

              {/* Run all saved tests */}
              <Button variant="outline" className="w-full gap-2" onClick={async () => {
                for (const test of savedTests) {
                  setInput(test.prompt);
                }
              }}>
                <Play className="w-4 h-4" />
                Załaduj ostatni test
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: MULTI-MODEL ═══ */}
        <TabsContent value="models" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Skonfiguruj modele do testowania równoległego. Włącz "Multi-Model Testing" w zakładce Analiza, aby porównać wyniki.
          </p>
          {modelSlots.map(slot => (
            <div key={slot.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={slot.enabled} onCheckedChange={(v) => updateSlot(slot.id, { enabled: v })} />
                  <Input value={slot.label} onChange={e => updateSlot(slot.id, { label: e.target.value })}
                    className="bg-secondary border-border text-sm w-32 h-8" />
                </div>
                <Button size="sm" variant="ghost" className="text-destructive text-xs"
                  onClick={() => setModelSlots(prev => prev.filter(s => s.id !== slot.id))}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Provider</Label>
                  <Select value={slot.provider} onValueChange={(v: AIProvider) => updateSlot(slot.id, { provider: v })}>
                    <SelectTrigger className="bg-secondary border-border text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Model ID</Label>
                  <Input value={slot.modelId} onChange={e => updateSlot(slot.id, { modelId: e.target.value })}
                    className="bg-secondary border-border text-sm h-8" />
                </div>
                <div>
                  <Label className="text-xs">Base URL</Label>
                  <Input value={slot.baseUrl} onChange={e => updateSlot(slot.id, { baseUrl: e.target.value })}
                    className="bg-secondary border-border text-sm h-8" />
                </div>
                <div>
                  <Label className="text-xs">API Key</Label>
                  <Input type="password" value={slot.apiKey} onChange={e => updateSlot(slot.id, { apiKey: e.target.value })}
                    placeholder="(opcjonalnie)" className="bg-secondary border-border text-sm h-8" />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addSlot} className="w-full gap-2">
            + Dodaj model
          </Button>
        </TabsContent>

        {/* ═══ TAB: ADMIN ═══ */}
        <TabsContent value="admin" className="space-y-4 mt-4">
          {!adminMode ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
              <Ban className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Dostęp administracyjny do wszystkich incydentów, zbanowanych użytkowników i analizy zagrożeń.</p>
              <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                <Input type="text" value={adminLogin_} onChange={e => setAdminLogin(e.target.value)}
                  placeholder="Login" className="bg-secondary border-border text-sm" autoComplete="username" />
                <Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)}
                  placeholder="Hasło" className="bg-secondary border-border text-sm" autoComplete="current-password"
                  onKeyDown={e => { if (e.key === 'Enter') {
                    if (adminLogin(adminLogin_, adminPass)) {
                      setAdminMode(true);
                      refreshIncidents();
                    } else {
                      setBanAlert('❌ Nieprawidłowy login lub hasło');
                      setTimeout(() => setBanAlert(null), 3000);
                    }
                  }}} />
                <Button onClick={() => {
                  if (adminLogin(adminLogin_, adminPass)) {
                    setAdminMode(true);
                    refreshIncidents();
                  } else {
                    setBanAlert('❌ Nieprawidłowy login lub hasło');
                    setTimeout(() => setBanAlert(null), 3000);
                  }
                }} className="gap-2 w-full">
                  <Lock className="w-3 h-3" /> Zaloguj
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  Panel Administracyjny — Pełny Dostęp
                </h3>
                <Button size="sm" variant="ghost" onClick={() => { adminLogout(); setAdminMode(false); setAdminLogin(''); setAdminPass(''); }}>
                  Wyloguj
                </Button>
              </div>

              {/* Admin stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Wszystkie incydenty</p>
                  <p className="text-2xl font-mono font-bold text-foreground">{incidents.length}</p>
                </div>
                <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Ataki (risk &gt; 0.4)</p>
                  <p className="text-2xl font-mono font-bold text-destructive">{stats.attacks}</p>
                </div>
                <div className="bg-card border border-warning/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">False Positives</p>
                  <p className="text-2xl font-mono font-bold text-warning">{stats.false_positives}</p>
                </div>
                <div className="bg-card border border-destructive/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Zbanowani</p>
                  <p className="text-2xl font-mono font-bold text-destructive">{stats.banned_users}</p>
                </div>
              </div>

              {/* Banned users list */}
              {(() => {
                const banned = loadBannedUsers();
                return banned.length > 0 ? (
                  <div className="bg-card border border-destructive/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-display font-semibold text-destructive flex items-center gap-2">
                      <Ban className="w-4 h-4" /> Zbanowani użytkownicy ({banned.length})
                    </h4>
                    {banned.map((b, i) => (
                      <div key={i} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-destructive text-destructive-foreground text-[9px]">BANNED</Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">{b.session_id}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{new Date(b.banned_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-destructive">{b.reason}</p>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Ataki: {b.attack_count} · Vocab: {b.fingerprint?.vocab_richness} · AvgWord: {b.fingerprint?.avg_word_length} · LangMix: {b.fingerprint?.language_mix}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Full export for admin */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  const all = loadIncidents();
                  const data = JSON.stringify({ incidents: all, banned: loadBannedUsers(), stats: getIncidentStats(), exported_at: new Date().toISOString() }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `alfa_admin_export_${Date.now()}.json`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-3 h-3" /> Export pełny (admin)
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                  const data = exportAsCSV(loadIncidents());
                  const blob = new Blob([data], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `alfa_admin_dataset_${Date.now()}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-3 h-3" /> Export CSV (admin)
                </Button>
              </div>

              {/* All incidents (admin has full detail) */}
              <div className="space-y-2">
                <h4 className="text-sm font-display font-semibold text-foreground">Wszystkie incydenty (ostatnie 100)</h4>
                {[...incidents].reverse().slice(0, 100).map(inc => (
                  <div key={inc.id} className={`bg-card border rounded-lg p-3 space-y-1 ${
                    inc.ban_evasion_suspected ? 'border-destructive/50' : 'border-border'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <Badge variant="outline" className={`font-mono ${
                        inc.verdict === 'BLOCK' ? 'text-destructive' : inc.verdict === 'WARN' ? 'text-warning' : 'text-success'
                      }`}>{inc.verdict}</Badge>
                      {inc.category && <span className="font-mono text-muted-foreground">{inc.category}</span>}
                      <span className="font-mono">risk:{(inc.risk_score * 100).toFixed(0)}%</span>
                      <span className={`font-mono ${inc.annotation === 'true_positive' ? 'text-success' : inc.annotation === 'false_positive' ? 'text-warning' : 'text-muted-foreground'}`}>
                        [{inc.annotation}]
                      </span>
                      {inc.ban_evasion_suspected && <span className="text-destructive font-bold">⚠ EVASION</span>}
                      <span className="text-muted-foreground ml-auto">{inc.session_id}</span>
                      <span className="text-muted-foreground">{new Date(inc.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] font-mono text-foreground line-clamp-1">{inc.input}</p>
                    <div className="text-[9px] font-mono text-muted-foreground">
                      fp: vocab={inc.fingerprint?.vocab_richness} avgW={inc.fingerprint?.avg_word_length} lang={inc.fingerprint?.language_mix} upper={inc.fingerprint?.uppercase_ratio}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── HELPER COMPONENTS ───────────────────────────────────────

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClass = color === 'destructive' ? 'text-destructive' :
    color === 'warning' ? 'text-warning' :
    color === 'success' ? 'text-success' : 'text-primary';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${
          color === 'destructive' ? 'bg-destructive' :
          color === 'warning' ? 'bg-warning' :
          color === 'success' ? 'bg-success' : 'bg-primary'
        }`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className={`text-xs font-mono w-10 text-right ${colorClass}`}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function ShieldMetric({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  const borderClass = color === 'destructive' ? 'border-destructive/30' :
    color === 'warning' ? 'border-warning/30' : 'border-success/30';
  const textClass = color === 'destructive' ? 'text-destructive' :
    color === 'warning' ? 'text-warning' : 'text-success';

  return (
    <div className={`border ${borderClass} rounded-lg p-2 text-center`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-bold ${textClass} flex items-center justify-center gap-1`}>
        {icon}{value}
      </p>
    </div>
  );
}

function FilterChip({ label, active, icon }: { label: string; active: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg px-2 py-1 text-[10px] font-mono flex items-center gap-1 ${
      active
        ? 'bg-destructive/10 border border-destructive/30 text-destructive'
        : 'bg-muted/30 border border-border text-muted-foreground'
    }`}>
      {icon}
      {active ? '🔴' : '⚪'} {label}
    </div>
  );
}
