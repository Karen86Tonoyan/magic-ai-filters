from __future__ import annotations

from pathlib import Path

from .models import Mode, RequestContext

PROMPT_FILES = {
    Mode.ASK: "ask.md",
    Mode.EXPLAIN: "explain.md",
    Mode.FIND_BUG: "find_bug.md",
    Mode.NEXT_STEP: "next_step.md",
}


class PromptRegistry:
    def __init__(self, prompt_dir: Path) -> None:
        self.prompt_dir = prompt_dir

    def _read(self, name: str) -> str:
        path = self.prompt_dir / name
        if not path.exists():
            raise FileNotFoundError(f"Prompt file not found: {path}")
        return path.read_text(encoding="utf-8").strip()

    def build_messages(self, mode: Mode, request: RequestContext, retrieved_chunks: list[dict[str, object]]) -> list[dict[str, str]]:
        system_text = self._read("system.md")
        mode_text = self._read(PROMPT_FILES[mode])
        context_lines: list[str] = []
        for chunk in retrieved_chunks:
            context_lines.append(
                "\n".join(
                    [
                        f"Title: {chunk.get('title', 'unknown')}",
                        f"Path: {chunk.get('relative_path', 'unknown')}",
                        f"Doc type: {chunk.get('doc_type', 'unknown')}",
                        f"Chunk index: {chunk.get('chunk_index', 0)}",
                        f"Content:\n{chunk.get('content', '')}",
                    ]
                )
            )

        user_sections = [
            f"Mode: {mode.value}",
            f"Workspace: {request.workspace_path or 'unknown'}",
            f"File: {request.file_path or 'n/a'}",
            f"Language: {request.language or 'n/a'}",
        ]
        if request.question:
            user_sections.append(f"Question:\n{request.question}")
        if request.selection:
            user_sections.append(f"Selection:\n{request.selection}")
        if context_lines:
            user_sections.append("Retrieved context:\n\n" + "\n\n---\n\n".join(context_lines))
        else:
            user_sections.append("Retrieved context:\nNone")

        return [
            {"role": "system", "content": f"{system_text}\n\n{mode_text}"},
            {"role": "user", "content": "\n\n".join(user_sections)},
        ]
