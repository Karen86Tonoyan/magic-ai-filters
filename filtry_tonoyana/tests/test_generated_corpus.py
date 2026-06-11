"""
ALFA — Generated Corpus Tests (Faza 1)
© Karen Tonoyan

Parametryzowane testy z automatycznie wygenerowanego corpusu.
Zamiast pisać każdy test ręcznie — generator produkuje setki przypadków
z gwarantowanymi właściwościami detekcji.

Grupy:
  TestGeneratedHallucination  — 80 promptów, każdy ≥3 PL_TRIGGERS → HOLD/REJECT
  TestGeneratedJailbreak      — 23 promptów z _HOSTILE triggers → tone="hostile"
  TestBenignControl           — 15 bezpiecznych promptów → PASS
  TestMultiTurnEscalation     — 8 sekwencji gradual escalation → finale blocked
  TestDensitySweep            — monotoniczność scoring po liczbie triggerów
"""
from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from filtry_tonoyana.engine import (
    AlfaEngine,
    ConversationContext,
    STRATEGY_LOCKDOWN,
    STRATEGY_MONTE_CARLO,
)
from filtry_tonoyana.tests.corpus.generators import PromptGenerator

# ── Shared generator ──────────────────────────────────────────────────────────

_GEN = PromptGenerator()
_HALL_CASES   = _GEN.hallucination_cases()
_JAIL_CASES   = _GEN.jailbreak_cases()
_BENIGN_CASES = _GEN.benign_cases()
_ESC_SEQS     = _GEN.escalation_sequences()
_DENSITY      = _GEN.density_sweep()


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def module_engine():
    """Module-scoped engine — reused across all parametrized tests in this file."""
    return AlfaEngine(mistake_log=Path(tempfile.mktemp(suffix=".jsonl")))


# ═══════════════════════════════════════════════════════════════════════════════
# 1. GENERATED HALLUCINATION — 80 prompts, each ≥3 triggers
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.hallucination
@pytest.mark.high_stakes
class TestGeneratedHallucination:
    """
    80 automatycznie wygenerowanych promptów halucynacyjnych.
    Każdy zawiera ≥3 HALLUCINATION_PATTERNS → F4=0.75 → HOLD/REJECT.
    Weryfikuje że system nie może być ominięty przez parafrazę tematu
    przy zachowaniu wzorców absolutyzmu.
    """

    @pytest.mark.parametrize(
        "case_id,domain,prompt",
        _HALL_CASES,
        ids=[c[0] for c in _HALL_CASES],
    )
    def test_hallucination_blocked(
        self, module_engine: AlfaEngine, case_id: str, domain: str, prompt: str
    ):
        ctx = ConversationContext(domain=domain, stakes="high")
        report = module_engine.run(prompt, ctx)
        assert report.decision in {"HOLD", "REJECT"}, (
            f"[{case_id}] Hallucination prompt PASS'd — "
            f"decision={report.decision}, score={report.final_score:.4f}, "
            f"strategy={report.strategy}\n  prompt={prompt[:100]}"
        )

    @pytest.mark.parametrize(
        "case_id,domain,prompt",
        _GEN.hallucination_high_density(),
        ids=[c[0] for c in _GEN.hallucination_high_density()],
    )
    def test_high_density_hallucination_blocked(
        self, module_engine: AlfaEngine, case_id: str, domain: str, prompt: str
    ):
        """4-triggerowe prompty — najwyższa gęstość wzorców."""
        ctx = ConversationContext(domain=domain, stakes="high")
        report = module_engine.run(prompt, ctx)
        assert report.decision in {"HOLD", "REJECT"}, (
            f"[{case_id}] High-density hallucination not blocked: "
            f"decision={report.decision} score={report.final_score:.4f}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. GENERATED JAILBREAK — 23 prompts with _HOSTILE triggers
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.jailbreak
class TestGeneratedJailbreak:
    """
    23 warianty jailbreak z _HOSTILE triggers.
    Weryfikuje że każdy ustawia tone="hostile" i eskaluje strategię.
    """

    @pytest.mark.parametrize(
        "case_id,prompt",
        _JAIL_CASES,
        ids=[c[0] for c in _JAIL_CASES],
    )
    def test_jailbreak_triggers_hostile_tone(
        self, module_engine: AlfaEngine, case_id: str, prompt: str
    ):
        ctx = ConversationContext()
        module_engine.run(prompt, ctx)
        assert ctx.tone == "hostile", (
            f"[{case_id}] Jailbreak nie ustawił tone=hostile — "
            f"tone={ctx.tone}\n  prompt={prompt[:80]}"
        )

    @pytest.mark.parametrize(
        "case_id,prompt",
        _JAIL_CASES,
        ids=[c[0] for c in _JAIL_CASES],
    )
    def test_jailbreak_triggers_lockdown_strategy(
        self, module_engine: AlfaEngine, case_id: str, prompt: str
    ):
        """Hostile tone → AlfaBrain picks lockdown strategy."""
        ctx = ConversationContext()
        report = module_engine.run(prompt, ctx)
        assert report.strategy == STRATEGY_LOCKDOWN, (
            f"[{case_id}] Jailbreak nie eskalował do lockdown — "
            f"strategy={report.strategy}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 3. BENIGN CONTROL — 15 safe prompts → PASS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.benign
class TestBenignControl:
    """
    15 bezpiecznych promptów — żaden nie powinien być blokowany.
    Weryfikuje brak false positive przy normalnym użyciu.
    """

    @pytest.mark.parametrize(
        "case_id,prompt",
        _BENIGN_CASES,
        ids=[c[0] for c in _BENIGN_CASES],
    )
    def test_benign_not_blocked(
        self, module_engine: AlfaEngine, case_id: str, prompt: str
    ):
        ctx = ConversationContext()
        report = module_engine.run(prompt, ctx)
        assert report.decision == "PASS", (
            f"[{case_id}] Benign prompt błędnie zablokowany — "
            f"decision={report.decision}, score={report.final_score:.4f}\n"
            f"  prompt={prompt[:80]}"
        )

    @pytest.mark.parametrize(
        "case_id,prompt",
        _BENIGN_CASES,
        ids=[c[0] for c in _BENIGN_CASES],
    )
    def test_benign_not_hostile(
        self, module_engine: AlfaEngine, case_id: str, prompt: str
    ):
        """Bezpieczne prompty nie ustawiają hostile tone."""
        ctx = ConversationContext()
        module_engine.run(prompt, ctx)
        assert ctx.tone != "hostile", (
            f"[{case_id}] Benign prompt błędnie ustawił tone=hostile"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 4. MULTI-TURN ESCALATION — 8 sequences, finale always blocked
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.multi_turn
@pytest.mark.hallucination
@pytest.mark.high_stakes
class TestMultiTurnEscalation:
    """
    8 sekwencji gradual escalation: benign intro → eskalacja → blocked finale.
    Każdy finale zawiera ≥3 PL_TRIGGERS → HOLD/REJECT.
    Weryfikuje że shared ConversationContext poprawnie akumuluje kontekst.
    """

    @pytest.mark.parametrize(
        "case_id,domain,turns",
        _ESC_SEQS,
        ids=[s[0] for s in _ESC_SEQS],
    )
    def test_escalation_finale_blocked(
        self, case_id: str, domain: str, turns: list[str]
    ):
        """Ostatnia tura sekwencji powinna być zablokowana."""
        engine = AlfaEngine(
            mistake_log=Path(tempfile.mktemp(suffix=".jsonl"))
        )
        ctx = ConversationContext(domain=domain, stakes="high")
        reports = [engine.run(turn, ctx) for turn in turns]
        final = reports[-1]
        assert final.decision in {"HOLD", "REJECT"}, (
            f"[{case_id}] Finale escalation nie zablokowany — "
            f"decision={final.decision}, score={final.final_score:.4f}, "
            f"strategy={final.strategy}\n  finale={turns[-1][:100]}"
        )

    @pytest.mark.parametrize(
        "case_id,domain,turns",
        _ESC_SEQS,
        ids=[s[0] for s in _ESC_SEQS],
    )
    def test_escalation_strategy_escalates(
        self, case_id: str, domain: str, turns: list[str]
    ):
        """High-stakes domain → at least one turn uses MC or lockdown."""
        engine = AlfaEngine(
            mistake_log=Path(tempfile.mktemp(suffix=".jsonl"))
        )
        ctx = ConversationContext(domain=domain, stakes="high")
        reports = [engine.run(turn, ctx) for turn in turns]
        escalated_strategies = {STRATEGY_LOCKDOWN, STRATEGY_MONTE_CARLO}
        assert any(r.strategy in escalated_strategies for r in reports), (
            f"[{case_id}] Żadna tura nie eskalowała strategii — "
            f"strategies={[r.strategy for r in reports]}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 5. DENSITY SWEEP — monotonicity of scoring with trigger count
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.hallucination
@pytest.mark.boundary
class TestDensitySweep:
    """
    Weryfikuje monotoniczność scoring: więcej triggerów → wyższy score.
    n=0 → PASS, n=1 → nisko, n=2 → wyżej, n=3 → HOLD, n=4 → HOLD.
    """

    @pytest.mark.parametrize(
        "n_triggers,case_id,prompt",
        _DENSITY,
        ids=[f"density_n{d[0]}" for d in _DENSITY],
    )
    def test_density_score_monotone(
        self, module_engine: AlfaEngine, n_triggers: int, case_id: str, prompt: str
    ):
        ctx = ConversationContext(domain="medical", stakes="high")
        report = module_engine.run(prompt, ctx)
        if n_triggers == 0:
            assert report.decision == "PASS", f"n=0 nie PASS: {report.decision} score={report.final_score:.4f}"
        elif n_triggers >= 3:
            assert report.decision in {"HOLD", "REJECT"}, (
                f"n={n_triggers} nie HOLD/REJECT: {report.decision} score={report.final_score:.4f}"
            )

    def test_density_monotone_ordering(self, module_engine: AlfaEngine):
        """score(n) ≤ score(n+1) dla n=0..3 (monotoniczność)."""
        scores: list[float] = []
        for n, case_id, prompt in _DENSITY:
            ctx = ConversationContext(domain="medical", stakes="high")
            report = module_engine.run(prompt, ctx)
            scores.append(report.final_score)

        for i in range(len(scores) - 1):
            assert scores[i] <= scores[i + 1] + 1e-9, (
                f"Monotoniczność naruszona: score[{i}]={scores[i]:.4f} > "
                f"score[{i+1}]={scores[i+1]:.4f}"
            )
