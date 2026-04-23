from packages.core import AlfaBrain, AlfaExecutionPlanner, PlanCandidate, SliceExecutor
from packages.core.errors import RequestValidationError


def test_big_head_prefers_best_proof_to_risk_ratio():
    planner = AlfaExecutionPlanner()
    proposals = [
        PlanCandidate(
            candidate_id='safe-fast',
            summary='Handle request in short validated slices',
            steps=['Inspect input', 'Validate dependencies', 'Return result'],
            proof_score=0.84,
            risk_score=0.12,
        ),
        PlanCandidate(
            candidate_id='risky-long',
            summary='Handle request with broad autonomy',
            steps=['Inspect input', 'Branch widely', 'Modify state', 'Retry freely', 'Finalize'],
            proof_score=0.91,
            risk_score=0.33,
        ),
    ]

    execution = planner.plan(proposals, prior_memory=['User asked for bounded execution'])

    assert execution.selected_plan.candidate_id == 'safe-fast'
    assert execution.slices[0].checkpoint_id == 'safe-fast-checkpoint-1'


def test_slice_executor_builds_checkpoints_with_memory_injection():
    plan = PlanCandidate(
        candidate_id='checkpointed',
        summary='Execute in bounded ALFA slices',
        steps=['Collect facts', 'Choose plan', 'Execute slice', 'Report checkpoint', 'Prepare next slice'],
        proof_score=0.9,
        risk_score=0.1,
    )

    slices = SliceExecutor().build_slices(
        plan,
        prior_memory=['State B verified', 'Token budget limited'],
        max_steps_per_slice=2,
    )

    assert [execution_slice.steps for execution_slice in slices] == [
        ['Collect facts', 'Choose plan'],
        ['Execute slice', 'Report checkpoint'],
        ['Prepare next slice'],
    ]
    assert slices[0].memory_injection == ['State B verified', 'Token budget limited', 'Next checkpoint focus: Collect facts']
    assert slices[2].metadata['remaining_steps'] == 0


def test_resume_from_checkpoint_returns_remaining_slices_only():
    plan = PlanCandidate(
        candidate_id='resume',
        summary='Resume after checkpoint',
        steps=['A', 'B', 'C', 'D'],
        proof_score=0.7,
        risk_score=0.1,
    )

    remaining = SliceExecutor().resume_from_checkpoint(
        plan,
        'resume-checkpoint-1',
        prior_memory=['Checkpoint one committed'],
        max_steps_per_slice=2,
    )

    assert len(remaining) == 1
    assert remaining[0].steps == ['C', 'D']


def test_alfa_brain_deduplicates_and_keeps_latest_focus():
    injection = AlfaBrain().inject(
        ['State B verified', 'State B verified', 'Previous action succeeded'],
        ['Verify final output'],
        limit=3,
    )

    assert injection == ['State B verified', 'Previous action succeeded', 'Next checkpoint focus: Verify final output']


def test_market_requires_executable_steps():
    planner = AlfaExecutionPlanner()

    try:
        planner.plan([PlanCandidate(candidate_id='empty', summary='Nothing', steps=[])])
    except RequestValidationError as error:
        assert error.code == 'REQUEST_VALIDATION_ERROR'
    else:
        raise AssertionError('Expected RequestValidationError for empty plan proposals')