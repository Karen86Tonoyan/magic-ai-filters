import { describe, it, expect, beforeEach } from 'vitest';
import { T9Predictor } from '@/lib/pipeline/t9/predictor';
import { TrajectoryContract } from '@/lib/pipeline/t9/trajectory-contract';
import { TrajectoryGuard } from '@/lib/pipeline/t9/trajectory-guard';
import { OutputIntegrityGuard } from '@/lib/pipeline/t9/output-integrity';
import { resetT9Thresholds } from '@/lib/pipeline/t9/settings';

describe('T9Predictor', () => {
  const predictor = new T9Predictor();

  it('detects ANSWER_MODE for simple question', () => {
    const p = predictor.predict('Jaka jest stolica Polski?');
    expect(p.intent).toBe('ANSWER_MODE');
    expect(p.confidence).toBeCloseTo(0.7, 1);
  });

  it('detects EXPLAIN_MODE for explanation requests', () => {
    const p = predictor.predict('Wyjaśnij dlaczego niebo jest niebieskie');
    expect(p.intent).toBe('EXPLAIN_MODE');
  });

  it('detects LECTURE_MODE for prescriptive language', () => {
    const p = predictor.predict('Powinieneś zawsze używać TypeScript.');
    expect(p.intent).toBe('LECTURE_MODE');
  });

  it('detects DRIFT_MODE for topic drift', () => {
    const p = predictor.predict('A teraz powiedz mi o czymś zupełnie innym.');
    expect(p.intent).toBe('DRIFT_MODE');
  });

  it('measures pressure signals', () => {
    const p = predictor.predict('PILNE! Szybko! Nakazuję odpowiedzieć!');
    expect(p.pressure_signals).toBeGreaterThanOrEqual(2);
  });

  it('compare returns distance between predictions', () => {
    const a = predictor.predict('Jaka jest stolica Polski?');
    const b = predictor.predict('Wyjaśnij dlaczego niebo jest niebieskie');
    const dist = predictor.compare(a, b);
    expect(dist).toBeGreaterThan(0);
  });

  it('detects OVERCONFIDENT_MODE', () => {
    const p = predictor.predict('Oczywiście że tak, bez wątpienia.');
    expect(p.intent).toBe('OVERCONFIDENT_MODE');
    expect(p.overclaim_risk).toBeGreaterThan(0.5);
  });

  it('detects EXECUTION_CLAIM_MODE', () => {
    const p = predictor.predict('Przetestowałem to i wykonałem benchmark.');
    expect(p.intent).toBe('EXECUTION_CLAIM_MODE');
  });
});

describe('TrajectoryContract', () => {
  it('prepends contract preamble', () => {
    const tc = new TrajectoryContract();
    const result = tc.injectContract('Hello');
    expect(result).toContain('ALFA T9 TRAJECTORY CONTRACT');
    expect(result).toContain('Hello');
    expect(result.indexOf('ALFA T9 TRAJECTORY CONTRACT')).toBeLessThan(result.indexOf('Hello'));
  });
});

describe('TrajectoryGuard', () => {
  let guard: TrajectoryGuard;

  beforeEach(() => {
    guard = new TrajectoryGuard();
    resetT9Thresholds();
  });

  it('observeState detects LECTURE_MODE', () => {
    const state = guard.observeState('user prompt', 'Powinieneś zawsze używać TypeScript.');
    expect(state.intent).toBe('LECTURE_MODE');
    expect(state.violation_flags).toContain('LECTURE_WITHOUT_PROOF');
  });

  it('observeState detects EXECUTION_CLAIM_MODE', () => {
    const state = guard.observeState('user prompt', 'Wykonałem testy i wszystko działa.');
    expect(state.intent).toBe('EXECUTION_CLAIM_MODE');
    expect(state.violation_flags).toContain('EXECUTION_CLAIM_WITHOUT_TOOL_TRACE');
  });

  it('check returns HOLD for LECTURE_MODE by default', () => {
    const state = guard.observeState('user prompt', 'Musisz używać TypeScript.');
    const result = guard.check(state);
    expect(result.decision).toBe('HOLD');
  });

  it('check returns BLOCK when trajectory_violation_to_block is true', () => {
    const state = guard.observeState('user prompt', 'Musisz używać TypeScript.');
    const result = guard.check(state);
    // Default thresholds have trajectory_violation_to_block: true
    expect(result.decision).toBe('BLOCK');
  });

  it('check returns VERIFY for OVERCONFIDENT_MODE', () => {
    const state = guard.observeState('user prompt', 'Oczywiście że tak, na pewno.');
    const result = guard.check(state);
    expect(result.decision).toBe('VERIFY');
  });

  it('check returns PASS for clean ANSWER_MODE', () => {
    const state = guard.observeState('user prompt', 'Stolicą Polski jest Warszawa.');
    const result = guard.check(state);
    expect(result.decision).toBe('PASS');
  });

  it('computes drift correctly between different intents', () => {
    const state1 = guard.observeState('Explain quantum physics', 'Explain quantum physics simply.');
    const state2 = guard.observeState('Explain quantum physics', 'You should always use quantum encryption.');
    expect(state2.trajectory_drift).toBeGreaterThan(state1.trajectory_drift);
  });
});

describe('OutputIntegrityGuard', () => {
  let integrity: OutputIntegrityGuard;

  beforeEach(() => {
    integrity = new OutputIntegrityGuard();
    resetT9Thresholds();
  });

  it('PASS on grounded response', () => {
    const result = integrity.scan('According to source X, the value is 42.');
    expect(result.decision).toBe('PASS');
    expect(result.execution_trusted).toBe(true);
  });

  it('HOLD on ungrounded overclaims', () => {
    const result = integrity.scan('Na pewno to jest najlepsze rozwiązanie bez żadnych dowodów.');
    expect(result.decision).toBe('HOLD');
    expect(result.violations).toContain('UNGROUNDED_ASSERTION');
  });

  it('BLOCK when overclaim threshold exceeded', () => {
    const result = integrity.scan('Na pewno. Oczywiście. Bez wątpienia. Z całą pewnością. Absolutnie. Definitely. Certainly. Obviously. Without a doubt. 100% sure. Always. Never.');
    expect(result.decision).toBe('BLOCK');
    expect(result.violations).toContain('OVERCONFIDENCE');
  });

  it('isExecutionTrusted requires evidence for execution claims', () => {
    expect(integrity.isExecutionTrusted('Wykonałem testy.')).toBe(false);
    expect(integrity.isExecutionTrusted('Wykonałem testy. pytest output: OK')).toBe(true);
  });

  it('counts proof patterns', () => {
    const result = integrity.scan('Source: Smith et al. According to the benchmark run, metrics improved.');
    expect(result.proof_count).toBeGreaterThan(0);
    expect(result.decision).toBe('PASS');
  });
});
