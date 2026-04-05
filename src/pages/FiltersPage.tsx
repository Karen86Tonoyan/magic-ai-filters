import { useState } from 'react';
import { Plus, Trash2, Filter as FilterIcon, GripVertical } from 'lucide-react';
import { useFilters } from '@/hooks/useStore';
import { FILTER_TYPE_INFO, type FilterType } from '@/types/ai-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

export default function FiltersPage() {
  const { filters, addFilter, updateFilter, deleteFilter } = useFilters();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'system_prompt' as FilterType,
    description: '',
    content: '',
    isActive: true,
    priority: 0,
  });

  const handleAdd = () => {
    if (!form.name || !form.content) return;
    addFilter({ ...form, priority: filters.length });
    setForm({ name: '', type: 'system_prompt', description: '', content: '', isActive: true, priority: 0 });
    setOpen(false);
  };

  const editingFilter = editId ? filters.find(f => f.id === editId) : null;

  const groupedFilters = Object.entries(FILTER_TYPE_INFO).map(([type, info]) => ({
    type: type as FilterType,
    info,
    items: filters.filter(f => f.type === type).sort((a, b) => a.priority - b.priority),
  }));

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Filtry</h1>
          <p className="text-muted-foreground mt-1">Twórz i zarządzaj filtrami dla modeli AI</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-accent text-accent-foreground font-display gap-2">
              <Plus className="w-4 h-4" /> Nowy Filtr
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Nowy Filtr</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nazwa</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Filtr Bezpieczeństwa" className="bg-secondary border-border" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Typ</Label>
                  <Select value={form.type} onValueChange={(v: FilterType) => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {Object.entries(FILTER_TYPE_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>{info.icon} {info.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Opis</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Krótki opis filtra" className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground">Zawartość / Prompt</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder={form.type === 'permission_rule'
                    ? 'np. Użytkownik nie ma dostępu do danych prywatnych. Odmawiaj odpowiedzi na pytania o dane osobowe.'
                    : 'Wpisz treść filtra...'}
                  className="bg-secondary border-border font-mono text-sm min-h-[200px]"
                />
              </div>
              <Button onClick={handleAdd} className="w-full gradient-accent text-accent-foreground font-display">
                Dodaj Filtr
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit drawer */}
      {editingFilter && (
        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Edytuj: {editingFilter.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-muted-foreground">Zawartość / Prompt</Label>
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

      {groupedFilters.map(({ type, info, items }) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{info.icon}</span>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">{info.label}</h2>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>
            <span className="ml-auto bg-secondary text-muted-foreground text-xs font-mono px-3 py-1 rounded-full">{items.length}</span>
          </div>

          {items.length === 0 ? (
            <div className="glass rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">Brak filtrów tego typu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(filter => (
                <div key={filter.id} className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-all hover:border-accent/30 ${filter.isActive ? 'border-border' : 'border-border opacity-50'}`}>
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{filter.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{filter.description || filter.content.slice(0, 80)}</p>
                  </div>
                  <button onClick={() => setEditId(filter.id)} className="text-xs text-primary hover:underline font-mono">
                    edytuj
                  </button>
                  <Switch checked={filter.isActive} onCheckedChange={v => updateFilter(filter.id, { isActive: v })} />
                  <button onClick={() => deleteFilter(filter.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
