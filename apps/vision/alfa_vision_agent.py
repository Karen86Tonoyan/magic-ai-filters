from __future__ import annotations

import argparse
import base64
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

import httpx

from packages.core.settings import Settings, load_settings
from packages.memory import MemoryManager

SYSTEM_PROMPT = """You are ALFA Vision Agent. Inspect the Windows screenshot and decide exactly one next GUI action. Return JSON only. If the task is complete use action=\"done\". If you are unsure use action=\"describe\". Coordinates must target the original desktop, not the scaled preview."""


@dataclass(slots=True)
class AgentAction:
    action: str
    x: Optional[int] = None
    y: Optional[int] = None
    text: Optional[str] = None
    key: Optional[str] = None
    direction: Optional[str] = None
    amount: Optional[int] = None
    reason: str = ""


@dataclass(slots=True)
class AgentState:
    task: str
    steps: int = 0
    history: list[dict[str, Any]] = field(default_factory=list)
    done: bool = False
    last_screenshot: Optional[bytes] = None


def _strip_code_fences(raw: str) -> str:
    cleaned = raw.strip()
    if not cleaned.startswith("```"):
        return cleaned
    parts = cleaned.split("```")
    candidate = parts[1].strip() if len(parts) > 1 else cleaned
    if candidate.startswith("json"):
        candidate = candidate[4:].strip()
    return candidate


def parse_action_payload(raw: str) -> AgentAction:
    try:
        payload = json.loads(_strip_code_fences(raw))
    except json.JSONDecodeError as exc:
        return AgentAction(action="describe", reason=f"Could not parse model JSON: {exc}")
    return AgentAction(
        action=str(payload.get("action") or "describe"),
        x=payload.get("x"),
        y=payload.get("y"),
        text=payload.get("text"),
        key=payload.get("key"),
        direction=payload.get("direction"),
        amount=payload.get("amount"),
        reason=str(payload.get("reason") or ""),
    )


def build_prompt(task: str, step: int, history: list[dict[str, Any]], memory_context: str | None = None) -> str:
    blocks = [f"TASK: {task}", f"STEP: {step + 1}"]
    if history:
        recent = "\n".join(f"  Step {item['step']}: {item['action']} - {item['reason']}" for item in history[-3:])
        blocks.append(f"RECENT HISTORY:\n{recent}")
    if memory_context and not memory_context.startswith("Brak "):
        blocks.append(f"ALFA MEMORY CONTEXT:\n{memory_context}")
    blocks.append("Look at the screenshot and return one JSON action for the next step.")
    return "\n\n".join(blocks)


class OllamaVisionClient:
    def __init__(self, base_url: str, model: str, timeout_seconds: int = 60) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds

    def health(self) -> bool:
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                client.get(f"{self.base_url}/api/tags").raise_for_status()
            return True
        except httpx.HTTPError:
            return False

    def list_models(self) -> list[str]:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
        return [item.get("name", "") for item in response.json().get("models", [])]

    def next_action(self, prompt: str, screenshot_bytes: bytes) -> AgentAction:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": SYSTEM_PROMPT,
            "images": [base64.b64encode(screenshot_bytes).decode("utf-8")],
            "stream": False,
            "options": {"temperature": 0.1, "top_p": 0.9},
        }
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
            raw = str(response.json().get("response") or "").strip()
        return parse_action_payload(raw or '{"action": "describe", "reason": "Empty model response."}')

class DesktopVisionRuntime:
    def __init__(self, pause_seconds: float = 0.5) -> None:
        self.pause_seconds = pause_seconds
        self._pyautogui = None
        self._image_grab = None
        self._image_module = None

    def _require_runtime(self) -> tuple[Any, Any, Any]:
        if self._pyautogui is not None:
            return self._pyautogui, self._image_grab, self._image_module
        try:
            import pyautogui
            from PIL import Image, ImageGrab
        except ImportError as exc:
            raise RuntimeError(
                "Vision runtime dependencies are missing. Run scripts/setup-vision.ps1 or install the vision extra."
            ) from exc
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = self.pause_seconds
        self._pyautogui = pyautogui
        self._image_grab = ImageGrab
        self._image_module = Image
        return pyautogui, ImageGrab, Image

    def take_screenshot(self, scale: float = 0.5) -> bytes:
        _, image_grab, image_module = self._require_runtime()
        image = image_grab.grab()
        if scale != 1.0:
            width, height = image.size
            image = image.resize((int(width * scale), int(height * scale)), image_module.LANCZOS)
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=75)
        return buffer.getvalue()

    def execute_action(self, action: AgentAction) -> bool:
        pyautogui, _, _ = self._require_runtime()
        try:
            if action.action == "click":
                if action.x is None or action.y is None:
                    return False
                pyautogui.click(action.x, action.y)
            elif action.action == "type":
                if action.text:
                    pyautogui.write(action.text, interval=0.05)
            elif action.action == "key":
                if action.key:
                    pyautogui.hotkey(*action.key.split("+")) if "+" in action.key else pyautogui.press(action.key)
            elif action.action == "scroll":
                position = pyautogui.position()
                target_x = action.x if action.x is not None else position.x
                target_y = action.y if action.y is not None else position.y
                amount = int(action.amount or 3)
                pyautogui.scroll(amount if action.direction == "up" else -amount, x=target_x, y=target_y)
            elif action.action == "wait":
                time.sleep(max(0, int(action.amount or 2)))
                return True
            elif action.action in {"describe", "done"}:
                return True
            else:
                return False
        except Exception:
            return False
        time.sleep(self.pause_seconds)
        return True


def _resolve_vision_memory_root(settings: Settings) -> Path:
    raw = os.getenv("ALFA_VISION_MEMORY_ROOT")
    if not raw:
        return (settings.memory_root / "vision-agent").resolve()
    path = Path(raw)
    return path if path.is_absolute() else (settings.repo_root / path).resolve()


def _configure_logger(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("alfa.vision")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if logger.handlers:
        return logger
    formatter = logging.Formatter("%(asctime)s [ALFA-VISION] %(levelname)s %(message)s")
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    file_handler = logging.FileHandler(log_dir / "alfa_vision_agent.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
    return logger


class ALFAVisionAgent:
    def __init__(
        self,
        settings: Settings | None = None,
        memory: MemoryManager | None = None,
        runtime: DesktopVisionRuntime | None = None,
        vision_client: OllamaVisionClient | None = None,
        scale: float | None = None,
        max_steps: int | None = None,
        countdown_seconds: int | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        self.scale = scale if scale is not None else float(os.getenv("ALFA_VISION_SCREENSHOT_SCALE", "0.5"))
        self.max_steps = max_steps if max_steps is not None else int(os.getenv("ALFA_VISION_MAX_STEPS", "20"))
        self.countdown_seconds = countdown_seconds if countdown_seconds is not None else int(os.getenv("ALFA_VISION_COUNTDOWN_SECONDS", "3"))
        self.pause_seconds = float(os.getenv("ALFA_VISION_PAUSE_SECONDS", "0.5"))
        self.vision_model = os.getenv("ALFA_VISION_MODEL", "qwen2-vl")
        self.vision_timeout_seconds = int(os.getenv("ALFA_VISION_OLLAMA_TIMEOUT_SECONDS", str(self.settings.ollama_timeout_seconds)))
        self.memory = memory or MemoryManager(_resolve_vision_memory_root(self.settings))
        self.runtime = runtime or DesktopVisionRuntime(self.pause_seconds)
        self.client = vision_client or OllamaVisionClient(self.settings.ollama_base_url, self.vision_model, self.vision_timeout_seconds)
        self.log_dir = (self.settings.log_dir / "vision").resolve()
        self.logger = _configure_logger(self.log_dir)
        self.logger.info("ALFA Vision Agent initialized | model=%s | ollama=%s", self.vision_model, self.settings.ollama_base_url)

    def _check_ollama(self) -> tuple[bool, list[str]]:
        try:
            return True, self.client.list_models()
        except Exception as exc:  # noqa: BLE001
            self.logger.error("Ollama is unavailable: %s", exc)
            return False, []

    def _countdown(self) -> None:
        for remaining in range(self.countdown_seconds, 0, -1):
            print(f"Starting in {remaining}...")
            time.sleep(1)

    def _remember_step(self, task: str, step_number: int, action: AgentAction, executed: bool) -> None:
        details = {
            "task": task,
            "action": action.action,
            "reason": action.reason,
            "executed": executed,
            "x": action.x,
            "y": action.y,
            "key": action.key,
            "text": action.text,
        }
        self.memory.remember_today(
            title=f"Vision step {step_number}: {action.action}",
            content=json.dumps(details, ensure_ascii=False),
            kind="state" if executed else "warning",
            tags=["vision-agent", action.action],
        )

    def _write_summary_file(self, summary: dict[str, Any]) -> Path:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        path = self.log_dir / f"alfa_vision_task_{timestamp}.json"
        path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    def run(self, task: str) -> dict[str, Any]:
        if not task.strip():
            raise ValueError("Task cannot be empty.")
        online, models = self._check_ollama()
        if not online:
            raise RuntimeError("Ollama is not reachable. Start ollama serve before running the vision agent.")
        if not any(self.vision_model in model for model in models):
            self.logger.warning("Vision model %s is not available. Run: ollama pull %s", self.vision_model, self.vision_model)

        state = AgentState(task=task)
        task_record_id = self.memory.remember_today(
            title=f"Vision task: {task[:80]}",
            content=json.dumps({"task": task, "model": self.vision_model, "repo_root": str(self.settings.repo_root)}, ensure_ascii=False),
            kind="task",
            tags=["vision-agent", self.vision_model],
        )
        session_context = self.memory.build_context("current_state", max_records=6)

        print("=" * 60)
        print("ALFA VISION AGENT")
        print(f"Task: {task}")
        print("=" * 60)
        self._countdown()

        try:
            while not state.done and state.steps < self.max_steps:
                screenshot = self.runtime.take_screenshot(scale=self.scale)
                state.last_screenshot = screenshot
                prompt = build_prompt(task, state.steps, state.history, session_context)
                action = self.client.next_action(prompt, screenshot)
                executed = self.runtime.execute_action(action)

                step_number = state.steps + 1
                self.logger.info("Step %s | action=%s | reason=%s", step_number, action.action, action.reason)
                state.history.append(
                    {
                        "step": step_number,
                        "action": action.action,
                        "reason": action.reason,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "executed": executed,
                        "x": action.x,
                        "y": action.y,
                        "key": action.key,
                        "text": action.text,
                    }
                )
                self._remember_step(task, step_number, action, executed)
                state.steps = step_number

                if action.action == "done":
                    state.done = True
                    self.memory.close_task(task_record_id)

            if not state.done:
                self.memory.defer_task(task_record_id)
                self.memory.remember_today(
                    title=f"Vision task deferred: {task[:80]}",
                    content="The run ended before the model declared the task complete.",
                    kind="warning",
                    tags=["vision-agent", "deferred"],
                )
        except Exception as exc:  # noqa: BLE001
            self.memory.defer_task(task_record_id)
            self.memory.remember_today(
                title=f"Vision error: {task[:80]}",
                content=str(exc),
                kind="blocker",
                tags=["vision-agent", "error"],
            )
            raise

        summary = {
            "task": task,
            "steps_taken": state.steps,
            "done": state.done,
            "history": state.history,
            "model": self.vision_model,
            "memory_root": str(getattr(self.memory.store, "base", "")),
        }
        self.memory.remember_today(
            title=f"Vision summary: {task[:80]}",
            content=json.dumps({"task": task, "steps_taken": state.steps, "done": state.done}, ensure_ascii=False),
            kind="summary",
            tags=["vision-agent", "session-summary"],
        )
        log_path = self._write_summary_file(summary)
        summary["log_path"] = str(log_path)
        self.logger.info("Vision run finished | done=%s | steps=%s | log=%s", state.done, state.steps, log_path)
        return summary


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ALFA Vision Agent")
    parser.add_argument("task", nargs="*", help="Task for the vision agent")
    parser.add_argument("--max-steps", type=int, default=None, help="Override the maximum number of steps")
    parser.add_argument("--scale", type=float, default=None, help="Override screenshot scale")
    parser.add_argument("--countdown", type=int, default=None, help="Override countdown seconds before start")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    task = " ".join(args.task).strip()
    if not task:
        print("ALFA Vision Agent")
        task = input("Task: ").strip()
    if not task:
        print("No task provided.")
        return 0

    agent = ALFAVisionAgent(max_steps=args.max_steps, scale=args.scale, countdown_seconds=args.countdown)
    try:
        result = agent.run(task)
    except Exception as exc:  # noqa: BLE001
        print(f"Vision agent failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
