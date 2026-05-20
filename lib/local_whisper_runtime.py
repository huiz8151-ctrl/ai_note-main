import contextlib
import io
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VENDOR_DIR = ROOT / ".vendor" / "python"

if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))

import whisper  # noqa: E402


CACHE_DIR = Path.home() / ".cache" / "whisper"
MODEL_FILE_CANDIDATES = {
    "tiny": ["tiny.pt", "tiny.en.pt"],
    "base": ["base.pt", "base.en.pt"],
    "small": ["small.pt", "small.en.pt"],
    "medium": ["medium.pt", "medium.en.pt"],
    "large": ["large-v3.pt", "large-v2.pt", "large.pt"],
    "large-v2": ["large-v2.pt"],
    "large-v3": ["large-v3.pt"],
    "turbo": ["large-v3-turbo.pt", "turbo.pt"],
}


def ordered_model_names(requested_model):
    preferred = [
        requested_model,
        "base",
        "tiny",
        "turbo",
        "small",
        "medium",
        "large-v3",
        "large-v2",
        "large",
    ]

    ordered = []
    for name in preferred:
        normalized = str(name or "").strip()
        if normalized and normalized not in ordered:
            ordered.append(normalized)
    return ordered


def model_path_candidates(model_name):
    requested_path = Path(model_name)
    if requested_path.exists():
        return [requested_path]

    names = MODEL_FILE_CANDIDATES.get(model_name, [f"{model_name}.pt"])
    return [CACHE_DIR / name for name in names]


def resolve_local_model(requested_model):
    available = []
    if CACHE_DIR.exists():
        available = sorted(item.name for item in CACHE_DIR.glob("*.pt"))

    candidates = []
    for model_name in ordered_model_names(requested_model):
        for candidate in model_path_candidates(model_name):
            if candidate.exists():
                candidates.append(
                    {
                        "requested_model": requested_model,
                        "resolved_model": model_name,
                        "model_path": candidate,
                        "used_fallback": model_name != requested_model,
                        "available_models": available,
                    }
                )

    if candidates:
        return candidates

    raise RuntimeError(
        "No local Whisper model is available. "
        f"Requested '{requested_model}'. "
        f"Cached models: {', '.join(available) if available else 'none'}."
    )


def load_local_model(requested_model):
    candidates = resolve_local_model(requested_model)
    errors = []

    for candidate in candidates:
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                model = whisper.load_model(str(candidate["model_path"]), device="cpu")
            return candidate, model
        except Exception as exc:
            errors.append(f'{candidate["resolved_model"]}: {exc}')

    raise RuntimeError(
        "Unable to load any local Whisper model. "
        + " | ".join(errors[:4])
    )


def build_segments(raw_segments):
    segments = []
    for index, item in enumerate(raw_segments or []):
        text = str(item.get("text", "")).strip()
        if not text:
            continue

        segments.append(
            {
                "id": item.get("id", index),
                "start": float(item.get("start", 0.0) or 0.0),
                "end": float(item.get("end", item.get("start", 0.0)) or 0.0),
                "text": text,
            }
        )
    return segments
