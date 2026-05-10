import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Sliders, RotateCcw, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DEFAULT_T9_THRESHOLDS,
  getT9Thresholds,
  resetT9Thresholds,
  setT9Thresholds,
  type T9Thresholds,
} from '@/lib/pipeline/t9/settings';

export default function PipelineSettingsPage() {
  const [t, setT] = useState<T9Thresholds>(() => getT9Thresholds());

  const update = (patch: Partial<T9Thresholds>) => setT((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    setT9Thresholds(t);
    toast({ title: 'Progi zapisane', description: 'OutputIntegrityGuard i TrajectoryGuard używają nowych wartości.' });
  };

  const handleReset = () => {
    const def = resetT9Thresholds();
    setT(def);
    toast({ title: 'Przywrócono domyślne', description: 'Wszystkie progi czułości zresetowane.' });
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Sliders className="w-6 h-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold text-primary tracking-wider">
            Pipeline Sensitivity
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Progi HOLD vs BLOCK dla T9 Trajectory Guard i Output Integrity Guard
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="font-display text-lg text-primary tracking-wide">TrajectoryGuard</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Sterowanie reakcją na obserwowany stan modelu (LECTURE, DRIFT, OVERCONFIDENT itd.).
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Próg VERIFY (risk_score)</Label>
            <span className="font-mono text-sm text-primary">{t.trajectory_verify_risk.toFixed(2)}</span>
          </div>
          <Slider
            min={0.3}
            max={1}
            step={0.05}
            value={[t.trajectory_verify_risk]}
            onValueChange={([v]) => update({ trajectory_verify_risk: v })}
          />
          <p className="text-[10px] text-muted-foreground">
            Stan o ryzyku ≥ tej wartości → VERIFY. Domyślnie 0.75 (OVERCONFIDENT_MODE).
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Próg BLOCK (risk_score)</Label>
            <span className="font-mono text-sm text-destructive">{t.trajectory_block_risk.toFixed(2)}</span>
          </div>
          <Slider
            min={0.5}
            max={1}
            step={0.05}
            value={[t.trajectory_block_risk]}
            onValueChange={([v]) => update({ trajectory_block_risk: v })}
          />
          <p className="text-[10px] text-muted-foreground">
            Ryzyko ≥ tej wartości → twardy BLOCK. Ustaw 1.00 aby wyłączyć.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <Label>Naruszenie trajektorii → BLOCK</Label>
            <p className="text-[10px] text-muted-foreground">Domyślnie HOLD; włącz aby zaostrzyć do BLOCK.</p>
          </div>
          <Switch
            checked={t.trajectory_violation_to_block}
            onCheckedChange={(v) => update({ trajectory_violation_to_block: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>EXECUTION_CLAIM bez tool trace → BLOCK</Label>
            <p className="text-[10px] text-muted-foreground">Model twierdzi że wykonał akcję bez dowodu.</p>
          </div>
          <Switch
            checked={t.execution_claim_to_block}
            onCheckedChange={(v) => update({ execution_claim_to_block: v })}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="font-display text-lg text-primary tracking-wide">OutputIntegrityGuard</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Detekcja overclaims (np. "fixed the bug", "tests now pass") bez dowodów wykonania.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Każdy overclaim bez dowodu → BLOCK</Label>
            <p className="text-[10px] text-muted-foreground">Zero tolerancji. Domyślnie HOLD.</p>
          </div>
          <Switch
            checked={t.overclaim_block_when_no_proof}
            onCheckedChange={(v) => update({ overclaim_block_when_no_proof: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Liczba overclaims → BLOCK</Label>
            <span className="font-mono text-sm text-destructive">{t.overclaim_block_count}</span>
          </div>
          <Input
            type="number"
            min={1}
            max={99}
            value={t.overclaim_block_count}
            onChange={(e) => update({ overclaim_block_count: Math.max(1, Number(e.target.value) || 1) })}
            disabled={t.overclaim_block_when_no_proof}
          />
          <p className="text-[10px] text-muted-foreground">
            Jeśli wykryto ≥ N różnych overclaims bez dowodu → BLOCK. Domyślnie 99 (efektywnie wyłączone).
          </p>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1">
          <Save className="w-4 h-4 mr-2" /> Zapisz progi
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" /> Przywróć domyślne
        </Button>
      </div>

      <Card className="p-4 bg-muted/30">
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2">Domyślne wartości</p>
        <pre className="text-[10px] font-mono text-muted-foreground overflow-auto">
{JSON.stringify(DEFAULT_T9_THRESHOLDS, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
