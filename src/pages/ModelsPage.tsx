import { useState, useEffect } from 'react';
import { Plus, Trash2, Power, Eye, EyeOff, Bot } from 'lucide-react';
import { useModels } from '@/hooks/useStore';
import { PROVIDER_INFO, type AIProvider } from '@/types/ai-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

export default function ModelsPage() {
  const { models, addModel, updateModel, deleteModel } = useModels();
  const [open, setOpen] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: '',
    provider: 'openai' as AIProvider,
    apiKey: '',
    baseUrl: '',
    modelId: '',
    isActive: true,
  });

  const needsApiKey = form.provider !== 'ollama';

  const handleAdd = () => {
    if (!form.name || !form.modelId) return;
    if (needsApiKey && !form.apiKey) return;
    addModel({
      ...form,
      apiKey: form.apiKey || '',
      baseUrl: form.baseUrl || PROVIDER_INFO[form.provider].defaultUrl,
    });
    setForm({ name: '', provider: 'openai', apiKey: '', baseUrl: '', modelId: '', isActive: true });
    setOpen(false);
  };

  // Seed a default Ollama model if no models exist
  useEffect(() => {
    if (models.length === 0) {
      addModel({
        name: 'Llama 3.2 1B',
        provider: 'ollama',
        apiKey: '',
        baseUrl: 'http://localhost:11434',
        modelId: 'llama3.2:1b',
        isActive: true,
      });
    }
  }, [addModel, models.length]);

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Modele AI</h1>
          <p className="text-muted-foreground mt-1">Zarządzaj podłączonymi modelami i kluczami API</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-display gap-2">
              <Plus className="w-4 h-4" /> Dodaj Model
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Nowy Model AI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-muted-foreground">Nazwa</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. GPT-4 Turbo" className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground">Provider</Label>
                <Select value={form.provider} onValueChange={(v: AIProvider) => setForm(f => ({ ...f, provider: v, baseUrl: PROVIDER_INFO[v].defaultUrl }))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Model ID</Label>
                <Input value={form.modelId} onChange={e => setForm(f => ({ ...f, modelId: e.target.value }))} placeholder="np. gpt-4-turbo" className="bg-secondary border-border font-mono text-sm" />
              </div>
              {needsApiKey && (
              <div>
                <Label className="text-muted-foreground">Klucz API</Label>
                <Input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="sk-..." className="bg-secondary border-border font-mono text-sm" />
              </div>
              )}
              <div>
                <Label className="text-muted-foreground">Base URL (opcjonalnie)</Label>
                <Input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder={PROVIDER_INFO[form.provider].defaultUrl} className="bg-secondary border-border font-mono text-sm" />
              </div>
              <Button onClick={handleAdd} className="w-full gradient-primary text-primary-foreground font-display">
                Dodaj Model
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {models.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">Brak modeli</h3>
          <p className="text-muted-foreground">Dodaj pierwszy model AI, aby zacząć konfigurację filtrów.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {models.map(model => {
            const provider = PROVIDER_INFO[model.provider];
            const keyVisible = showKeys[model.id];
            return (
              <div key={model.id} className={`bg-card border rounded-xl p-6 transition-all ${model.isActive ? 'border-primary/20 glow-primary' : 'border-border opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: provider.color }} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">{model.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{provider.label}</span>
                        <span className="text-xs font-mono text-primary">{model.modelId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {keyVisible ? model.apiKey : '••••••••' + model.apiKey.slice(-4)}
                      </span>
                      <button onClick={() => setShowKeys(s => ({ ...s, [model.id]: !s[model.id] }))} className="text-muted-foreground hover:text-foreground">
                        {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Switch checked={model.isActive} onCheckedChange={v => updateModel(model.id, { isActive: v })} />
                    <button onClick={() => deleteModel(model.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
