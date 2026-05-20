import argparse
import contextlib
import io
import json

from local_whisper_runtime import build_segments, load_local_model


def parse_args():
    parser = argparse.ArgumentParser(description="Run local Whisper transcription.")
    parser.add_argument("--audio-path", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--language", default="")
    parser.add_argument("--prompt", default="")
    parser.add_argument("--word-timestamps", action="store_true")
    return parser.parse_args()

def main():
    args = parse_args()
    resolved, model = load_local_model(args.model)

    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        result = model.transcribe(
            args.audio_path,
            task="transcribe",
            language=args.language or None,
            initial_prompt=args.prompt or None,
            word_timestamps=bool(args.word_timestamps),
            condition_on_previous_text=False,
            fp16=False,
            verbose=False,
        )

    segments = build_segments(result.get("segments"))
    text = str(result.get("text", "")).strip()

    if not segments and text:
        segments = [{"id": 0, "start": 0.0, "end": 0.0, "text": text}]

    payload = {
        "text": text,
        "language": str(result.get("language") or args.language or "auto"),
        "requestedModel": resolved["requested_model"],
        "resolvedModel": resolved["resolved_model"],
        "usedFallback": resolved["used_fallback"],
        "modelPath": str(resolved["model_path"]),
        "segments": segments,
    }
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
