import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { PipelineResult, IncidentStatus } from '@/types/tonoyan-filters';

interface IncidentItem {
  id: string;
  result: PipelineResult;
  status: IncidentStatus;
  notes: string;
  resolvedAt?: string;
}

export default function IncidentPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>(() => {
    try {
      const raw = localStorage.getItem('tonoyan_incidents');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const save = (items: IncidentItem[]) => {
    setIncidents(items);
    localStorage.setItem('tonoyan_incidents', JSON.stringify(items));
  };

  const resolve = (id: string, status: IncidentStatus) => {
    save(incidents.map(i => i.id === id ? { ...i, status, resolvedAt: new Date().toISOString() } : i));
  };

  const updateNotes = (id: string, notes: string) => {
    save(incidents.map(i => i.id === id ? { ...i, notes } : i));
  };

  const pending = incidents.filter(i => i.status === 'pending');
  const resolved = incidents.filter(i => i.status !== 'pending');

  return (
    <div className="p-4 sm:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-warning" />
          Incident / Review Panel
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">HOLD i HUMAN_REVIEW — kolejka operatora</p>
      </div>

      {incidents.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">Brak incydentów</h3>
          <p className="text-muted-foreground">Incydenty pojawią się tutaj gdy pipeline zwróci HOLD lub HUMAN_REVIEW.</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Użyj Live Analysis aby wygenerować incydenty</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-semibold text-warning">⏳ Oczekujące ({pending.length})</h2>
              {pending.map(item => (
                <IncidentCard key={item.id} item={item} onResolve={resolve} onUpdateNotes={updateNotes} />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-semibold text-muted-foreground">✓ Rozwiązane ({resolved.length})</h2>
              {resolved.map(item => (
                <IncidentCard key={item.id} item={item} onResolve={resolve} onUpdateNotes={updateNotes} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IncidentCard({ item, onResolve, onUpdateNotes }: {
  item: IncidentItem;
  onResolve: (id: string, status: IncidentStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const isPending = item.status === 'pending';
  return (
    <div className={`bg-card border rounded-xl p-4 sm:p-5 ${isPending ? 'border-warning/30' : 'border-border opacity-70'}`}>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`font-mono text-xs ${
              item.result.final_decision === 'BLOCK' ? 'border-destructive/30 text-destructive' :
              item.result.final_decision === 'HUMAN_REVIEW' ? 'border-info/30 text-info' :
              'border-warning/30 text-warning'
            }`}>
              {item.result.final_decision}
            </Badge>
            <Badge variant="outline" className={`font-mono text-xs ${
              item.status === 'pending' ? 'border-warning/30 text-warning' :
              item.status === 'allowed' ? 'border-success/30 text-success' :
              'border-destructive/30 text-destructive'
            }`}>
              {item.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{item.result.timestamp}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {item.result.lasuch.flags.map(f => (
            <Badge key={f} variant="outline" className="text-[10px] font-mono">{f}</Badge>
          ))}
        </div>
      </div>

      <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3 font-mono mb-3 line-clamp-3">
        {item.result.input}
      </p>

      <div className="text-xs text-muted-foreground mb-3">
        Risk: {item.result.lasuch.risk_score.toFixed(2)} · 
        Manip: {item.result.lasuch.manipulation_score.toFixed(2)} · 
        Cerber: {item.result.cerber.survival_status}
      </div>

      {isPending && (
        <div className="space-y-3">
          <Textarea
            placeholder="Notatki operatora..."
            value={item.notes}
            onChange={e => onUpdateNotes(item.id, e.target.value)}
            className="bg-secondary border-border text-sm min-h-[60px]"
          />
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => onResolve(item.id, 'allowed')} className="bg-success/20 text-success hover:bg-success/30 gap-1">
              <CheckCircle className="w-3 h-3" /> Allow
            </Button>
            <Button size="sm" onClick={() => onResolve(item.id, 'restricted')} variant="outline" className="gap-1">
              ⚠️ Restrict
            </Button>
            <Button size="sm" onClick={() => onResolve(item.id, 'rejected')} variant="destructive" className="gap-1">
              <XCircle className="w-3 h-3" /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
