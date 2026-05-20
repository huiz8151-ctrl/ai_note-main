# AI Note ChatBot Service

This directory contains the local Python sidecar used by the homepage ChatBot.

## Requirements

- Python 3.10 or higher
- The packages listed in `requirements.txt`

## Install

```bash
python -m pip install -r requirements.txt
```

## Optional environment variables

- `AI_NOTE_CHATBOT_PYTHON`: explicit Python executable path used by the Node/Electron side
- `AI_NOTE_CHATBOT_HOST`: service host, default `127.0.0.1`
- `AI_NOTE_CHATBOT_PORT`: service port, default `3212`

## Notes

- The homepage UI reuses the existing `llmBaseUrl`, `llmApiKey`, `llmModel`, `llmTemperature`, and `llmMaxTokens` settings from the main app.
- AgentScope session state is stored under `exports/chatbot_sessions/`.
