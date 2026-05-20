from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agentscope.agent import ReActAgent
from agentscope.formatter import OpenAIChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import OpenAIChatModel
from agentscope.session import JSONSession


ROOT = Path(__file__).resolve().parents[2]
SESSION_DIR = ROOT / "exports" / "chatbot_sessions"
DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-5.4-nano"

app = FastAPI(title="AI Note ChatBot Service")
session_store = JSONSession(save_dir=str(SESSION_DIR))


class ChatRequest(BaseModel):
    config: dict[str, Any] | None = None
    message: str
    sessionId: str


def trim_string(value: Any) -> str:
    return str(value or "").strip()


def normalize_base_url(base_url: str) -> str:
    cleaned = trim_string(base_url)
    if not cleaned:
        return DEFAULT_BASE_URL
    return cleaned[:-1] if cleaned.endswith("/") else cleaned


def parse_temperature(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.2


def parse_max_tokens(value: Any) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 4096

    return parsed if parsed > 0 else 4096


def uses_max_completion_tokens(model_name: str) -> bool:
    normalized = trim_string(model_name).lower()
    return normalized.startswith("gpt-5") or normalized.startswith("o")


def build_generate_kwargs(config: dict[str, Any] | None, model_name: str) -> dict[str, Any]:
    config = config or {}
    max_tokens = parse_max_tokens(config.get("llmMaxTokens"))
    generate_kwargs: dict[str, Any] = {
        "temperature": parse_temperature(config.get("llmTemperature")),
    }

    if uses_max_completion_tokens(model_name):
        generate_kwargs["max_completion_tokens"] = max_tokens
    else:
        generate_kwargs["max_tokens"] = max_tokens

    return generate_kwargs


def humanize_chat_error(error: Exception) -> str:
    message = trim_string(getattr(error, "message", "") or str(error))

    if "Unsupported parameter: 'max_tokens'" in message:
        return (
            "当前模型不支持 max_tokens 参数。"
            "ChatBot 已切换为兼容模式；请重试一次，如果仍失败，再检查当前模型或 API 提供方是否支持 max_completion_tokens。"
        )

    if "Incorrect API key" in message or "invalid_api_key" in message:
        return "当前 LLM API Key 无效，请检查模型配置里的密钥。"

    if "authentication" in message.lower():
        return "当前模型服务认证失败，请检查 API Key、Base URL 和模型名称。"

    return message or "ChatBot 调用模型时发生未知错误。"


def build_model(config: dict[str, Any] | None) -> OpenAIChatModel:
    config = config or {}
    api_key = trim_string(config.get("llmApiKey") or os.getenv("OPENAI_API_KEY"))
    if not api_key:
        raise HTTPException(status_code=400, detail="当前未配置 LLM API Key。")

    model_name = trim_string(config.get("llmModel") or os.getenv("OPENAI_MODEL")) or DEFAULT_MODEL
    base_url = normalize_base_url(config.get("llmBaseUrl") or os.getenv("OPENAI_BASE_URL"))

    return OpenAIChatModel(
        model_name=model_name,
        api_key=api_key,
        client_kwargs={"base_url": base_url},
        generate_kwargs=build_generate_kwargs(config, model_name),
        stream=False,
    )


def build_agent(config: dict[str, Any] | None) -> ReActAgent:
    return ReActAgent(
        name="HomeBot",
        sys_prompt=(
            "You are HomeBot, the homepage assistant inside AI Note. "
            "Answer clearly and concisely. Reply in the user's language when possible. "
            "Do not claim to have completed actions you did not actually perform."
        ),
        model=build_model(config),
        formatter=OpenAIChatFormatter(),
        memory=InMemoryMemory(),
    )


def ensure_session_dir() -> None:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)


def session_file_path(session_id: str) -> Path:
    return SESSION_DIR / f"{trim_string(session_id)}.json"


def extract_text(reply: Any) -> str:
    if hasattr(reply, "get_text_content"):
        text = trim_string(reply.get_text_content())
        if text:
            return text

    content = getattr(reply, "content", "")
    if isinstance(content, str):
        return trim_string(content)

    if isinstance(content, list):
        texts = []
        for item in content:
            if isinstance(item, dict):
                text = trim_string(item.get("text"))
                if text:
                    texts.append(text)
        if texts:
            return "\n".join(texts)

    return trim_string(str(content))


@app.on_event("startup")
async def on_startup() -> None:
    ensure_session_dir()


@app.get("/health")
async def health() -> dict[str, Any]:
    ensure_session_dir()
    return {
        "framework": "AgentScope",
        "ok": True,
        "pythonVersion": os.sys.version.split()[0],
        "sessionDir": str(SESSION_DIR),
    }


@app.post("/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    session_id = trim_string(payload.sessionId)
    message = trim_string(payload.message)

    if not session_id:
        raise HTTPException(status_code=400, detail="缺少 ChatBot 会话 ID。")

    if not message:
        raise HTTPException(status_code=400, detail="消息内容不能为空。")

    ensure_session_dir()
    agent = build_agent(payload.config)

    try:
        await session_store.load_session_state(
            session_id=session_id,
            agent=agent,
        )

        reply = await agent(Msg("user", message, "user"))

        await session_store.save_session_state(
            session_id=session_id,
            agent=agent,
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=humanize_chat_error(error),
        ) from error

    config = payload.config or {}
    return {
        "model": trim_string(config.get("llmModel")) or DEFAULT_MODEL,
        "providerLabel": f"AgentScope · {trim_string(config.get('llmModel')) or DEFAULT_MODEL}",
        "reply": extract_text(reply),
        "sessionId": session_id,
    }


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict[str, Any]:
    target = session_file_path(session_id)
    if target.exists():
        target.unlink()

    return {
        "deleted": True,
        "sessionId": trim_string(session_id),
    }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=trim_string(os.getenv("AI_NOTE_CHATBOT_HOST")) or "127.0.0.1",
        port=int(trim_string(os.getenv("AI_NOTE_CHATBOT_PORT")) or "3212"),
    )
