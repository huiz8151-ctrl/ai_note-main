const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SERVICE_HOST = String(process.env.AI_NOTE_CHATBOT_HOST || "127.0.0.1").trim() || "127.0.0.1";
const SERVICE_PORT = Number(process.env.AI_NOTE_CHATBOT_PORT || 3212);
const SERVICE_URL = `http://${SERVICE_HOST}:${SERVICE_PORT}`;
const SERVICE_ENTRY = path.join(ROOT, "python", "chatbot_service", "app.py");
const LOCAL_PYTHON_CANDIDATES = collectLocalPythonCandidates();

const state = {
  child: null,
  cleanupInstalled: false,
  lastStderr: "",
  lastStdout: "",
  startPromise: null
};

function trimString(value) {
  return String(value || "").trim();
}

function collectLocalPythonCandidates() {
  const candidates = [path.join(ROOT, ".chatbot-python", "Scripts", "python.exe")];
  const uvRoot = path.join(ROOT, ".uv-python");

  try {
    if (fs.existsSync(uvRoot)) {
      const uvDirs = fs
        .readdirSync(uvRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("cpython-"))
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, "en"));

      for (const dirName of uvDirs) {
        candidates.push(path.join(uvRoot, dirName, "python.exe"));
      }
    }
  } catch {
    // Fall through and keep the default candidates only.
  }

  return [...new Set(candidates)];
}

function resolvePythonBinary() {
  const explicit = [process.env.AI_NOTE_CHATBOT_PYTHON, process.env.PYTHON, process.env.PYTHON_EXE]
    .map(trimString)
    .find(Boolean);

  if (explicit) {
    return explicit;
  }

  const localManaged = LOCAL_PYTHON_CANDIDATES.find((candidate) => {
    if (!fs.existsSync(candidate)) {
      return false;
    }

    try {
      resolvePythonVersion(candidate);
      return true;
    } catch {
      return false;
    }
  });

  if (localManaged) {
    return localManaged;
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

function resolvePythonVersion(pythonBin) {
  try {
    const result = execFileSync(
      pythonBin,
      [
        "-c",
        "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}.{sys.version_info[2]}')"
      ],
      {
        encoding: "utf8",
        windowsHide: true
      }
    ).trim();
    const [major, minor, patch] = result.split(".").map((value) => Number(value) || 0);
    return {
      raw: result,
      major,
      minor,
      patch
    };
  } catch (error) {
    throw new Error(
      `无法检测 ChatBot Python 版本。请确认 AI_NOTE_CHATBOT_PYTHON 或系统 python 可执行。${error instanceof Error ? `\n${error.message}` : ""}`,
    );
  }
}

function ensureSupportedPython(pythonBin) {
  const version = resolvePythonVersion(pythonBin);
  if (version.major < 3 || (version.major === 3 && version.minor < 10)) {
    throw new Error(
      `首页 ChatBot 需要 Python 3.10 或更高版本，当前检测到的是 ${version.raw}。请准备 Python 3.10+ 后再重试。`,
    );
  }

  return version;
}

function isChildAlive() {
  return Boolean(state.child && !state.child.killed && state.child.exitCode === null);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestServiceJson(endpoint, init = {}) {
  const response = await fetch(`${SERVICE_URL}${endpoint}`, init);
  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data && typeof data.error === "string"
        ? data.error
        : data && typeof data.detail === "string"
          ? data.detail
        : raw.slice(0, 300) || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  if (!data || typeof data !== "object") {
    throw new Error("ChatBot 服务返回了无法识别的响应。");
  }

  return data;
}

async function isServiceHealthy() {
  try {
    const data = await requestServiceJson("/health");
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

async function waitForServiceHealthy(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isServiceHealthy()) {
      return;
    }

    if (state.child && state.child.exitCode !== null) {
      break;
    }

    await sleep(300);
  }

  const details = trimString(state.lastStderr || state.lastStdout);
  throw new Error(
    `ChatBot 服务启动失败。${
      details ? `\n服务输出：${details.slice(-800)}` : "请确认 Python 3.10+ 与 agentscope 依赖已正确安装。"
    }`,
  );
}

function installCleanupHooks() {
  if (state.cleanupInstalled) {
    return;
  }

  const cleanup = () => {
    if (isChildAlive()) {
      state.child.kill();
    }
  };

  process.once("exit", cleanup);
  process.once("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  state.cleanupInstalled = true;
}

async function startChatbotService() {
  if (state.startPromise) {
    return state.startPromise;
  }

  state.startPromise = (async () => {
    if (await isServiceHealthy()) {
      installCleanupHooks();
      return {
        ok: true,
        externallyManaged: true,
        serviceUrl: SERVICE_URL
      };
    }

    if (!fs.existsSync(SERVICE_ENTRY)) {
      throw new Error(`未找到 ChatBot 服务入口文件：${SERVICE_ENTRY}`);
    }

    const pythonBin = resolvePythonBinary();
    const version = ensureSupportedPython(pythonBin);

    installCleanupHooks();

    state.lastStderr = "";
    state.lastStdout = "";
    state.child = spawn(pythonBin, [SERVICE_ENTRY], {
      cwd: ROOT,
      env: {
        ...process.env,
        AI_NOTE_CHATBOT_HOST: SERVICE_HOST,
        AI_NOTE_CHATBOT_PORT: String(SERVICE_PORT)
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    state.child.stdout?.on("data", (chunk) => {
      state.lastStdout = `${state.lastStdout}${String(chunk || "")}`.slice(-4000);
    });

    state.child.stderr?.on("data", (chunk) => {
      state.lastStderr = `${state.lastStderr}${String(chunk || "")}`.slice(-4000);
    });

    state.child.once("exit", () => {
      state.child = null;
    });

    await waitForServiceHealthy();

    return {
      ok: true,
      pythonBin,
      pythonVersion: version.raw,
      serviceUrl: SERVICE_URL
    };
  })();

  try {
    return await state.startPromise;
  } finally {
    state.startPromise = null;
  }
}

async function ensureChatbotService() {
  if (await isServiceHealthy()) {
    return {
      ok: true,
      running: true,
      serviceUrl: SERVICE_URL
    };
  }

  return startChatbotService();
}

async function getChatbotHealth() {
  await ensureChatbotService();
  return requestServiceJson("/health");
}

async function getKnowledgeStatus() {
  await ensureChatbotService();
  return requestServiceJson("/knowledge/status");
}

async function rebuildKnowledgeIndex() {
  await ensureChatbotService();
  return requestServiceJson("/knowledge/rebuild", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

async function indexKnowledgeDocument(payload) {
  if (!trimString(payload?.videoName)) {
    throw new Error("缺少需要索引的视频名称。");
  }

  await ensureChatbotService();
  return requestServiceJson("/knowledge/index", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
}

async function searchKnowledge(payload) {
  if (!trimString(payload?.query)) {
    throw new Error("缺少知识检索查询内容。");
  }

  await ensureChatbotService();
  return requestServiceJson("/knowledge/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
}

async function sendChatbotMessage({
  config,
  message,
  sessionId,
  knowledgeRetrieval = false,
  knowledgeTopK = 3,
  docIds = [],
  language = ""
}) {
  if (!trimString(sessionId)) {
    throw new Error("缺少 ChatBot 会话 ID。");
  }

  if (!trimString(message)) {
    throw new Error("消息内容不能为空。");
  }

  await ensureChatbotService();
  return requestServiceJson("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      config,
      docIds: Array.isArray(docIds) ? docIds : [],
      knowledgeRetrieval: Boolean(knowledgeRetrieval),
      knowledgeTopK: Number(knowledgeTopK) || 3,
      language: trimString(language),
      message,
      sessionId
    })
  });
}

async function deleteChatbotSession(sessionId) {
  if (!trimString(sessionId)) {
    throw new Error("缺少需要删除的 ChatBot 会话 ID。");
  }

  await ensureChatbotService();
  return requestServiceJson(`/sessions/${encodeURIComponent(trimString(sessionId))}`, {
    method: "DELETE"
  });
}

async function shutdownChatbotService() {
  if (!isChildAlive()) {
    state.child = null;
    return;
  }

  const child = state.child;
  state.child = null;
  child.kill();
  await sleep(150);
}

module.exports = {
  deleteChatbotSession,
  ensureChatbotService,
  getChatbotHealth,
  getKnowledgeStatus,
  indexKnowledgeDocument,
  rebuildKnowledgeIndex,
  searchKnowledge,
  sendChatbotMessage,
  shutdownChatbotService
};
