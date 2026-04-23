from __future__ import annotations

import json
import wave
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional

from packages.core.settings import Settings, load_settings

REQUIRED_MODEL_FILES = (
    Path("am") / "final.mdl",
    Path("conf") / "model.conf",
    Path("graph") / "Gr.fst",
)


class VoskRuntimeError(RuntimeError):
    pass


class VoskModelError(RuntimeError):
    pass


class UnsupportedAudioError(RuntimeError):
    pass


@dataclass(slots=True)
class TranscriptionResult:
    text: str
    confidence: Optional[float]
    duration_seconds: float
    sample_rate: int
    provider: str
    model_path: str
    audio_path: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class VoskTranscriber:
    def __init__(
        self,
        settings: Settings | None = None,
        model_path: str | Path | None = None,
        cache_dir: str | Path | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        self.model_source = Path(model_path) if model_path else self.settings.vosk_model_path
        self.cache_dir = Path(cache_dir) if cache_dir else self.settings.vosk_cache_dir
        self._model = None
        self._resolved_model_dir: Path | None = None

    def is_runtime_available(self) -> bool:
        try:
            self._load_runtime()
            return True
        except VoskRuntimeError:
            return False

    def inspect(self) -> dict[str, Any]:
        source = self.model_source
        report: dict[str, Any] = {
            "provider": "vosk",
            "configured": source is not None,
            "source": str(source) if source else None,
            "source_exists": bool(source and source.exists()),
            "runtime_available": self.is_runtime_available(),
            "cache_dir": str(self.cache_dir),
            "model_ready": False,
            "source_kind": None,
        }
        if not source or not source.exists():
            return report

        if source.is_dir():
            report["source_kind"] = "directory"
            report["model_ready"] = self._is_valid_model_dir(source)
            return report

        if source.is_file() and source.suffix.lower() == ".zip":
            report["source_kind"] = "archive"
            report["model_ready"] = self._zip_has_required_entries(source)
            return report

        report["source_kind"] = "unsupported"
        return report

    def resolve_model_dir(self) -> Path:
        if self._resolved_model_dir is not None:
            return self._resolved_model_dir
        if self.model_source is None:
            raise VoskModelError(
                "No Vosk model path configured. Set ALFA_CORE_VOSK_MODEL_PATH or pass --model-path."
            )
        source = self.model_source
        if not source.exists():
            raise VoskModelError(f"Configured Vosk model path does not exist: {source}")

        if source.is_dir():
            if not self._is_valid_model_dir(source):
                raise VoskModelError(f"Directory does not look like a valid Vosk model: {source}")
            self._resolved_model_dir = source
            return source

        if source.is_file() and source.suffix.lower() == ".zip":
            if not self._zip_has_required_entries(source):
                raise VoskModelError(f"Archive does not contain a valid Vosk model layout: {source}")
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            target_dir = self.cache_dir / source.stem
            if not self._is_valid_model_dir(target_dir):
                with zipfile.ZipFile(source) as archive:
                    archive.extractall(self.cache_dir)
            if not self._is_valid_model_dir(target_dir):
                raise VoskModelError(f"Extracted archive but model directory is still invalid: {target_dir}")
            self._resolved_model_dir = target_dir
            return target_dir

        raise VoskModelError(f"Unsupported Vosk model source: {source}")

    def transcribe_wav(self, audio_path: str | Path) -> TranscriptionResult:
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Audio file does not exist: {audio_file}")

        model_dir = self.resolve_model_dir()
        model = self._get_model()
        _, KaldiRecognizer, SetLogLevel = self._load_runtime()
        SetLogLevel(-1)

        with wave.open(str(audio_file), "rb") as handle:
            self._validate_wave_file(handle, audio_file)
            sample_rate = handle.getframerate()
            duration_seconds = handle.getnframes() / float(sample_rate)
            recognizer = KaldiRecognizer(model, sample_rate)
            if hasattr(recognizer, "SetWords"):
                recognizer.SetWords(True)

            parts: list[str] = []
            confidences: list[float] = []
            while True:
                data = handle.readframes(4000)
                if not data:
                    break
                if recognizer.AcceptWaveform(data):
                    text, conf = self._parse_result_payload(recognizer.Result())
                    if text:
                        parts.append(text)
                    confidences.extend(conf)

            final_text, final_confidences = self._parse_result_payload(recognizer.FinalResult())
            if final_text:
                parts.append(final_text)
            confidences.extend(final_confidences)

        return TranscriptionResult(
            text=" ".join(part for part in parts if part).strip(),
            confidence=(sum(confidences) / len(confidences)) if confidences else None,
            duration_seconds=round(duration_seconds, 3),
            sample_rate=sample_rate,
            provider="vosk",
            model_path=str(model_dir),
            audio_path=str(audio_file),
        )
    def _get_model(self):
        if self._model is not None:
            return self._model
        Model, _, _ = self._load_runtime()
        self._model = Model(str(self.resolve_model_dir()))
        return self._model

    def _load_runtime(self):
        try:
            from vosk import KaldiRecognizer, Model, SetLogLevel
        except ImportError as exc:
            raise VoskRuntimeError(
                "Vosk runtime is not installed. Install the 'speech' extra or run scripts/setup-vosk.ps1."
            ) from exc
        return Model, KaldiRecognizer, SetLogLevel

    def _validate_wave_file(self, handle: wave.Wave_read, audio_path: Path) -> None:
        if handle.getcomptype() != "NONE":
            raise UnsupportedAudioError(f"Compressed WAV is not supported: {audio_path}")
        if handle.getnchannels() != 1:
            raise UnsupportedAudioError(
                f"Vosk in this integration expects mono WAV input, got {handle.getnchannels()} channels: {audio_path}"
            )
        if handle.getsampwidth() != 2:
            raise UnsupportedAudioError(
                f"Vosk in this integration expects 16-bit PCM WAV input, got sample width {handle.getsampwidth()}: {audio_path}"
            )

    def _is_valid_model_dir(self, model_dir: Path) -> bool:
        return all((model_dir / relative).exists() for relative in REQUIRED_MODEL_FILES)

    def _zip_has_required_entries(self, archive_path: Path) -> bool:
        with zipfile.ZipFile(archive_path) as archive:
            names = {Path(entry.filename) for entry in archive.infolist() if not entry.is_dir()}
        if not names:
            return False
        roots = {path.parts[0] for path in names if path.parts}
        for root in roots:
            if all(Path(root) / relative in names for relative in REQUIRED_MODEL_FILES):
                return True
        return False

    def _parse_result_payload(self, payload: str) -> tuple[str, list[float]]:
        if not payload.strip():
            return "", []
        data = json.loads(payload)
        text = str(data.get("text") or "").strip()
        confidences: list[float] = []
        for item in data.get("result") or []:
            conf = item.get("conf")
            if conf is not None:
                confidences.append(float(conf))
        if not text:
            alternatives = data.get("alternatives") or []
            if alternatives:
                best = alternatives[0]
                text = str(best.get("text") or "").strip()
                conf = best.get("confidence")
                if conf is not None:
                    confidences.append(float(conf))
        return text, confidences