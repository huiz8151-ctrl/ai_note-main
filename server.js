const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");
const { loadLocalEnv } = require("./lib/load-local-env");

loadLocalEnv({ root: __dirname });

const {
  generateSummary,
  testModelConnection,
  transcribeChunk
} = require("./lib/ai-service");
const {
  deleteChatbotSession,
  getChatbotHealth,
  sendChatbotMessage
} = require("./lib/chatbot-service-manager");
const { createLiveTranscriptionManager } = require("./lib/live-transcription-manager");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 3210);
const ROOT = __dirname;
const FFMPEG_DIR = ffmpegPath ? path.dirname(ffmpegPath) : "";
const LOCAL_PYTHON_VENDOR = path.join(ROOT, ".vendor", "python");
const LOCAL_WHISPER_SCRIPT = path.join(ROOT, "lib", "local-whisper-transcribe.py");
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_TRANSCRIBE_MODEL = "openai/whisper-large-v3";
const OPENROUTER_TRANSCRIBE_MODEL_ALIASES = new Set([
  "large-v3",
  "whisper-large-v3",
  "openai/whisper-large-v3"
]);
const PYTHON_BIN = resolvePythonBinary();
const liveTranscriptionManager = createLiveTranscriptionManager({
  defaultModel: "large-v3",
  root: ROOT
});

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function trimString(value) {
  return String(value || "").trim();
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sendJson(response, statusCode, payload) {
  if (response.destroyed || response.writableEnded) {
    return;
  }

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function createServerAbortError() {
  const error = new Error("请求已取消。");
  error.name = "AbortError";
  return error;
}

function isServerAbortError(error) {
  return error?.name === "AbortError";
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createServerAbortError();
  }
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function handleTranscribe(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  const { audioBase64, config, mimeType, prompt } = body;
  if (!audioBase64 || !config) {
    sendJson(response, 400, { error: "缺少转写所需参数。" });
    return;
  }

  try {
    const result = await transcribeChunk({
      buffer: Buffer.from(audioBase64, "base64"),
      config,
      mimeType,
      prompt
    });

    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "转写请求失败。"
    });
  }
}

async function handleSummarize(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  try {
    const result = await generateSummary(body);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "纪要整理失败。"
    });
  }
}

async function handleTestConnection(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  try {
    const result = await testModelConnection(body);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "连接测试失败。"
    });
  }
}

async function handleLiveTranscriptionStart(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  try {
    const result = await liveTranscriptionManager.startSession({
      language: String(body.language || "").trim(),
      model: String(body.model || "").trim(),
      prompt: String(body.prompt || "").trim()
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "实时转写会话启动失败。"
    });
  }
}

async function handleLiveTranscriptionChunk(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  const { audioBase64, mimeType, recentTranscriptTail, seq, sessionId } = body;
  if (!sessionId || !audioBase64) {
    sendJson(response, 400, { error: "缺少实时转写所需参数。" });
    return;
  }

  try {
    const result = await liveTranscriptionManager.transcribeChunk({
      audioBase64,
      mimeType,
      recentTranscriptTail,
      seq,
      sessionId
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "实时转写失败。"
    });
  }
}

async function handleLiveTranscriptionStop(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  try {
    const result = await liveTranscriptionManager.stopSession(body.sessionId);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "实时转写会话关闭失败。"
    });
  }
}

async function handleChatbotHealth(_request, response) {
  try {
    const result = await getChatbotHealth();
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "ChatBot service is unavailable."
    });
  }
}

async function handleChatbotMessage(request, response) {
  const body = parseJson(await readRequestBody(request));

  if (!body) {
    sendJson(response, 400, { error: "Request body must be valid JSON." });
    return;
  }

  try {
    const result = await sendChatbotMessage({
      config: body.config || {},
      message: body.message,
      sessionId: body.sessionId
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "ChatBot request failed."
    });
  }
}

async function handleChatbotDeleteSession(sessionId, response) {
  if (!trimString(sessionId)) {
    sendJson(response, 400, { error: "Missing ChatBot session ID." });
    return;
  }

  try {
    const result = await deleteChatbotSession(sessionId);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to delete ChatBot session."
    });
  }
}

function sanitizeBaseName(name) {
  return String(name || "video")
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "video";
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").endsWith("/") ? String(baseUrl).slice(0, -1) : String(baseUrl || "");
}

function isOpenRouterBaseUrl(baseUrl) {
  return /(^|\/\/)openrouter\.ai(\/|$)/i.test(trimString(baseUrl));
}

function normalizeOpenRouterTranscribeModel(modelName, fallbackModel = DEFAULT_OPENROUTER_TRANSCRIBE_MODEL) {
  const normalized = trimString(modelName);
  return !normalized || OPENROUTER_TRANSCRIBE_MODEL_ALIASES.has(normalized.toLowerCase())
    ? fallbackModel
    : normalized;
}

function shouldPreferOpenRouterModel(modelName) {
  return OPENROUTER_TRANSCRIBE_MODEL_ALIASES.has(trimString(modelName).toLowerCase());
}

function resolveOpenRouterTranscribeConfig({ apiKey, baseUrl, model }) {
  const envFallbackModel =
    trimString(process.env.OPENROUTER_TRANSCRIBE_MODEL || process.env.OPENROUTER_MODEL) ||
    DEFAULT_OPENROUTER_TRANSCRIBE_MODEL;

  return {
    apiKey: trimString(apiKey || process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY),
    baseUrl: normalizeBaseUrl(baseUrl || process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_BASE_URL),
    httpReferer: trimString(process.env.OPENROUTER_HTTP_REFERER || process.env.OPENROUTER_REFERER),
    model: normalizeOpenRouterTranscribeModel(model, envFallbackModel),
    title: trimString(process.env.OPENROUTER_APP_TITLE || process.env.OPENROUTER_TITLE)
  };
}

function canUseOpenRouterTranscribeConfig(config) {
  return Boolean(config?.apiKey && config?.baseUrl && config?.model);
}

function buildOpenRouterTranscribeHeaders(config) {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json"
  };

  if (config.httpReferer) {
    headers["HTTP-Referer"] = config.httpReferer;
  }

  if (config.title) {
    headers["X-Title"] = config.title;
  }

  return headers;
}

function buildOpenRouterSourceLabel(modelName) {
  return `OpenRouter · ${trimString(modelName) || DEFAULT_OPENROUTER_TRANSCRIBE_MODEL}`;
}

function extendPythonPath(pythonPath) {
  return [LOCAL_PYTHON_VENDOR, pythonPath].filter(Boolean).join(path.delimiter);
}

function extendExecutablePath(executablePath) {
  return [FFMPEG_DIR, executablePath].filter(Boolean).join(path.delimiter);
}

function resolvePythonBinary() {
  const explicit = [process.env.PYTHON, process.env.PYTHON_EXE].find(Boolean);
  if (explicit) {
    return explicit;
  }

  try {
    if (process.platform === "win32") {
      const result = execFileSync("where.exe", ["python"], {
        encoding: "utf8",
        windowsHide: true
      });
      const resolved = result
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (resolved) {
        return resolved;
      }
    } else {
      const result = execFileSync("which", ["python3"], {
        encoding: "utf8"
      }).trim();
      if (result) {
        return result;
      }
    }
  } catch {
    // Fall through to the default executable name.
  }

  return process.platform === "win32" ? "python" : "python3";
}

function sanitizeModelCacheName(name) {
  return (
    String(name || "whisper")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "whisper"
  );
}

function buildLocalWhisperPrompt(knowledgeConfig) {
  const hotwords = Array.isArray(knowledgeConfig?.hotwords)
    ? knowledgeConfig.hotwords.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!hotwords.length) {
    return "";
  }

  return `关键术语：${hotwords.join("，")}`;
}

function buildSegmentsFromPlainText(text) {
  const normalized = trimString(text).replace(/\r/g, "");
  if (!normalized) {
    return [];
  }

  const chunks =
    normalized.match(/[^。！？.!?\n]+[。！？.!?]?/g)?.map((item) => trimString(item)).filter(Boolean) || [];

  if (!chunks.length) {
    return [];
  }

  let cursor = 0;
  return chunks.map((chunk) => {
    const start = cursor;
    const duration = Math.max(2, Math.min(12, chunk.length / 10));
    cursor += duration;
    return {
      start,
      end: cursor,
      text: chunk
    };
  });
}

function normalizeKnowledgeSegmentsFromResponse(data) {
  const explicitSegments = Array.isArray(data?.segments)
    ? data.segments
        .map((segment) => ({
          start: Number(segment.start) || 0,
          end: Number(segment.end) || Number(segment.start) || 0,
          text: trimString(segment.text)
        }))
        .filter((segment) => segment.text)
    : [];

  if (explicitSegments.length) {
    return explicitSegments;
  }

  const transcriptSource = trimString(data?.transcript || data?.text);
  if (!transcriptSource) {
    return [];
  }

  const parsedTranscript =
    transcriptSource.includes("\n") || /^\[[0-9]{1,2}:[0-9]{2}/.test(transcriptSource)
      ? buildSegmentsFromTranscript(transcriptSource)
      : [];

  if (parsedTranscript.length) {
    return parsedTranscript;
  }

  return buildSegmentsFromPlainText(transcriptSource);
}

function resolveKnowledgeOpenRouterConfig({ config, knowledgeConfig }) {
  const configuredBaseUrl = normalizeBaseUrl(config?.asrBaseUrl || config?.baseUrl);
  const configuredModel = trimString(config?.asrModel || config?.transcriptionModel);
  const knowledgeModel = trimString(knowledgeConfig?.model);
  const useExplicitOpenRouter = isOpenRouterBaseUrl(configuredBaseUrl) && Boolean(configuredModel || knowledgeModel);
  const useOpenRouterDefault = shouldPreferOpenRouterModel(knowledgeModel);

  if (!useExplicitOpenRouter && !useOpenRouterDefault) {
    return null;
  }

  const openRouterConfig = resolveOpenRouterTranscribeConfig({
    apiKey: useExplicitOpenRouter ? config?.asrApiKey || config?.apiKey : "",
    baseUrl: useExplicitOpenRouter ? configuredBaseUrl : "",
    model: useExplicitOpenRouter ? configuredModel || knowledgeModel : knowledgeModel
  });

  return canUseOpenRouterTranscribeConfig(openRouterConfig) ? openRouterConfig : null;
}

function hasStandardAsrFallbackConfig(config) {
  const configuredBaseUrl = normalizeBaseUrl(config?.asrBaseUrl || config?.baseUrl);
  const configuredModel = trimString(config?.asrModel || config?.transcriptionModel);
  return Boolean(configuredBaseUrl && configuredModel && !isOpenRouterBaseUrl(configuredBaseUrl));
}

function buildKnowledgeTranscriptionError({ localError, asrError, asrBaseUrl }) {
  const localMessage = localError instanceof Error ? localError.message : String(localError || "");
  const asrMessage = asrError
    ? humanizeAsrError(asrError, asrBaseUrl || "")
    : "";

  if (localMessage && asrMessage) {
    return new Error(`内置 Whisper 失败：${localMessage}\n外部 ASR 失败：${asrMessage}`);
  }

  if (localMessage) {
    return new Error(`内置 Whisper 失败：${localMessage}`);
  }

  if (asrMessage) {
    return new Error(asrMessage);
  }

  return new Error("知识转录失败。");
}

function formatTimestamp(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildTranscriptFromSegments(segments) {
  return (segments || [])
    .map((seg) => {
      const time = formatTimestamp(seg.start);
      const text = String(seg.text || "").trim();
      return text ? `[${time}] 发言人 1: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function compactVideoName(name) {
  return String(name || "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseTimestamp(value) {
  const parts = String(value || "")
    .split(":")
    .map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return Number(parts[0]) || 0;
}

function buildSegmentsFromTranscript(transcript) {
  const parsed = String(transcript || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[([^\]]+)\]\s*(?:(.+?):\s*)?(.*)$/);
      if (!match) {
        return {
          start: 0,
          end: 0,
          text: line
        };
      }

      const start = parseTimestamp(match[1]);
      return {
        start,
        end: start,
        text: String(match[3] || "").trim()
      };
    })
    .filter((segment) => segment.text);

  return parsed.map((segment, index) => {
    const nextStart = parsed[index + 1]?.start;
    const fallbackDuration = Math.max(1.5, segment.text.length / 16);
    return {
      ...segment,
      end: nextStart && nextStart > segment.start ? nextStart : segment.start + fallbackDuration
    };
  });
}

async function readCachedKnowledgeTranscription({ outputDir, videoName }) {
  const targetKey = compactVideoName(videoName);
  if (!targetKey) {
    return null;
  }

  let files = [];
  try {
    files = await fs.readdir(outputDir);
  } catch {
    return null;
  }

  const jsonFiles = files
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => b.localeCompare(a));

  for (const file of jsonFiles) {
    const filePath = path.join(outputDir, file);
    try {
      const data = JSON.parse(await fs.readFile(filePath, "utf8"));
      const candidateKey = compactVideoName(`${data.video || ""} ${file}`);
      if (!candidateKey.includes(targetKey) && !targetKey.includes(compactVideoName(file))) {
        continue;
      }

      const segments = Array.isArray(data.segments)
        ? data.segments
            .map((segment) => ({
              start: Number(segment.start) || 0,
              end: Number(segment.end) || Number(segment.start) || 0,
              text: String(segment.text || "").trim()
            }))
            .filter((segment) => segment.text)
        : buildSegmentsFromTranscript(data.transcript || data.text || "");

      if (!segments.length) {
        continue;
      }

      return {
        detectedLanguage: String(data.language || "en"),
        model: `local-cache:${data.model || "whisper"}`,
        segments
      };
    } catch {
      // Try the next cached transcription file.
    }
  }

  const transcriptFiles = files
    .filter((file) => file.endsWith(".transcript.txt") || file.endsWith(".txt"))
    .sort((a, b) => b.localeCompare(a));

  for (const file of transcriptFiles) {
    if (!compactVideoName(file).includes(targetKey) && !targetKey.includes(compactVideoName(file))) {
      continue;
    }

    try {
      const transcript = await fs.readFile(path.join(outputDir, file), "utf8");
      const segments = buildSegmentsFromTranscript(transcript);
      if (!segments.length) {
        continue;
      }

      return {
        detectedLanguage: "auto",
        model: "local-cache:transcript",
        segments
      };
    } catch {
      // Try the next cached transcript file.
    }
  }

  return null;
}

function humanizeAsrError(error, baseUrl) {
  const message = error instanceof Error ? error.message : String(error || "");
  const causeCode = error?.cause?.code ? ` / ${error.cause.code}` : "";

  if (/fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(`${message}${causeCode}`)) {
    return `无法连接 ASR 转写服务（${message}${causeCode}）。请检查网络/代理，或确认 ASR Base URL 是否可访问：${baseUrl}`;
  }

  return message || "ASR 转录失败。";
}

async function transcribeAudioLocallyWithWhisper({ audioPath, knowledgeConfig, signal }) {
  const requestedModel = String(knowledgeConfig?.model || "base").trim() || "base";
  const language = String(knowledgeConfig?.language || "").trim();
  const prompt = buildLocalWhisperPrompt(knowledgeConfig);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createServerAbortError());
      return;
    }

    const args = [LOCAL_WHISPER_SCRIPT, "--audio-path", audioPath, "--model", requestedModel];

    if (language) {
      args.push("--language", language);
    }

    if (prompt) {
      args.push("--prompt", prompt);
    }

    if (knowledgeConfig?.wordTimestamps) {
      args.push("--word-timestamps");
    }

    const child = spawn(PYTHON_BIN, args, {
      cwd: ROOT,
      env: {
        ...process.env,
        PATH: extendExecutablePath(process.env.PATH),
        PYTHONPATH: extendPythonPath(process.env.PYTHONPATH)
      },
      windowsHide: true
    });

    let settled = false;
    let stdout = "";
    let stderr = "";

    const settle = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      signal?.removeEventListener("abort", abortChild);
      callback(value);
    };

    const abortChild = () => {
      child.kill("SIGTERM");
      settle(reject, createServerAbortError());
    };

    signal?.addEventListener("abort", abortChild, { once: true });

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      settle(reject, error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      if (code !== 0) {
        settle(
          reject,
          new Error(stderr.trim() || stdout.trim() || `Local Whisper exited with code ${code}.`)
        );
        return;
      }

      const outputLine = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reverse()
        .find((line) => line.startsWith("{") && line.endsWith("}"));

      if (!outputLine) {
        settle(reject, new Error("Local Whisper returned an empty response."));
        return;
      }

      let payload = null;
      try {
        payload = JSON.parse(outputLine);
      } catch (error) {
        settle(reject, new Error(`Unable to parse local Whisper response: ${error.message}`));
        return;
      }

      const segments = Array.isArray(payload?.segments)
        ? payload.segments
            .map((segment, index) => ({
              id: Number(segment.id) || index,
              start: Number(segment.start) || 0,
              end: Number(segment.end) || Number(segment.start) || 0,
              text: String(segment.text || "").trim()
            }))
            .filter((segment) => segment.text)
        : [];

      settle(resolve, {
        detectedLanguage: String(payload?.language || language || "auto"),
        model: `local-whisper:${String(payload?.resolvedModel || requestedModel)}`,
        cacheModel: String(payload?.resolvedModel || requestedModel),
        cacheSource: "whisper",
        sourceLabel: `内置 Whisper · ${String(payload?.resolvedModel || requestedModel)}`,
        segments
      });
    });
  });
}

async function writeKnowledgeTranscriptionCache({ outputDir, baseName, videoName, transcription }) {
  const modelName = sanitizeModelCacheName(transcription.cacheModel || transcription.model || "whisper");
  const sourceName = sanitizeModelCacheName(transcription.cacheSource || "cache");
  const cachePath = path.join(outputDir, `${baseName}.${sourceName}-${modelName}.json`);
  const payload = {
    video: videoName,
    model: transcription.cacheModel || transcription.model || "whisper",
    language: transcription.detectedLanguage || "auto",
    text: (transcription.segments || [])
      .map((segment) => String(segment.text || "").trim())
      .filter(Boolean)
      .join(" "),
    segments: (transcription.segments || []).map((segment, index) => ({
      id: Number(segment.id) || index,
      start: Number(segment.start) || 0,
      end: Number(segment.end) || Number(segment.start) || 0,
      text: String(segment.text || "").trim()
    }))
  };

  await fs.writeFile(cachePath, JSON.stringify(payload, null, 2), "utf8");
  return cachePath;
}

function buildMarkdownFromSegments({ videoName, model, language, segments, appendTimeline }) {
  const title = sanitizeBaseName(videoName).replaceAll("-", " ");
  const lines = [
    `# ${title}`,
    "",
    `> 📅 生成时间: ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `> 🌐 检测语言: ${language || "auto"}`,
    `> 🤖 转录模型: ${model}`,
    "",
    "---",
    "",
    "## 转录内容",
    ""
  ];

  (segments || []).forEach((seg) => {
    const start = formatTimestamp(seg.start);
    const end = formatTimestamp(seg.end);
    const text = String(seg.text || "").trim();
    if (!text) {
      return;
    }
    lines.push(`**[${start} → ${end}]**`);
    lines.push(text);
    lines.push("");
  });

  if (appendTimeline) {
    lines.push("---");
    lines.push("");
    lines.push("## 附录：完整时间轴");
    lines.push("");
    lines.push("| 时间 | 内容 |");
    lines.push("|------|------|");

    (segments || []).forEach((seg) => {
      const start = formatTimestamp(seg.start);
      const text = String(seg.text || "").trim().replaceAll("|", "\\|");
      if (!text) {
        return;
      }
      lines.push(`| ${start} | ${text.length > 120 ? `${text.slice(0, 117)}...` : text} |`);
    });

    lines.push("");
  }

  return lines.join("\n");
}

function runFfmpegExtract(inputVideoPath, outputAudioPath, options = {}) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("未检测到 ffmpeg-static，可在项目根目录执行 npm install。"));
      return;
    }

    if (options.signal?.aborted) {
      reject(createServerAbortError());
      return;
    }

    const args = [
      "-i",
      inputVideoPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-y",
      outputAudioPath
    ];

    const child = spawn(ffmpegPath, args, {
      cwd: ROOT,
      windowsHide: true
    });

    let settled = false;
    let stderr = "";

    const settle = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      options.signal?.removeEventListener("abort", abortChild);
      callback(value);
    };

    const abortChild = () => {
      child.kill("SIGTERM");
      settle(reject, createServerAbortError());
    };

    options.signal?.addEventListener("abort", abortChild, { once: true });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      settle(reject, error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      if (code !== 0) {
        settle(reject, new Error(stderr.trim() || "ffmpeg 音频提取失败。"));
        return;
      }

      settle(resolve);
    });
  });
}

async function transcribeAudioWithStandardAsr({ audioBuffer, config, knowledgeConfig, signal }) {
  const configuredBaseUrl = normalizeBaseUrl(config?.asrBaseUrl || config?.baseUrl);
  const baseUrl =
    configuredBaseUrl === "https://api.openai.com"
      ? "https://api.openai.com/v1"
      : configuredBaseUrl;
  const model = trimString(config?.asrModel || config?.transcriptionModel);
  const language = trimString(knowledgeConfig?.language);

  if (!baseUrl || !model) {
    throw new Error("请先提供可用的 ASR Base URL 和 ASR 模型。知识转录依赖 ASR 接口。");
  }

  throwIfAborted(signal);

  const endpoint = `${baseUrl}/audio/transcriptions`;
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: "audio/wav" }), "knowledge.wav");
  formData.append("model", model);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  if (knowledgeConfig?.wordTimestamps) {
    formData.append("timestamp_granularities[]", "word");
  }

  if (language) {
    formData.append("language", language);
  }

  const headers = {};
  if (config?.asrApiKey && String(config.asrApiKey).trim()) {
    headers.Authorization = `Bearer ${String(config.asrApiKey).trim()}`;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
      signal
    });
  } catch (error) {
    if (signal?.aborted || isServerAbortError(error)) {
      throw createServerAbortError();
    }

    throw new Error(humanizeAsrError(error, baseUrl), { cause: error });
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || raw || "ASR 转录失败。");
  }

  const segments = Array.isArray(data?.segments)
    ? data.segments.map((seg) => ({
        start: Number(seg.start) || 0,
        end: Number(seg.end) || Number(seg.start) || 0,
        text: String(seg.text || "")
      }))
    : [];

  if (!segments.length && String(data?.text || "").trim()) {
    segments.push({
      start: 0,
      end: 0,
      text: String(data.text).trim()
    });
  }

  return {
    detectedLanguage: String(data?.language || language || "auto"),
    model,
    segments
  };
}

async function transcribeAudioWithOpenRouter({ audioBuffer, openRouterConfig, knowledgeConfig, signal }) {
  throwIfAborted(signal);

  const prompt = buildLocalWhisperPrompt(knowledgeConfig);
  const payload = {
    input_audio: {
      data: audioBuffer.toString("base64"),
      format: "wav"
    },
    model: openRouterConfig.model
  };

  if (knowledgeConfig?.language) {
    payload.language = trimString(knowledgeConfig.language);
  }

  if (prompt) {
    payload.prompt = prompt;
  }

  let response;
  try {
    response = await fetch(`${openRouterConfig.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: buildOpenRouterTranscribeHeaders(openRouterConfig),
      body: JSON.stringify(payload),
      signal
    });
  } catch (error) {
    if (signal?.aborted || isServerAbortError(error)) {
      throw createServerAbortError();
    }

    throw new Error(humanizeAsrError(error, openRouterConfig.baseUrl), { cause: error });
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || raw || "OpenRouter 转录失败。");
  }

  const segments = normalizeKnowledgeSegmentsFromResponse(data);
  if (!segments.length) {
    throw new Error("OpenRouter 没有返回可用的转写结果。");
  }

  return {
    cacheModel: openRouterConfig.model,
    cacheSource: "openrouter",
    detectedLanguage: trimString(data?.language || knowledgeConfig?.language || "auto") || "auto",
    model: openRouterConfig.model,
    segments,
    sourceLabel: buildOpenRouterSourceLabel(openRouterConfig.model)
  };
}

async function transcribeAudioWithAsr({ audioBuffer, config, knowledgeConfig, signal }) {
  const openRouterConfig = resolveKnowledgeOpenRouterConfig({ config, knowledgeConfig });
  let openRouterError = null;

  if (openRouterConfig) {
    try {
      return await transcribeAudioWithOpenRouter({
        audioBuffer,
        knowledgeConfig,
        openRouterConfig,
        signal
      });
    } catch (error) {
      if (signal?.aborted || isServerAbortError(error)) {
        throw error;
      }

      openRouterError = error;
    }
  }

  if (hasStandardAsrFallbackConfig(config)) {
    try {
      return await transcribeAudioWithStandardAsr({
        audioBuffer,
        config,
        knowledgeConfig,
        signal
      });
    } catch (standardAsrError) {
      if (signal?.aborted || isServerAbortError(standardAsrError)) {
        throw standardAsrError;
      }

      if (openRouterError) {
        throw new Error(
          `OpenRouter 转录失败：${trimString(openRouterError.message)}\n外部 ASR 失败：${trimString(
            standardAsrError.message
          )}`
        );
      }

      throw standardAsrError;
    }
  }

  if (openRouterError) {
    throw openRouterError;
  }

  throw new Error("请先提供可用的 OpenRouter 转写配置或外部 ASR 配置。");
}

async function handleKnowledgeTranscribe(request, response) {
  const abortController = new AbortController();
  const abortRequest = () => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  };

  request.on("aborted", abortRequest);
  response.on("close", () => {
    if (!response.writableEnded) {
      abortRequest();
    }
  });

  let body = null;
  try {
    body = parseJson(await readRequestBody(request));
  } catch (error) {
    if (abortController.signal.aborted || isServerAbortError(error)) {
      return;
    }

    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  if (abortController.signal.aborted) {
    return;
  }

  if (!body) {
    sendJson(response, 400, { error: "请求体不是有效 JSON。" });
    return;
  }

  const { videoBase64, videoName, knowledgeConfig } = body;
  if (!videoBase64 || !videoName) {
    sendJson(response, 400, { error: "缺少视频数据或文件名。" });
    return;
  }

  const extension = path.extname(String(videoName || "")).toLowerCase() || ".mp4";
  const baseName = sanitizeBaseName(videoName);
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempDir = path.join(ROOT, ".tmp", "knowledge");
  const outputDir = path.join(ROOT, "exports", "knowledge");
  const inputVideoPath = path.join(tempDir, `${baseName}-${runId}${extension}`);
  const extractedAudioPath = path.join(tempDir, `${baseName}-${runId}.wav`);
  const outputMarkdownPath = path.join(outputDir, `${baseName}-${runId}.md`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(inputVideoPath, Buffer.from(videoBase64, "base64"));
    throwIfAborted(abortController.signal);

    await runFfmpegExtract(inputVideoPath, extractedAudioPath, {
      signal: abortController.signal
    });
    throwIfAborted(abortController.signal);

    let transcription;
    let warning = "";
    let sourceLabel = "";
    let localWhisperError = null;

    try {
      transcription = await transcribeAudioLocallyWithWhisper({
        audioPath: extractedAudioPath,
        knowledgeConfig: knowledgeConfig || {},
        signal: abortController.signal
      });
      sourceLabel = transcription.sourceLabel;
    } catch (error) {
      if (abortController.signal.aborted || isServerAbortError(error)) {
        throw error;
      }

      localWhisperError = error;

      try {
        const audioBuffer = await fs.readFile(extractedAudioPath);
        throwIfAborted(abortController.signal);

        transcription = await transcribeAudioWithAsr({
          audioBuffer,
          config: body.config || {},
          knowledgeConfig: knowledgeConfig || {},
          signal: abortController.signal
        });
        transcription.cacheSource = transcription.cacheSource || "asr";
        transcription.cacheModel = transcription.cacheModel || transcription.model;
        sourceLabel = trimString(transcription.sourceLabel) || "外部 ASR";
      } catch (asrError) {
        if (abortController.signal.aborted || isServerAbortError(asrError)) {
          throw asrError;
        }

        const cached = await readCachedKnowledgeTranscription({
          outputDir,
          videoName
        });

        if (!cached) {
          throw buildKnowledgeTranscriptionError({
            localError: localWhisperError,
            asrError,
            asrBaseUrl: body.config?.asrBaseUrl || body.config?.baseUrl || ""
          });
        }

        warning = "本地缓存转写";
        sourceLabel = "本地缓存转写";
        transcription = cached;
      }
    }

    throwIfAborted(abortController.signal);

    const markdown = buildMarkdownFromSegments({
      videoName,
      model: transcription.model,
      language: transcription.detectedLanguage,
      segments: transcription.segments,
      appendTimeline: Boolean(knowledgeConfig?.appendTimeline)
    });

    await fs.writeFile(outputMarkdownPath, markdown, "utf8");
    throwIfAborted(abortController.signal);

    if (transcription.cacheSource && transcription.cacheModel) {
      try {
        await writeKnowledgeTranscriptionCache({
          outputDir,
          baseName,
          videoName,
          transcription
        });
      } catch {
        // Cached JSON is helpful but not required for the current request to succeed.
      }
    }

    const transcript = buildTranscriptFromSegments(transcription.segments);

    sendJson(response, 200, {
      ok: true,
      transcript,
      markdown,
      markdownFilePath: outputMarkdownPath,
      segments: transcription.segments,
      sourceLabel,
      warning,
      document: ""
    });
  } catch (error) {
    if (abortController.signal.aborted || isServerAbortError(error)) {
      return;
    }

    const cached = await readCachedKnowledgeTranscription({
      outputDir,
      videoName
    });

    if (cached) {
      const markdown = buildMarkdownFromSegments({
        videoName,
        model: cached.model,
        language: cached.detectedLanguage,
        segments: cached.segments,
        appendTimeline: Boolean(knowledgeConfig?.appendTimeline)
      });
      const transcript = buildTranscriptFromSegments(cached.segments);

      try {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputMarkdownPath, markdown, "utf8");
      } catch {
        // The transcript itself is still useful even if the Markdown export cannot be written.
      }

      sendJson(response, 200, {
        ok: true,
        transcript,
        markdown,
        markdownFilePath: outputMarkdownPath,
        segments: cached.segments,
        sourceLabel: "本地缓存转写",
        warning: "本地缓存转写",
        document: ""
      });
      return;
    }

    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "知识转录失败。"
    });
  } finally {
    try {
      await fs.unlink(inputVideoPath);
    } catch {
      // ignore cleanup errors
    }

    try {
      await fs.unlink(extractedAudioPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

async function serveStatic(response, requestPath) {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, relativePath);

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
    });
    response.end(file);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not Found");
  }
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "无效请求。" });
    return;
  }

  const url = new URL(request.url, `http://${HOST}:${PORT}`);

  if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/transcribe") {
    await handleTranscribe(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/summarize") {
    await handleSummarize(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/test-connection") {
    await handleTestConnection(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/live-transcription/start") {
    await handleLiveTranscriptionStart(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/live-transcription/chunk") {
    await handleLiveTranscriptionChunk(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/live-transcription/stop") {
    await handleLiveTranscriptionStop(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/knowledge/transcribe") {
    await handleKnowledgeTranscribe(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/chatbot/health") {
    await handleChatbotHealth(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/chatbot/message") {
    await handleChatbotMessage(request, response);
    return;
  }

  if (
    request.method === "DELETE" &&
    url.pathname.startsWith("/api/chatbot/session/")
  ) {
    const sessionId = decodeURIComponent(
      url.pathname.slice("/api/chatbot/session/".length)
    );
    await handleChatbotDeleteSession(sessionId, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET") {
    await serveStatic(response, url.pathname);
    return;
  }

  response.writeHead(405, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end("Method Not Allowed");
});

server.listen(PORT, HOST, () => {
  console.log(`AI Note web fallback is running at http://${HOST}:${PORT}`);
});
