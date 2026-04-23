from pathlib import Path

from apps.vision.alfa_vision_agent import ALFAVisionAgent, AgentAction, build_prompt, parse_action_payload
from packages.core.settings import Settings
from packages.memory import MemoryManager


class FakeRuntime:
    def __init__(self) -> None:
        self.executed: list[str] = []

    def take_screenshot(self, scale: float = 0.5) -> bytes:
        return b"fake-image"

    def execute_action(self, action: AgentAction) -> bool:
        self.executed.append(action.action)
        return True


class FakeVisionClient:
    def __init__(self, actions: list[AgentAction]) -> None:
        self.actions = list(actions)
        self.prompts: list[str] = []

    def list_models(self) -> list[str]:
        return ["qwen2-vl"]

    def next_action(self, prompt: str, screenshot_bytes: bytes) -> AgentAction:
        self.prompts.append(prompt)
        return self.actions.pop(0)


def _make_settings(tmp_path: Path) -> Settings:
    return Settings(
        repo_root=tmp_path,
        api_host="127.0.0.1",
        api_port=8000,
        log_dir=tmp_path / "logs",
        prompt_dir=tmp_path / "prompts",
        llm_provider="ollama",
        ollama_base_url="http://127.0.0.1:11434",
        ollama_model="llama3.2",
        ollama_timeout_seconds=10,
        ollama_retries=0,
        grok_base_url="https://api.x.ai/v1",
        grok_api_key=None,
        grok_model="grok-4.20-reasoning",
        grok_timeout_seconds=3600,
        grok_retries=0,
        qdrant_url="http://127.0.0.1:6333",
        qdrant_collection="test",
        qdrant_timeout_seconds=5,
        rag_top_k=5,
        low_confidence_score=0.15,
        hash_embedding_dim=256,
        chunk_target_chars=1500,
        chunk_overlap_chars=200,
        memory_root=tmp_path / "memory",
        stt_provider="vosk",
        vosk_model_path=None,
        vosk_cache_dir=tmp_path / "models",
        vosk_sample_rate=16000,
    )


def test_parse_action_payload_handles_fenced_json():
    action = parse_action_payload("```json\n{\"action\": \"click\", \"x\": 10, \"y\": 20, \"reason\": \"Open the app\"}\n```")
    assert action.action == "click"
    assert action.x == 10
    assert action.y == 20
    assert action.reason == "Open the app"


def test_build_prompt_includes_recent_history_and_memory():
    prompt = build_prompt(
        "Inspect the screen",
        2,
        [{"step": 1, "action": "click", "reason": "Open menu"}],
        "=== ALFA MEMORY CONTEXT ===\n[ACTIVE] Previous session",
    )
    assert "RECENT HISTORY" in prompt
    assert "ALFA MEMORY CONTEXT" in prompt
    assert "Open menu" in prompt


def test_agent_run_records_memory_and_summary(tmp_path):
    settings = _make_settings(tmp_path)
    memory = MemoryManager(settings.memory_root / "vision-agent")
    memory.remember_today("Existing state", "Previous context for the agent.", tags=["vision-agent"])
    runtime = FakeRuntime()
    client = FakeVisionClient([
        AgentAction(action="describe", reason="Scanning the screen"),
        AgentAction(action="done", reason="Task completed"),
    ])

    agent = ALFAVisionAgent(
        settings=settings,
        memory=memory,
        runtime=runtime,
        vision_client=client,
        countdown_seconds=0,
        max_steps=5,
    )

    result = agent.run("Open notepad")

    assert result["done"] is True
    assert result["steps_taken"] == 2
    assert runtime.executed == ["describe", "done"]
    assert "ALFA MEMORY CONTEXT" in client.prompts[0]

    records = memory.find(tags=["vision-agent"])
    titles = [record.title for record in records]
    assert any(title.startswith("Vision task:") for title in titles)
    assert any(title.startswith("Vision step 1:") for title in titles)
    assert any(title.startswith("Vision summary:") for title in titles)
    assert Path(result["log_path"]).exists()
