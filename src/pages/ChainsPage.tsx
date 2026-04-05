import { useState } from 'react';
import { Plus, Trash2, Zap, ArrowRight } from 'lucide-react';
import { useChains, useFilters, useModels } from '@/hooks/useStore';
import { FILTER_TYPE_INFO, PROVIDER_INFO } from '@/types/ai-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

export default function ChainsPage() {
  const { chains, addChain, updateChain, deleteChain } = useChains();
  const { filters } = useFilters();
  const { models } = useModels();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    filterIds: [] as string[],
    assignedModelIds: [] as string[],
    isActive: true,
  });

  const handleAdd = () => {
    if (!form.name || form.filterIds.length === 0) return;
    addChain(form);
    setForm({ name: '', description: '', filterIds: [], assignedModelIds: [], isActive: true });
    setOpen(false);
  };

  const toggleFilter = (id: string) => {
    setForm(f => ({
      ...f,
      filterIds: f.filterIds.includes(id)
        ? f.filterIds.filter(fid => fid !== id)
        : [...f.filterIds, id],
    }));
  };

  const toggleModel = (id: string) => {
    setForm(f => ({
      ...f,
      assignedModelIds: f.assignedModelIds.includes(id)
        ? f.assignedModelIds.filter(mid => mid !== id)
        : [...f.assignedModelIds, id],
    }));
  };

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Łańcuchy Filtrów</h1>
          <p className="text-muted-foreground mt-1">Twórz pipeline'y filtrów przypisane do modeli</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-display gap-2">
              <Plus className="w-4 h-4" /> Nowy Łańcuch
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Nowy Łańcuch Filtrów</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <Label className="text-muted-foreground">Nazwa</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Bezpieczny Pipeline" className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground">Opis</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opis łańcucha" className="bg-secondary border-border" />
              </div>

              <div>
                <Label className="text-muted-foreground mb-3 block">Filtry (w kolejności wykonania)</Label>
                {filters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Najpierw stwórz filtry</p>
                ) : (
                  <div className="space-y-2">
                    {filters.map((filter, i) => (
                      <label key={filter.id} className="flex items-center gap-3 bg-secondary rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors">
                        <Checkbox checked={form.filterIds.includes(filter.id)} onCheckedChange={() => toggleFilter(filter.id)} />
                        <span className="text-lg">{FILTER_TYPE_INFO[filter.type].icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{filter.name}</p>
                          <p className="text-xs text-muted-foreground">{FILTER_TYPE_INFO[filter.type].label}</p>
                        </div>
                        {form.filterIds.includes(filter.id) && (
                          <span className="text-xs font-mono text-primary">#{form.filterIds.indexOf(filter.id) + 1}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground mb-3 block">Przypisz do modeli</Label>
                {models.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Najpierw dodaj modele</p>
                ) : (
                  <div className="space-y-2">
                    {models.map(model => (
                      <label key={model.id} className="flex items-center gap-3 bg-secondary rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors">
                        <Checkbox checked={form.assignedModelIds.includes(model.id)} onCheckedChange={() => toggleModel(model.id)} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROVIDER_INFO[model.provider].color }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{model.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{model.modelId}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleAdd} className="w-full gradient-primary text-primary-foreground font-display" disabled={!form.name || form.filterIds.length === 0}>
                Utwórz Łańcuch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {chains.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">Brak łańcuchów</h3>
          <p className="text-muted-foreground">Stwórz pipeline filtrów, aby kontrolować przepływ danych przez AI.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chains.map(chain => {
            const chainFilters = chain.filterIds.map(id => filters.find(f => f.id === id)).filter(Boolean);
            const chainModels = chain.assignedModelIds.map(id => models.find(m => m.id === id)).filter(Boolean);
            return (
              <div key={chain.id} className={`bg-card border rounded-xl p-6 transition-all ${chain.isActive ? 'border-primary/20' : 'border-border opacity-50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-lg">{chain.name}</h3>
                    <p className="text-sm text-muted-foreground">{chain.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={chain.isActive} onCheckedChange={v => updateChain(chain.id, { isActive: v })} />
                    <button onClick={() => deleteChain(chain.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pipeline visualization */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">INPUT</span>
                  {chainFilters.map((filter, i) => (
                    <div key={filter!.id} className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono bg-accent/10 text-accent px-3 py-1 rounded-full border border-accent/20">
                        {FILTER_TYPE_INFO[filter!.type].icon} {filter!.name}
                      </span>
                    </div>
                  ))}
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">AI MODEL</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">OUTPUT</span>
                </div>

                {chainModels.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Modele:</span>
                    {chainModels.map(model => (
                      <span key={model!.id} className="text-xs font-mono bg-secondary text-foreground px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_INFO[model!.provider].color }} />
                        {model!.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
