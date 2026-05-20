import argparse
import base64
import contextlib
import io
import json
import os
import sys
import tempfile

from local_whisper_runtime import build_segments, load_local_model


def parse_args():
    parser = argparse.ArgumentParser(description="Run local Whisper in worker mode.")
    parser.add_argument("--model", default="tiny")
    return parser.parse_args()


def configure_stdio():
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="backslashreplace")


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
    sys.stdout.flush()


def transcribe_audio(model, audio_path, language="", prompt=""):
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        result = model.transcribe(
            audio_path,
            task="transcribe",
            language=language or None,
            initial_prompt=prompt or None,
            condition_on_previous_text=False,
            fp16=False,
            verbose=False,
        )

    segments = build_segments(result.get("segments"))
    text = str(result.get("text", "")).strip()

    if not segments and text:
        segments = [{"id": 0, "start": 0.0, "end": 0.0, "text": text}]

    return {
        "language": str(result.get("language") or language or "auto"),
        "segments": segments,
        "text": text,
    }


def handle_request(model, resolved, payload):
    request_id = payload.get("id")
    mime_type = str(payload.get("mimeType") or "audio/webm")
    language = str(payload.get("language") or "").strip()
    prompt = str(payload.get("prompt") or "").strip()
    suffix = ".wav" if "wav" in mime_type else ".m4a" if "mp4" in mime_type else ".webm"
    audio_base64 = payload.get("audioBase64")

    if not request_id:
        return

    if not audio_base64:
        emit({"error": "Missing audio payload.", "id": request_id, "ok": False})
        return

    temp_path = None
    try:
        audio_bytes = base64.b64decode(audio_base64)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        result = transcribe_audio(model, temp_path, language=language, prompt=prompt)
        emit(
            {
                "id": request_id,
                "language": result["language"],
                "ok": True,
                "resolvedModel": resolved["resolved_model"],
                "segments": result["segments"],
                "text": result["text"],
            }
        )
    except Exception as exc:
        emit({"error": str(exc), "id": request_id, "ok": False})
    finally:
        if temp_path:
            with contextlib.suppress(OSError):
                os.unlink(temp_path)


def main():
    configure_stdio()
    args = parse_args()

    try:
        resolved, model = load_local_model(args.model)
    except Exception as exc:
        emit({"error": str(exc), "ok": False, "type": "fatal"})
        return 1

    emit(
        {
            "model": f'local-whisper:{resolved["resolved_model"]}',
            "ok": True,
            "requestedModel": resolved["requested_model"],
            "resolvedModel": resolved["resolved_model"],
            "sourceLabel": f'Built-in Whisper · {resolved["resolved_model"]}',
            "type": "ready",
            "usedFallback": resolved["used_fallback"],
        }
    )

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            emit({"error": "Invalid JSON request.", "ok": False})
            continue

        if payload.get("type") == "shutdown":
            break

        if payload.get("type") != "transcribe":
            emit({"error": "Unsupported request type.", "id": payload.get("id"), "ok": False})
            continue

        handle_request(model, resolved, payload)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
