import { Shield, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { hasValidAgeClaim, evaluateAgeGate, processVerificationCallback } from '@/lib/pipeline/age-verification';
import type { AgeGateDecision } from '@/lib/pipeline/age-verification';

interface AgeVerificationStatusProps {
  userId?: string;
  sessionId?: string;
}

export function AgeVerificationStatus({ userId = 'demo_user', sessionId = 'demo_session' }: AgeVerificationStatusProps) {
  const [verified, setVerified] = useState(() => hasValidAgeClaim(userId));
  const [gateResult, setGateResult] = useState<AgeGateDecision | null>(null);
  const [simulating, setSimulating] = useState(false);

  const checkGate = () => {
    const result = evaluateAgeGate(userId, sessionId, 'ADULT_CONTENT_RISK');
    setGateResult(result);
  };

  const simulateVerification = () => {
    setSimulating(true);
    // Simulate external provider callback
    setTimeout(() => {
      if (gateResult?.verification_link) {
        const claim = processVerificationCallback(gateResult.verification_link.token, {
          verified: true,
          age_over_18: true,
          verification_id: `ver_${Date.now().toString(36)}`,
          method: 'id_plus_liveness',
          verified_at: new Date().toISOString(),
        });
        if (claim) {
          setVerified(true);
          setGateResult(null);
        }
      }
      setSimulating(false);
    }, 1500);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-primary" />
          Age Verification
        </h3>
        <Badge variant="outline" className={`text-[10px] font-mono ${
          verified
            ? 'border-success/30 text-success'
            : 'border-warning/30 text-warning'
        }`}>
          {verified ? (
            <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> VERIFIED</span>
          ) : (
            <span className="flex items-center gap-1"><ShieldAlert className="w-2.5 h-2.5" /> NOT VERIFIED</span>
          )}
        </Badge>
      </div>

      {!verified && !gateResult && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Treści 18+ wymagają weryfikacji wieku. Kliknij, aby zasymulować flow.
          </p>
          <Button size="sm" variant="outline" onClick={checkGate} className="gap-2 text-xs">
            <ExternalLink className="w-3 h-3" />
            Test Age Gate
          </Button>
        </div>
      )}

      {gateResult && gateResult.requires_verification && gateResult.verification_link && (
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 space-y-2">
          <p className="text-xs text-warning font-medium">REQUIRE_AGE_VERIFICATION</p>
          <p className="text-[10px] text-muted-foreground">
            Link: <span className="font-mono">{gateResult.verification_link.url}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Expires: <span className="font-mono">{gateResult.verification_link.expires_at}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Reason: <span className="font-mono">{gateResult.reason}</span>
          </p>
          <Button size="sm" onClick={simulateVerification} disabled={simulating} className="gap-2 text-xs">
            {simulating ? 'Weryfikacja...' : 'Symuluj weryfikację (ID + Liveness)'}
          </Button>
        </div>
      )}

      {gateResult && gateResult.hard_block && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <p className="text-xs text-destructive font-bold">HARD BLOCK — Minor Safety</p>
          <p className="text-[10px] text-destructive/70">Brak możliwości weryfikacji. Treść permanentnie zablokowana.</p>
        </div>
      )}

      {verified && (
        <p className="text-[10px] text-success font-mono">
          ✓ User is age-verified. Adult content may proceed through pipeline.
        </p>
      )}
    </div>
  );
}
