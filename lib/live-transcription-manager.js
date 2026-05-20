const path = require("node:path");
const readline = require("node:readline");
const { execFileSync, spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const ffmpegPath = require("ffmpeg-static");

const DEFAULT_MODEL = "medium";
const DEFAULT_IDLE_TIMEOUT_MS = 45_000;
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "openai/whisper-large-v3";
const OPENROUTER_MODEL_ALIASES = new Set([
  "large-v3",
  "whisper-large-v3",
  "openai/whisper-large-v3"
]);
const REQUEST_TIMEOUT_MS = 120_000;

function trimString(value) {
  return String(value || "").trim();
}

function normalizeBaseUrl(baseUrl) {
  const normalized = trimString(baseUrl);
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function resolveEndpoint(baseUrl, endpoint) {
  return `${normalizeBaseUrl(baseUrl)}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function parseJsonResponse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function normalizeMimeType(mimeType) {
  return trimString(mimeType).split(";")[0].toLowerCase();
}

function resolveOpenRouterAudioFormat(mimeType) {
  const normalized = normalizeMimeType(mimeType);

  if (normalized.includes("wav")) {
    return "wav";
  }

  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return "mp3";
  }

  if (normalized.includes("mp4") || normalized.includes("m4a")) {
    return "mp4";
  }

  if (normalized.includes("ogg")) {
    return "ogg";
  }

  if (normalized.includes("flac")) {
    return "flac";
  }

  return "webm";
}

function resolveOpenRouterConfig() {
  return {
    apiKey: trimString(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY),
    baseUrl: normalizeBaseUrl(process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_BASE_URL),
    httpReferer: trimString(process.env.OPENROUTER_HTTP_REFERER || process.env.OPENROUTER_REFERER),
    model:
      trimString(process.env.OPENROUTER_TRANSCRIBE_MODEL || process.env.OPENROUTER_MODEL) ||
      DEFAULT_OPENROUTER_MODEL,
    title: trimString(process.env.OPENROUTER_APP_TITLE || process.env.OPENROUTER_TITLE)
  };
}

function canUseOpenRouter(config) {
  return Boolean(config?.apiKey && config?.baseUrl && config?.model);
}

function shouldUseOpenRouterForModel(modelName) {
  return OPENROUTER_MODEL_ALIASES.has(trimString(modelName).toLowerCase());
}

function buildOpenRouterHeaders(config) {
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
  return `OpenRouter · ${trimString(modelName) || DEFAULT_OPENROUTER_MODEL}`;
}

function buildOpenRouterMissingConfigError(requestedModel, fallbackError) {
  const fallbackMessage = trimString(fallbackError?.message || fallbackError);
  const suffix = fallbackMessage ? ` Local fallback error: ${fallbackMessage}` : "";
  return new Error(
    `OPENROUTER_API_KEY is not available to the current server process. ` +
      `Put it in the process environment or in ai_note-main/.env.local before starting the service. ` +
      `Model '${trimString(requestedModel) || DEFAULT_OPENROUTER_MODEL}' is configured as online preferred.${suffix}`
  );
}

async function requestJson(url, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    const rawText = await response.text();
    const data = parseJsonResponse(rawText);

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || rawText || `HTTP ${response.status}`);
    }

    return data ?? { rawText };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("OpenRouter transcription request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
    // Fall through to default executable names.
  }

  return process.platform === "win32" ? "python" : "python3";
}

function normalizeWorkerStartupError(error) {
  const message = String(error?.message || error || "").trim();
  const code = String(error?.code || "").trim().toUpperCase();

  if (code === "EPERM" || /\bspawn\b.*\bEPERM\b/i.test(message)) {
    return new Error(
      "无法启动本地 Whisper worker。当前环境拒绝创建本地转写子进程，请确认桌面端或本地 Web 服务具备启动 Python 进程的权限。"
    );
  }

  if (code === "ENOENT" || /\bENOENT\b/i.test(message)) {
    return new Error(
      "无法启动本地 Whisper worker。请确认 Python、ffmpeg 以及本地 Whisper 脚本文件都可用。"
    );
  }

  if (!message) {
    return new Error("本地 Whisper worker 启动失败。");
  }

  return new Error(message);
}

class LiveTranscriptionManager {
  constructor({
    defaultLanguage = "",
    defaultModel = DEFAULT_MODEL,
    defaultPrompt = "",
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    root
  }) {
    this.defaultLanguage = String(defaultLanguage || "");
    this.defaultModel = String(defaultModel || DEFAULT_MODEL);
    this.defaultPrompt = String(defaultPrompt || "");
    this.idleTimeoutMs = Math.max(10_000, Number(idleTimeoutMs) || DEFAULT_IDLE_TIMEOUT_MS);
    this.root = root;

    this.ffmpegDir = ffmpegPath ? path.dirname(ffmpegPath) : "";
    this.openRouterConfig = resolveOpenRouterConfig();
    this.pythonBin = resolvePythonBinary();
    this.pythonVendorDir = path.join(root, ".vendor", "python");
    this.workerPath = path.join(root, "lib", "live-whisper-worker.py");

    this.sessions = new Map();
    this.pendingRequests = new Map();
    this.shutdownTimer = null;
    this.startPromise = null;
    this.workerMeta = null;
    this.child = null;
    this.stdoutReader = null;
  }

  async startSession({
    language = this.defaultLanguage,
    model = this.defaultModel,
    prompt = this.defaultPrompt
  } = {}) {
    const requestedModel = trimString(model || this.defaultModel) || this.defaultModel;
    const sessionId = randomUUID();
    const openRouterConfig = this.resolvePreferredOpenRouterConfig(requestedModel);

    if (openRouterConfig) {
      this.sessions.set(sessionId, {
        createdAt: Date.now(),
        fallbackUsed: false,
        language: String(language || ""),
        localModel: requestedModel,
        model: openRouterConfig.model,
        openRouterConfig,
        pendingCount: 0,
        prompt: String(prompt || ""),
        provider: "openrouter",
        sourceLabel: buildOpenRouterSourceLabel(openRouterConfig.model)
      });

      return {
        fallbackUsed: false,
        model: openRouterConfig.model,
        provider: "openrouter",
        sessionId,
        sourceLabel: buildOpenRouterSourceLabel(openRouterConfig.model)
      };
    }

    let workerMeta = null;
    try {
      workerMeta = await this.ensureWorker(requestedModel);
    } catch (error) {
      if (shouldUseOpenRouterForModel(requestedModel)) {
        throw buildOpenRouterMissingConfigError(requestedModel, error);
      }

      throw error;
    }

    this.sessions.set(sessionId, {
      createdAt: Date.now(),
      fallbackUsed: false,
      language: String(language || ""),
      localModel: requestedModel,
      model: workerMeta.model,
      pendingCount: 0,
      prompt: String(prompt || ""),
      provider: "local",
      sourceLabel: workerMeta.sourceLabel
    });

    return {
      fallbackUsed: false,
      model: workerMeta.model,
      provider: "local",
      sessionId,
      sourceLabel: workerMeta.sourceLabel
    };
  }

  async transcribeChunk({ audioBase64, mimeType, seq = 0, sessionId }) {
    const session = this.sessions.get(String(sessionId || ""));
    if (!session) {
      throw new Error("实时转写会话不存在或已结束。");
    }

    if (!audioBase64) {
      throw new Error("缺少实时转写音频数据。");
    }

    session.pendingCount += 1;

    try {
      const result = await this.transcribeWithSession(session, {
        audioBase64,
        mimeType: mimeType || "audio/webm"
      });

      const text = String(result?.text || "").trim();

      return {
        fallbackUsed: Boolean(session.fallbackUsed),
        isEmpty: !text,
        model: session.model,
        provider: session.provider,
        seq: Number(seq) || 0,
        sourceLabel: session.sourceLabel,
        text
      };
    } finally {
      session.pendingCount = Math.max(0, session.pendingCount - 1);
      this.scheduleIdleShutdown();
    }
  }

  async stopSession(sessionId) {
    const session = this.sessions.get(String(sessionId || ""));
    const finalPendingCount = session?.pendingCount || 0;
    this.sessions.delete(String(sessionId || ""));
    this.scheduleIdleShutdown();

    return {
      finalPendingCount,
      ok: true
    };
  }

  async shutdown() {
    this.sessions.clear();
    this.clearShutdownTimer();
    await this.stopWorker("shutdown");
  }

  clearShutdownTimer() {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }
  }

  scheduleIdleShutdown() {
    this.clearShutdownTimer();

    if (this.sessions.size || this.pendingRequests.size || !this.child) {
      return;
    }

    this.shutdownTimer = setTimeout(() => {
      this.shutdownTimer = null;
      if (this.sessions.size || this.pendingRequests.size) {
        return;
      }

      void this.stopWorker("idle-timeout");
    }, this.idleTimeoutMs);
  }

  async ensureWorker(requestedModel = this.defaultModel) {
    this.clearShutdownTimer();
    const desiredModel = String(requestedModel || this.defaultModel).trim() || this.defaultModel;

    if (
      this.child &&
      !this.child.killed &&
      this.child.exitCode === null &&
      this.workerMeta &&
      this.workerMeta.requestedModel === desiredModel
    ) {
      return this.workerMeta;
    }

    if (this.startPromise) {
      const workerMeta = await this.startPromise;
      if (workerMeta?.requestedModel === desiredModel) {
        return workerMeta;
      }
    }

    this.startPromise = this.startWorker(desiredModel);

    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async startWorker(requestedModel = this.defaultModel) {
    await this.stopWorker("restart");

    return new Promise((resolve, reject) => {
      let child = null;
      try {
        child = spawn(this.pythonBin, [this.workerPath, "--model", requestedModel], {
          cwd: this.root,
          env: {
            ...process.env,
            PATH: [this.ffmpegDir, process.env.PATH].filter(Boolean).join(path.delimiter),
            PYTHONPATH: [this.pythonVendorDir, process.env.PYTHONPATH]
              .filter(Boolean)
              .join(path.delimiter)
          },
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true
        });
      } catch (error) {
        reject(normalizeWorkerStartupError(error));
        return;
      }

      this.child = child;
      this.workerMeta = null;

      const stderrChunks = [];
      const rejectStartup = (error) => {
        this.child = null;
        this.workerMeta = null;
        reject(normalizeWorkerStartupError(error));
      };

      child.stderr.on("data", (chunk) => {
        stderrChunks.push(String(chunk));
      });

      child.stdin.on("error", () => {
        // Ignore broken pipe errors after shutdown.
      });

      child.once("error", (error) => {
        rejectStartup(error);
      });

      child.once("exit", (code, signal) => {
        const startupError =
          !this.workerMeta &&
          new Error(
            `本地 Whisper worker 启动失败（code=${code ?? "null"}, signal=${signal ?? "null"}）。${
              stderrChunks.join("").trim() ? ` ${stderrChunks.join("").trim()}` : ""
            }`
          );

        this.handleWorkerExit(startupError);

        if (startupError) {
          rejectStartup(startupError);
        }
      });

      this.stdoutReader = readline.createInterface({
        input: child.stdout
      });

      this.stdoutReader.on("line", (line) => {
        if (!line.trim()) {
          return;
        }

        let payload = null;
        try {
          payload = JSON.parse(line);
        } catch {
          return;
        }

        if (payload.type === "ready" && payload.ok) {
          this.workerMeta = {
            model: String(payload.model || `local-whisper:${payload.resolvedModel || requestedModel}`),
            requestedModel: String(payload.requestedModel || requestedModel),
            resolvedModel: String(payload.resolvedModel || requestedModel),
            sourceLabel: String(payload.sourceLabel || `内置 Whisper · ${payload.resolvedModel || requestedModel}`)
          };
          this.workerMeta.sourceLabel = String(
            payload.sourceLabel || `\u5185\u7f6e Whisper \u00b7 ${payload.resolvedModel || requestedModel}`
          );
          resolve(this.workerMeta);
          return;
        }

        if (payload.type === "fatal") {
          rejectStartup(new Error(String(payload.error || "本地 Whisper worker 启动失败。")));
          void this.stopWorker("fatal");
          return;
        }

        const requestId = String(payload.id || "");
        if (!requestId) {
          return;
        }

        const pending = this.pendingRequests.get(requestId);
        if (!pending) {
          return;
        }

        clearTimeout(pending.timeoutId);
        this.pendingRequests.delete(requestId);

        if (!payload.ok) {
          pending.reject(new Error(String(payload.error || "实时转写失败。")));
          return;
        }

        pending.resolve({
          language: String(payload.language || ""),
          resolvedModel: String(payload.resolvedModel || this.defaultModel),
          segments: Array.isArray(payload.segments) ? payload.segments : [],
          text: String(payload.text || "")
        });
      });
    });
  }

  handleWorkerExit(error) {
    if (this.stdoutReader) {
      this.stdoutReader.close();
      this.stdoutReader = null;
    }

    this.child = null;
    this.workerMeta = null;

    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(
        error instanceof Error ? error : new Error("本地 Whisper worker 已退出。")
      );
      this.pendingRequests.delete(requestId);
    }
  }

  async stopWorker(reason) {
    const child = this.child;
    if (!child) {
      return;
    }

    this.clearShutdownTimer();

    try {
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(`${JSON.stringify({ type: "shutdown", reason })}\n`);
      }
    } catch {
      // Ignore shutdown write errors.
    }

    await new Promise((resolve) => {
      const finalize = () => resolve();
      child.once("exit", finalize);
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill("SIGTERM");
        }
        resolve();
      }, 1_000);
    });

    this.handleWorkerExit(new Error("本地 Whisper worker 已关闭。"));
  }

  async sendRequest(payload) {
    await this.ensureWorker(payload.requestedModel || this.workerMeta?.requestedModel || this.defaultModel);

    if (!this.child || this.child.exitCode !== null || !this.child.stdin || this.child.stdin.destroyed) {
      throw new Error("本地 Whisper worker 当前不可用。");
    }

    const requestId = randomUUID();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error("本地 Whisper 实时转写超时。"));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(requestId, {
        reject,
        resolve,
        timeoutId
      });

      try {
        this.child.stdin.write(
          `${JSON.stringify({
            ...payload,
            id: requestId
          })}\n`
        );
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  resolvePreferredOpenRouterConfig(requestedModel) {
    if (!shouldUseOpenRouterForModel(requestedModel) || !canUseOpenRouter(this.openRouterConfig)) {
      return null;
    }

    return { ...this.openRouterConfig };
  }

  async transcribeWithSession(session, { audioBase64, mimeType }) {
    if (session.provider === "openrouter") {
      try {
        return await this.transcribeWithOpenRouter(session, {
          audioBase64,
          mimeType
        });
      } catch (openRouterError) {
        return this.transcribeWithLocalFallback(session, { audioBase64, mimeType }, openRouterError);
      }
    }

    return this.transcribeWithLocal(session, { audioBase64, mimeType });
  }

  async transcribeWithOpenRouter(session, { audioBase64, mimeType }) {
    const config = session.openRouterConfig || this.resolvePreferredOpenRouterConfig(session.localModel);
    if (!config) {
      throw new Error("OpenRouter is not configured for live transcription.");
    }

    const data = await requestJson(resolveEndpoint(config.baseUrl, "/audio/transcriptions"), {
      body: JSON.stringify({
        input_audio: {
          data: audioBase64,
          format: resolveOpenRouterAudioFormat(mimeType)
        },
        language: trimString(session.language) || undefined,
        model: config.model,
        prompt: trimString(session.prompt) || undefined
      }),
      headers: buildOpenRouterHeaders(config),
      method: "POST"
    });

    return {
      text: trimString(data?.text)
    };
  }

  async transcribeWithLocal(session, { audioBase64, mimeType }) {
    const requestedModel = trimString(session.localModel) || this.defaultModel;
    const result = await this.sendRequest(
      {
        audioBase64,
        language: session.language,
        mimeType: mimeType || "audio/webm",
        prompt: session.prompt,
        requestedModel,
        type: "transcribe"
      },
      requestedModel
    );

    if (session.provider !== "local" || !session.sourceLabel || !String(session.model || "").trim()) {
      const workerMeta = await this.ensureWorker(requestedModel);
      session.model = workerMeta.model;
      session.sourceLabel = workerMeta.sourceLabel;
    }

    session.openRouterConfig = null;
    session.provider = "local";

    return result;
  }

  async transcribeWithLocalFallback(session, payload, openRouterError) {
    try {
      const result = await this.transcribeWithLocal(session, payload);
      session.fallbackUsed = true;
      return result;
    } catch (localError) {
      const primaryMessage = trimString(openRouterError?.message || openRouterError) || "Online transcription failed.";
      const fallbackMessage = trimString(localError?.message || localError) || "Local fallback failed.";
      throw new Error(
        `OpenRouter transcription failed: ${primaryMessage}\nLocal Whisper fallback failed: ${fallbackMessage}`
      );
    }
  }
}

function createLiveTranscriptionManager(options) {
  return new LiveTranscriptionManager(options);
}

module.exports = {
  createLiveTranscriptionManager
};
