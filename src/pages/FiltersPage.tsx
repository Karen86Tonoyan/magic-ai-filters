import { useState } from 'react';
import { Plus, Trash2, GripVertical, Shield, Zap, Lock, AlertTriangle } from 'lucide-react';
import { useFilters } from '@/hooks/useStore';
import { FILTER_TYPE_INFO, DEFAULT_DLP_PATTERNS, type FilterType, type FilterConfig } from '@/types/ai-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

export default function FiltersPage() {
  const { filters, addFilter, updateFilter, deleteFilter } = useFilters();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'context_gate' as FilterType,
    description: '',
    content: '',
    isActive: true,
    priority: 0,
    config: {
      failAction: 'block',
      confidenceThreshold: 0.55,
      blockPII: true,
      blockCredentials: true,
      blockedPatterns: [] as string[],
    } as FilterConfig,
  });

  const handleAdd = () => {
    if (!form.name) return;
    const info = FILTER_TYPE_INFO[form.type];
    addFilter({
      ...form,
      phase: info.phase,
      priority: filters.length,
    });
    setForm({
      name: '', type: 'context_gate', description: '', content: '', isActive: true, priority: 0,
      config: { failAction: 'block', confidenceThreshold: 0.55, blockPII: true, blockCredentials: true, blockedPatterns: [] },
    });
    setOpen(false);
  };

  const editingFilter = editId ? filters.find(f => f.id === editId) : null;

  const preModelFilters = filters.filter(f => f.phase === 'pre_model').sort((a, b) => a.priority - b.priority);
  const postModelFilters = filters.filter(f => f.phase === 'post_model').sort((a, b) => a.priority - b.priority);

  const renderFilterCard = (filter: typeof filters[0]) => {
    const info = FILTER_TYPE_INFO[filter.type];
    const isSecurityFilter = info.category === 'security';
    return (
      <div key={filter.id} className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-all hover:border-primary/30 ${
        filter.isActive ? (isSecurityFilter ? 'border-destructive/20' : 'border-border') : 'border-border opacity-50'
      }`}>
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
        <span className="text-xl shrink-0">{info.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm">{filter.name}</p>
            {isSecurityFilter && (
              <span className="text-[10px] font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase tracking-wider">
                {filter.config.failAction || 'block'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{filter.description || info.description}</p>
          {filter.type === 'confidence_gate' && filter.config.confidenceThreshold && (
            <p className="text-xs font-mono text-warning mt-1">Próg: {filter.config.confidenceThreshold}</p>
          )}
          {filter.type === 'dlp_scanner' && (
            <p className="text-xs font-mono text-info mt-1">
              PII: {filter.config.blockPII ? '✓' : '✗'} | Credentials: {filter.config.blockCredentials ? '✓' : '✗'}
              {filter.config.blockedPatterns?.length ? ` | +${filter.config.blockedPatterns.length} wzorców` : ''}
            </p>
          )}
        </div>
        <button onClick={() => setEditId(filter.id)} className="text-xs text-primary hover:underline font-mono shrink-0">
          edytuj
        </button>
        <Switch checked={filter.isActive} onCheckedChange={v => updateFilter(filter.id, { isActive: v })} />
        <button onClick={() => deleteFilter(filter.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderConfigFields = () => {
    switch (form.type) {
      case 'confidence_gate':
        return (
          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <Label className="text-muted-foreground">Próg pewności (0.0 - 1.0)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[form.config.confidenceThreshold || 0.55]}
                onValueChange={([v]) => setForm(f => ({ ...f, config: { ...f.config, confidenceThreshold: v } }))}
                min={0} max={1} step={0.05}
                className="flex-1"
              />
              <span className="font-mono text-sm text-warning w-12 text-right">{form.config.confidenceThreshold}</span>
            </div>
            <p className="text-xs text-muted-foreground">NOWA Logika: Gold ≥0.55, Silver ≥0.48, Bronze ≥0.40</p>
          </div>
        );
      case 'dlp_scanner':
        return (
          <div className="space-y-4 bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.config.blockPII} onCheckedChange={v => setForm(f => ({ ...f, config: { ...f.config, blockPII: !!v } }))} />
                <span className="text-sm text-foreground">Blokuj PII (dane osobowe)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.config.blockCredentials} onCheckedChange={v => setForm(f => ({ ...f, config: { ...f.config, blockCredentials: !!v } }))} />
                <span className="text-sm text-foreground">Blokuj credentials (hasła, klucze)</span>
              </label>
            </div>
            <div>
              <Label className="text-muted-foreground mb-2 block">Wzorce DLP (predefiniowane)</Label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_DLP_PATTERNS.map(p => (
                  <label key={p.label} className="flex items-center gap-2 text-xs cursor-pointer bg-card rounded p-2">
                    <Checkbox
                      checked={form.config.blockedPatterns?.includes(p.pattern)}
                      onCheckedChange={v => {
                        setForm(f => ({
                          ...f,
                          config: {
                            ...f.config,
                            blockedPatterns: v
                              ? [...(f.config.blockedPatterns || []), p.pattern]
                              : (f.config.blockedPatterns || []).filter(pat => pat !== p.pattern),
                          },
                        }));
                      }}
                    />
                    <span className="text-foreground">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      case 'context_gate':
        return (
          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.config.requireSources !== false}
                onCheckedChange={v => setForm(f => ({ ...f, config: { ...f.config, requireSources: !!v } }))}
              />
              <span className="text-sm text-foreground">Wymagaj zweryfikowanych źródeł</span>
            </label>
            <div>
              <Label className="text-muted-foreground">Minimalna liczba źródeł</Label>
              <Input
                type="number"
                value={form.config.minSources || 1}
                onChange={e => setForm(f => ({ ...f, config: { ...f.config, minSources: parseInt(e.target.value) || 1 } }))}
                className="bg-card border-border w-24 font-mono"
                min={1}
              />
            </div>
          </div>
        );
      case 'permission_rule':
        return (
          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <div>
              <Label className="text-muted-foreground">Maksymalna liczba tokenów</Label>
              <Input
                type="number"
                value={form.config.maxTokens || ''}
                onChange={e => setForm(f => ({ ...f, config: { ...f.config, maxTokens: parseInt(e.target.value) || undefined } }))}
                className="bg-card border-border w-32 font-mono"
                placeholder="bez limitu"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Zablokowane tematy (po przecinku)</Label>
              <Input
                value={form.config.blockedTopics?.join(', ') || ''}
                onChange={e => setForm(f => ({ ...f, config: { ...f.config, blockedTopics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))}
                className="bg-card border-border font-mono text-sm"
                placeholder="np. dane prywatne, hasła, finanse"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Filtry</h1>
          <p className="text-muted-foreground mt-1">Architekturalne kontrole — niezależne od modelu AI</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-accent text-accent-foreground font-display gap-2">
              <Plus className="w-4 h-4" /> Nowy Filtr
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Nowy Filtr</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nazwa</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. DLP Scanner" className="bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Typ</Label>
                  <Select value={form.type} onValueChange={(v: FilterType) => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <div className="px-2 py-1 text-xs text-destructive font-mono uppercase tracking-wider">⬆ Pre-Model (niezależne od AI)</div>
                      {Object.entries(FILTER_TYPE_INFO).filter(([, i]) => i.phase === 'pre_model').map(([key, info]) => (
                        <SelectItem key={key} value={key}>{info.icon} {info.label}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs text-info font-mono uppercase tracking-wider mt-2">⬇ Post-Model</div>
                      {Object.entries(FILTER_TYPE_INFO).filter(([, i]) => i.phase === 'post_model').map(([key, info]) => (
                        <SelectItem key={key} value={key}>{info.icon} {info.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Phase indicator */}
              <div className={`rounded-lg p-3 flex items-center gap-3 ${
                FILTER_TYPE_INFO[form.type].phase === 'pre_model'
                  ? 'bg-destructive/5 border border-destructive/20'
                  : 'bg-info/5 border border-info/20'
              }`}>
                {FILTER_TYPE_INFO[form.type].phase === 'pre_model' ? (
                  <>
                    <Lock className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Filtr Pre-Model</p>
                      <p className="text-xs text-muted-foreground">Wykonuje się PRZED modelem. Model nie ma wpływu na ten filtr.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-info" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Filtr Post-Model</p>
                      <p className="text-xs text-muted-foreground">Wykonuje się PO odpowiedzi modelu. Filtruje/przetwarza output.</p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Opis</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Krótki opis filtra" className="bg-secondary border-border" />
              </div>

              {/* Type-specific config */}
              {renderConfigFields()}

              <div>
                <Label className="text-muted-foreground">Zawartość / Reguła / Prompt</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder={
                    form.type === 'permission_rule'
                      ? 'np. Użytkownik nie ma dostępu do danych prywatnych. To nie jest sugestia dla AI — to twarda reguła architekturalna.'
                      : form.type === 'context_gate'
                      ? 'np. Zezwalaj tylko na odpowiedzi oparte o dokumenty z bazy wiedzy. Brak źródła = brak odpowiedzi.'
                      : 'Wpisz treść filtra...'
                  }
                  className="bg-secondary border-border font-mono text-sm min-h-[150px]"
                />
              </div>

              <div>
                <Label className="text-muted-foreground">Akcja przy wykryciu</Label>
                <Select
                  value={form.config.failAction || 'block'}
                  onValueChange={v => setForm(f => ({ ...f, config: { ...f.config, failAction: v as 'block' | 'warn' | 'log' } }))}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="block">🚫 Blokuj (nie wysyłaj do modelu)</SelectItem>
                    <SelectItem value="warn">⚠️ Ostrzeż (wyślij ale oznacz)</SelectItem>
                    <SelectItem value="log">📝 Loguj (wyślij normalnie, zapisz log)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAdd} className="w-full gradient-accent text-accent-foreground font-display" disabled={!form.name}>
                Dodaj Filtr
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      {editingFilter && (
        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Edytuj: {editingFilter.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-muted-foreground">Zawartość / Reguła</Label>
                <Textarea
                  defaultValue={editingFilter.content}
                  onBlur={e => updateFilter(editingFilter.id, { content: e.target.value })}
                  className="bg-secondary border-border font-mono text-sm min-h-[300px]"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* NOWA Logika Banner */}
      <div className="bg-card border border-destructive/20 rounded-xl p-5 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display font-semibold text-foreground">Filozofia NOWA Logika</h3>
          <p className="text-sm text-muted-foreground mt-1">
            "Lepiej zapytać niż skłamać" — Filtry pre-model to <strong className="text-foreground">kontrole architekturalne</strong>, 
            nie prompt engineering. Model AI <strong className="text-destructive">nie może</strong> ich obejść, 
            zignorować ani nadpisać. Działają jak firewall — przed modelem.
          </p>
        </div>
      </div>

      {/* PRE-MODEL Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-destructive/20 pb-3">
          <Shield className="w-6 h-6 text-destructive" />
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">⬆ Pre-Model Filters</h2>
            <p className="text-xs text-muted-foreground">Niezależne od AI. Model NIE ma wpływu na te filtry.</p>
          </div>
          <span className="ml-auto bg-destructive/10 text-destructive text-xs font-mono px-3 py-1 rounded-full">{preModelFilters.length}</span>
        </div>

        {preModelFilters.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center border border-dashed border-destructive/20">
            <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Brak filtrów pre-model. Dodaj Context Gate, DLP lub regułę uprawnień.</p>
          </div>
        ) : (
          <div className="space-y-2">{preModelFilters.map(renderFilterCard)}</div>
        )}
      </div>

      {/* Divider - MODEL */}
      <div className="flex items-center gap-4 py-4">
        <div className="flex-1 border-t border-border" />
        <div className="bg-primary/10 border border-primary/20 rounded-full px-6 py-2">
          <span className="font-display text-sm font-semibold text-primary">🤖 MODEL AI</span>
        </div>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* POST-MODEL Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-info/20 pb-3">
          <Zap className="w-6 h-6 text-info" />
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">⬇ Post-Model Filters</h2>
            <p className="text-xs text-muted-foreground">Filtrują i przetwarzają odpowiedź AI.</p>
          </div>
          <span className="ml-auto bg-info/10 text-info text-xs font-mono px-3 py-1 rounded-full">{postModelFilters.length}</span>
        </div>

        {postModelFilters.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center border border-dashed border-info/20">
            <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Brak filtrów post-model. Dodaj filtr lub transformację outputu.</p>
          </div>
        ) : (
          <div className="space-y-2">{postModelFilters.map(renderFilterCard)}</div>
        )}
      </div>
    </div>
  );
}
