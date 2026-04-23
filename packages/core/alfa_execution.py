from __future__ import annotations

from dataclasses import dataclass, field

from .errors import RequestValidationError


@dataclass(slots=True)
class PlanCandidate:
    candidate_id: str
    summary: str
    steps: list[str]
    proof_score: float = 0.0
    risk_score: float = 0.0
    metadata: dict[str, object] = field(default_factory=dict)

    def ranking_score(self) -> float:
        step_penalty = max(len(self.steps) - 4, 0) * 0.02
        return self.proof_score - self.risk_score - step_penalty


@dataclass(slots=True)
class ExecutionSlice:
    slice_id: str
    checkpoint_id: str
    goal: str
    steps: list[str]
    memory_injection: list[str] = field(default_factory=list)
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(slots=True)
class PlannedExecution:
    selected_plan: PlanCandidate
    slices: list[ExecutionSlice]


class MarketPlanner:
    def curate(self, proposals: list[PlanCandidate]) -> list[PlanCandidate]:
        curated = [proposal for proposal in proposals if proposal.steps]
        if not curated:
            raise RequestValidationError('No executable plan proposals were provided.')
        return curated


class BigHeadSelector:
    def select(self, proposals: list[PlanCandidate]) -> PlanCandidate:
        if not proposals:
            raise RequestValidationError('Big Head requires at least one proposal.')
        return max(proposals, key=lambda proposal: (proposal.ranking_score(), proposal.proof_score, -proposal.risk_score))


class AlfaBrain:
    def inject(self, prior_memory: list[str] | None, upcoming_steps: list[str], *, limit: int = 3) -> list[str]:
        items: list[str] = []
        for entry in prior_memory or []:
            normalized = entry.strip()
            if normalized and normalized not in items:
                items.append(normalized)

        if upcoming_steps:
            items.append(f'Next checkpoint focus: {upcoming_steps[0]}')

        return items[-limit:]


class SliceExecutor:
    def build_slices(
        self,
        plan: PlanCandidate,
        *,
        prior_memory: list[str] | None = None,
        max_steps_per_slice: int = 2,
    ) -> list[ExecutionSlice]:
        if max_steps_per_slice <= 0:
            raise RequestValidationError('max_steps_per_slice must be greater than zero.')

        brain = AlfaBrain()
        slices: list[ExecutionSlice] = []
        total_steps = len(plan.steps)
        for index in range(0, total_steps, max_steps_per_slice):
            step_group = plan.steps[index:index + max_steps_per_slice]
            checkpoint_number = (index // max_steps_per_slice) + 1
            memory_injection = brain.inject(prior_memory, step_group)
            slices.append(
                ExecutionSlice(
                    slice_id=f'{plan.candidate_id}-slice-{checkpoint_number}',
                    checkpoint_id=f'{plan.candidate_id}-checkpoint-{checkpoint_number}',
                    goal=plan.summary,
                    steps=step_group,
                    memory_injection=memory_injection,
                    metadata={
                        'candidate_id': plan.candidate_id,
                        'checkpoint_index': checkpoint_number,
                        'remaining_steps': total_steps - (index + len(step_group)),
                    },
                )
            )

        return slices

    def resume_from_checkpoint(
        self,
        plan: PlanCandidate,
        checkpoint_id: str,
        *,
        prior_memory: list[str] | None = None,
        max_steps_per_slice: int = 2,
    ) -> list[ExecutionSlice]:
        slices = self.build_slices(plan, prior_memory=prior_memory, max_steps_per_slice=max_steps_per_slice)
        for index, execution_slice in enumerate(slices):
            if execution_slice.checkpoint_id == checkpoint_id:
                return slices[index + 1:]
        raise RequestValidationError(f'Unknown checkpoint_id: {checkpoint_id}')


class AlfaExecutionPlanner:
    def __init__(self) -> None:
        self.market = MarketPlanner()
        self.big_head = BigHeadSelector()
        self.executor = SliceExecutor()

    def plan(
        self,
        proposals: list[PlanCandidate],
        *,
        prior_memory: list[str] | None = None,
        max_steps_per_slice: int = 2,
    ) -> PlannedExecution:
        curated = self.market.curate(proposals)
        selected = self.big_head.select(curated)
        slices = self.executor.build_slices(
            selected,
            prior_memory=prior_memory,
            max_steps_per_slice=max_steps_per_slice,
        )
        return PlannedExecution(selected_plan=selected, slices=slices)