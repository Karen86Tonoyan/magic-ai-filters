import { Bot, Filter, Zap, MessageSquare, Activity, Shield } from 'lucide-react';
import { useModels } from '@/hooks/useStore';
import { useFilters } from '@/hooks/useStore';
import { useChains } from '@/hooks/useStore';
import { StatCard } from '@/components/StatCard';
import { PROVIDER_INFO } from '@/types/ai-filters';

export default function DashboardPage() {
  const { models } = useModels();
  const { filters } = useFilters();
  const { chains } = useChains();

  const activeModels = models.filter(m => m.isActive);
  const activeFilters = filters.filter(f => f.isActive);

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Przegląd Twoich modeli AI i filtrów</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Bot} label="Modele AI" value={models.length} description={`${activeModels.length} aktywnych`} variant="primary" />
        <StatCard icon={Filter} label="Filtry" value={filters.length} description={`${activeFilters.length} aktywnych`} variant="accent" />
        <StatCard icon={Zap} label="Łańcuchy" value={chains.length} description="Pipeline'y filtrów" variant="info" />
        <StatCard icon={Shield} label="Reguły uprawnień" value={filters.filter(f => f.type === 'permission_rule').length} description="Kontrola dostępu" variant="warning" />
      </div>

      {/* Active Models */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Aktywne Modele
        </h2>
        {activeModels.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Brak aktywnych modeli. Dodaj pierwszy model AI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeModels.map(model => {
              const provider = PROVIDER_INFO[model.provider];
              return (
                <div key={model.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full animate-pulse-glow" style={{ backgroundColor: provider.color }} />
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{provider.label}</span>
                  </div>
                  <p className="font-display font-semibold text-foreground">{model.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{model.modelId}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Filters */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
          <Filter className="w-5 h-5 text-accent" />
          Ostatnie Filtry
        </h2>
        {filters.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Brak filtrów. Stwórz pierwszy filtr.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filters.slice(0, 4).map(filter => (
              <div key={filter.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-accent">{filter.type}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${filter.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {filter.isActive ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                </div>
                <p className="font-semibold text-foreground">{filter.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{filter.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
