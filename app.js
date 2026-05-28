const STORAGE_KEYS = {
  chatbot: "ai-note.chatbot",
  config: "ai-note.config",
  history: "ai-note.history",
  prefs: "ai-note.workspace-prefs"
};

const API_FALLBACK_BASES = ["http://127.0.0.1:3211", "http://127.0.0.1:3210"];
const DEFAULT_KNOWLEDGE_TRANSCRIPTION_MODEL = "openai/whisper-large-v3";

const DEFAULT_CONFIG = {
  asrBaseUrl: "https://api.openai.com/v1",
  asrApiKey: "",
  asrModel: "gpt-4o-mini-transcribe",
  asrLanguage: "zh",
  llmBaseUrl: "https://api.openai.com/v1",
  llmApiKey: "",
  llmModel: "gpt-5.4-nano",
  llmMaxTokens: 4096,
  llmTemperature: 0.2,
  chunkMs: 4000,
  autoSummary: false,
  transcriptionPrompt:
    "\u8bf7\u4fdd\u7559\u4e2d\u6587\u4e13\u6709\u540d\u8bcd\u3001\u4ea7\u54c1\u540d\u3001\u4eba\u540d\u548c\u884c\u52a8\u9879\u3002",
  summaryPromptMeeting:
    "\u8bf7\u53ea\u7528\u4e2d\u6587\u8f93\u51fa\uff0c\u6309 Markdown \u6807\u9898\u8fd4\u56de\uff1a# \u5f53\u524d\u603b\u7ed3\u3001# \u4f1a\u8bae\u7eaa\u8981\u3001# \u5f85\u529e\u4e8b\u9879\u3001# \u98ce\u9669\u4e0e\u5f85\u786e\u8ba4\u3002",
  summaryPromptVideo:
    "\u8bf7\u53ea\u7528\u4e2d\u6587\u8f93\u51fa\uff0c\u6309 Markdown \u6807\u9898\u8fd4\u56de\uff1a# \u5f53\u524d\u603b\u7ed3\u3001# \u5185\u5bb9\u7b14\u8bb0\u3001# \u91cd\u70b9\u56de\u987e\u3001# \u98ce\u9669\u4e0e\u5f85\u786e\u8ba4\u3002",
  summaryPromptCustom: "",
  video2docWhisperModel: DEFAULT_KNOWLEDGE_TRANSCRIPTION_MODEL,
  video2docLanguage: "auto",
  video2docFfmpegPath: "",
  video2docFfprobePath: "",
  video2docWordTimestamps: true,
  video2docAppendTimeline: true,
  video2docHotwords: ""
};

const RECORDER_CANDIDATE_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4"
];

const LIVE_CHUNK_MS = 8000;
const LIVE_INITIAL_CHUNK_MS = 5000;
const LIVE_SILENCE_THRESHOLD = 0.05;
const LIVE_AUDIO_RECENCY_MS = 1600;
const LIVE_DEFAULT_WHISPER_MODEL = "large-v3";
const DEFAULT_OPENROUTER_TRANSCRIBE_MODEL = DEFAULT_KNOWLEDGE_TRANSCRIPTION_MODEL;
const OPENROUTER_WHISPER_MODEL_ALIASES = new Set([
  "large-v3",
  "whisper-large-v3",
  "openai/whisper-large-v3"
]);
const RECORD_SHORTCUT_LABEL = "Alt+Space";

const KNOWLEDGE_TRANSCRIPT_TICK_MS = 90;

const PAGE_META = {
  dashboard: "\u5de5\u4f5c\u533a / \u9996\u9875",
  recording: "\u5de5\u4f5c\u533a / \u5b9e\u65f6\u8bb0\u5f55",
  library: "\u5de5\u4f5c\u533a / \u4f1a\u8bae\u8be6\u60c5",
  knowledge: "\u5de5\u4f5c\u533a / \u77e5\u8bc6\u8f6c\u5f55"
};

const EMPTY_AI_SECTIONS = () => ({
  summary: "",
  minutes: "",
  tasks: "",
  risks: "",
  raw: ""
});

const elements = {
  pageBreadcrumb: document.querySelector("#page-breadcrumb"),
  globalSearch: document.querySelector("#global-search"),
  dashboardStartBtn: document.querySelector("#dashboard-start-btn"),
  dashboardOpenLibraryBtn: document.querySelector("#dashboard-open-library-btn"),
  dashboardNotebookList: document.querySelector("#dashboard-notebook-list"),
  dashboardRecords: document.querySelector("#dashboard-records"),
  dashboardWeeklyInsight: document.querySelector("#dashboard-weekly-insight"),
  dashboardChatbotDeleteBtn: document.querySelector("#dashboard-chatbot-delete-btn"),
  dashboardChatbotDraft: document.querySelector("#dashboard-chatbot-draft"),
  dashboardChatbotError: document.querySelector("#dashboard-chatbot-error"),
  dashboardChatbotForm: document.querySelector("#dashboard-chatbot-form"),
  dashboardChatbotKnowledgeToggle: document.querySelector("#dashboard-chatbot-knowledge-toggle"),
  dashboardChatbotMessages: document.querySelector("#dashboard-chatbot-messages"),
  dashboardChatbotNewBtn: document.querySelector("#dashboard-chatbot-new-btn"),
  dashboardChatbotSendBtn: document.querySelector("#dashboard-chatbot-send-btn"),
  dashboardChatbotServiceMeta: document.querySelector("#dashboard-chatbot-service-meta"),
  dashboardChatbotSessions: document.querySelector("#dashboard-chatbot-sessions"),
  dashboardChatbotStatus: document.querySelector("#dashboard-chatbot-status"),
  viewLibraryBtn: document.querySelector("#view-library-btn"),
  recordingPage: document.querySelector("#recording-page"),
  recordingHeader: document.querySelector("#recording-header"),
  recordingDeleteBtn: document.querySelector("#recording-delete-btn"),
  recordingCollapseToggle: document.querySelector("#recording-collapse-toggle"),
  recordingCollapseLabel: document.querySelector("#recording-collapse-label"),
  recordingTitle: document.querySelector("#recording-title"),
  recordingSubtitle: document.querySelector("#recording-subtitle"),
  recordingTemplateSelect: document.querySelector("#recording-template-select"),
  recordingWhisperModelSelect: document.querySelector("#recording-whisper-model-select"),
  recordingDuration: document.querySelector("#recording-duration"),
  recordingSecondaryAction: document.querySelector("#recording-secondary-action"),
  recordingSecondaryActionLabel: document.querySelector("#recording-secondary-action-label"),
  recordingModuleStack: document.querySelector("#recording-module-stack"),
  recordingTranscript: document.querySelector("#recording-transcript"),
  recordingStartBtn: document.querySelector("#recording-start-btn"),
  waveBars: document.querySelector("#wave-bars"),
  pauseBtn: document.querySelector("#pause-btn"),
  resumeBtn: document.querySelector("#resume-btn"),
  markHighlightBtn: document.querySelector("#mark-highlight-btn"),
  stopBtn: document.querySelector("#stop-btn"),
  gainDots: Array.from(document.querySelectorAll(".gain-dots i")),
  libraryRecordList: document.querySelector("#library-record-list"),
  libraryRecordSliderRow: document.querySelector("#library-record-slider-row"),
  libraryRecordSlider: document.querySelector("#library-record-slider"),
  detailRecordPicker: document.querySelector("#detail-record-picker"),
  detailRecordCurrent: document.querySelector("#detail-record-current"),
  detailRecordCurrentMeta: document.querySelector("#detail-record-current-meta"),
  detailTitle: document.querySelector("#detail-title"),
  detailMeta: document.querySelector("#detail-meta"),
  detailBackBtn: document.querySelector(".detail-back"),
  detailTemplateSelect: document.querySelector("#detail-template-select"),
  detailGenerateBtn: document.querySelector("#detail-generate-btn"),
  detailSaveBtn: document.querySelector("#detail-save-btn"),
  detailCopyBtn: document.querySelector("#detail-copy-btn"),
  detailExportBtn: document.querySelector("#detail-export-btn"),
  detailDurationChip: document.querySelector("#detail-duration-chip"),
  detailLanguageChip: document.querySelector("#detail-language-chip"),
  detailStatusChip: document.querySelector("#detail-status-chip"),
  detailTranscriptStream: document.querySelector("#detail-transcript-stream"),
  detailAiOutput: document.querySelector("#detail-ai-output"),
  knowledgeVideoInput: document.querySelector("#knowledge-video-input"),
  knowledgeTopbar: document.querySelector("#knowledge-topbar"),
  knowledgeVideoTitle: document.querySelector("#knowledge-video-title"),
  knowledgeVideoMeta: document.querySelector("#knowledge-video-meta"),
  knowledgeRefsInput: document.querySelector("#knowledge-refs-input"),
  knowledgeTemplateSelect: document.querySelector("#knowledge-template-select"),
  knowledgeStartBtn: document.querySelector("#knowledge-start-btn"),
  knowledgeArchiveBtn: document.querySelector("#knowledge-archive-btn"),
  knowledgeGenerateDocBtn: document.querySelector("#knowledge-generate-doc-btn"),
  knowledgeExportMarkdownBtn: document.querySelector("#knowledge-export-markdown-btn"),
  knowledgeStatus: document.querySelector("#knowledge-status"),
  knowledgeStepAudio: document.querySelector("#knowledge-step-audio"),
  knowledgeStepAsr: document.querySelector("#knowledge-step-asr"),
  knowledgeStepDoc: document.querySelector("#knowledge-step-doc"),
  knowledgeStepNotion: document.querySelector("#knowledge-step-notion"),
  knowledgeTranscriptPreview: document.querySelector("#knowledge-transcript-preview"),
  knowledgeDocPreview: document.querySelector("#knowledge-doc-preview"),
  knowledgeNotionResult: document.querySelector("#knowledge-notion-result"),
  settingsLanguage: document.querySelector("#settings-language"),
  settingsAudioSource: document.querySelector("#settings-audio-source"),
  settingsTemplate: document.querySelector("#settings-template"),
  testAsrBtn: document.querySelector("#test-asr-btn"),
  testLlmBtn: document.querySelector("#test-llm-btn"),
  asrTestResult: document.querySelector("#asr-test-result"),
  llmTestResult: document.querySelector("#llm-test-result"),
  restorePromptsBtn: document.querySelector("#restore-prompts-btn")
};

const runtimeApi = window.aiNoteApi ?? createBrowserApi();
const workspacePrefs = loadWorkspacePrefs();
const initialHistory = loadHistory();
const initialUntitledRecordingIndex = deriveNextUntitledRecordingIndex(initialHistory);
const initialMeetingTitle = resolveInitialMeetingTitle(
  workspacePrefs.meetingTitle,
  initialUntitledRecordingIndex
);

const state = {
  aiSections: EMPTY_AI_SECTIONS(),
  audioDetected: false,
  audioMeterLevel: 0,
  audioSource: "system",
  autoSummaryTimer: null,
  captureStartInFlight: false,
  chatbot: loadChatbotState(),
  cleanupCaptureResources: null,
  config: loadConfig(),
  currentPage: "dashboard",
  detailAiSections: EMPTY_AI_SECTIONS(),
  detailSummaryError: "",
  detailTranscriptDraft: "",
  diagnostics: {
    devices: [],
    supportsDisplayCapture: Boolean(navigator.mediaDevices?.getDisplayMedia),
    supportsMediaRecorder: typeof MediaRecorder !== "undefined",
    supportsUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    updatedAt: null
  },
  history: initialHistory,
  historySearch: "",
  knowledge: {
    docMarkdown: "",
    docError: "",
    docGenerationRunId: "",
    isArchiving: false,
    isGeneratingDoc: false,
    isProcessing: false,
    notionResultMessage: "\u5c1a\u672a\u540c\u6b65\u5230 Notion\u3002",
    notionUrl: "",
    refs: "",
    statusMessage: "\u7b49\u5f85\u5bfc\u5165",
    stepAudio: "neutral",
    stepAsr: "neutral",
    stepDoc: "neutral",
    stepNotion: "neutral",
    template: "learning",
    stopRequested: false,
    transcriptionAbortController: null,
    transcriptAnimation: null,
    transcriptAnimationIndex: -1,
    transcriptMarkdown: "",
    transcriptMarkdownPath: "",
    transcriptPreview: "",
    transcriptionSourceLabel: "",
    transcriptionRunId: "",
    videoFile: null,
    videoName: ""
  },
  isCapturing: false,
  isPaused: false,
  isSummarizing: false,
  lastAudioActivityAt: null,
  liveChunkSeq: 0,
  liveWhisperModel: String(workspacePrefs.liveWhisperModel || LIVE_DEFAULT_WHISPER_MODEL).trim() || LIVE_DEFAULT_WHISPER_MODEL,
  liveSessionId: "",
  liveSourceLabel: "",
  liveTranscriptionStopping: false,
  currentUntitledRecordingIndex: initialUntitledRecordingIndex,
  meetingTitle: initialMeetingTitle,
  monitorFrameId: null,
  nextUntitledRecordingIndex: isAutoGeneratedRecordingTitle(initialMeetingTitle)
    ? initialUntitledRecordingIndex + 1
    : initialUntitledRecordingIndex,
  pendingTranscriptions: 0,
  permissions: {
    display: "unknown",
    mic: "unknown",
    systemAudio: "unknown"
  },
  recorder: null,
  recordedDurationMs: 0,
  recordingModuleStackItems: [],
  recordingTranscriptAutoFollow: true,
  recordingTranscriptCollapsed: false,
  recordStartedAt: null,
  segments: [],
  selectedRecordId: null,
  sessionCreatedAt: new Date().toISOString(),
  sessionId: crypto.randomUUID(),
  summaryTemplate: workspacePrefs.summaryTemplate || "meeting",
  testResults: {
    asr: { status: "neutral", message: "\u8fd8\u672a\u6d4b\u8bd5\u3002" },
    llm: { status: "neutral", message: "\u8fd8\u672a\u6d4b\u8bd5\u3002" }
  },
  transcriptionChain: Promise.resolve(),
  transcriptionLanguage: workspacePrefs.transcriptionLanguage || "auto",
  durationTimerId: null,
  workflowState: "idle"
};

function createBrowserApi() {
  return {
    async transcribeChunk(payload) {
      const audioBase64 = arrayBufferToBase64(payload.buffer);
      return postJson("/api/transcribe", {
        audioBase64,
        config: payload.config,
        mimeType: payload.mimeType,
        prompt: payload.prompt
      });
    },
    async startLiveTranscription(payload) {
      return postJson("/api/live-transcription/start", payload);
    },
    async transcribeLiveChunk(payload) {
      return postJson("/api/live-transcription/chunk", payload);
    },
    async stopLiveTranscription(payload) {
      return postJson("/api/live-transcription/stop", payload);
    },
    async generateSummary(payload, options = {}) {
      return postJson("/api/summarize", payload, options);
    },
    async chatbotHealth() {
      return requestJson("/api/chatbot/health", { method: "GET" });
    },
    async chatbotSendMessage(payload) {
      return postJson("/api/chatbot/message", payload);
    },
    async chatbotDeleteSession(payload) {
      return requestJson(
        `/api/chatbot/session/${encodeURIComponent(String(payload?.sessionId || "").trim())}`,
        { method: "DELETE" }
      );
    },
    async exportMarkdown(payload) {
      if (typeof window.showSaveFilePicker === "function") {
        let handle = null;

        try {
          handle = await window.showSaveFilePicker({
            suggestedName: payload.defaultFileName || "memory.md",
            types: [
              {
                accept: { "text/markdown": [".md"] },
                description: "Markdown"
              }
            ]
          });
        } catch (error) {
          if (error?.name === "AbortError") {
            return { canceled: true };
          }

          throw error;
        }

        const writable = await handle.createWritable();
        await writable.write(new Blob([payload.content], { type: "text/markdown;charset=utf-8" }));
        await writable.close();

        return {
          canceled: false,
          filePath: handle.name
        };
      }

      const blob = new Blob([payload.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.defaultFileName || "memory.md";
      anchor.click();
      URL.revokeObjectURL(url);
      return {
        canceled: false,
        filePath: payload.defaultFileName || "memory.md"
      };
    },
    async testModelConnection(payload) {
      return postJson("/api/test-connection", payload);
    }
  };
}

async function requestJson(url, init = {}, options = {}) {
  const isApiRoute = /^\/api\//.test(url);
  const currentOrigin = window.location.origin;
  const isFileProtocol = window.location.protocol === "file:";
  const targets = [];
  let legacyKnowledgeApiDetected = false;
  let firstServiceError = null;

  if (!isApiRoute || !isFileProtocol) {
    targets.push(url);
  }

  if (isApiRoute) {
    API_FALLBACK_BASES.forEach((baseUrl) => {
      if (baseUrl && baseUrl !== currentOrigin) {
        targets.push(`${baseUrl}${url}`);
      }
    });
  }

  if (targets.length === 0) {
    targets.push(url);
  }

  let lastError = null;
  const requestInit = {
    ...init,
    method: String(init.method || "GET").toUpperCase(),
    headers: {
      ...(init.body !== undefined && init.body !== null ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {})
    }
  };

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        ...requestInit,
        signal: options.signal
      });

      const raw = await response.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const messageFromJson = data && typeof data.error === "string" ? data.error : "";
        const message = messageFromJson || raw.slice(0, 200) || "Request failed.";
        const serviceError = new Error(message);
        serviceError.name = "ApiResponseError";
        serviceError.isServiceError = true;
        serviceError.status = response.status;
        throw serviceError;
      }

      if (!data || typeof data !== "object") {
        const serviceError = new Error("\u670d\u52a1\u7aef\u8fd4\u56de\u4e86\u975e JSON \u54cd\u5e94\uff0c\u8bf7\u786e\u8ba4 API \u670d\u52a1\u662f\u5426\u5df2\u542f\u52a8\u3002");
        serviceError.name = "ApiResponseError";
        serviceError.isServiceError = true;
        throw serviceError;
      }

      return data;
    } catch (error) {
      if (options.signal?.aborted || error?.name === "AbortError") {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error || "");
      if (
        url === "/api/knowledge/transcribe" &&
        target === url &&
        requestInit.method === "POST" &&
        /ASR Base URL|ASR \u8f6c\u5199\u670d\u52a1/i.test(message)
      ) {
        legacyKnowledgeApiDetected = true;
      }

      if (error?.isServiceError && !(firstServiceError instanceof Error)) {
        firstServiceError = error;
      }

      lastError = error;
    }
  }

  if (legacyKnowledgeApiDetected) {
    throw new Error(
      "\u5f53\u524d 3210 \u7aef\u53e3\u4ecd\u5728\u8fd0\u884c\u65e7\u7248\u77e5\u8bc6\u8f6c\u5f55\u670d\u52a1\u3002\u8bf7\u91cd\u542f\u672c\u5730 Web \u670d\u52a1\u540e\u91cd\u8bd5\uff0c\u6216\u6539\u7528 3211 \u7aef\u53e3\u7684\u65b0\u670d\u52a1\u3002"
    );
  }

  if (firstServiceError instanceof Error) {
    throw firstServiceError;
  }

  if (
    isApiRoute &&
    isFileProtocol &&
    lastError instanceof Error &&
    /Failed to fetch|NetworkError|Load failed/i.test(lastError.message)
  ) {
    throw new Error(
      "当前页面是直接打开的本地 HTML 文件，无法直接访问 /api 接口。请使用 npm run dev 或 npm run start:web 启动项目后再重试；如果使用 Web 版，请访问 http://127.0.0.1:3210 或 http://127.0.0.1:3211。"
    );
  }

  if (
    isApiRoute &&
    lastError instanceof Error &&
    /Failed to fetch|NetworkError|Load failed/i.test(lastError.message)
  ) {
    throw new Error(
      "\u65e0\u6cd5\u8fde\u63a5\u672c\u5730 API \u670d\u52a1\u3002\u8bf7\u786e\u8ba4 127.0.0.1:3211 \u5df2\u542f\u52a8\uff1b\u5982\u679c\u521a\u4fee\u6539\u8fc7\u73af\u5883\u53d8\u91cf\u6216\u670d\u52a1\u4ee3\u7801\uff0c\u8bf7\u5148\u91cd\u542f Web \u670d\u52a1\u540e\u518d\u91cd\u8bd5\u3002"
    );
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed.");
}

async function postJson(url, payload, options = {}) {
  return requestJson(
    url,
    {
      body: JSON.stringify(payload),
      method: "POST"
    },
    options
  );
}

function loadConfig() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.config) || "{}");
    const config = {
      ...DEFAULT_CONFIG,
      ...raw,
      llmMaxTokens: Number(raw.llmMaxTokens) || DEFAULT_CONFIG.llmMaxTokens,
      llmTemperature:
        raw.llmTemperature !== undefined
          ? Number(raw.llmTemperature)
          : DEFAULT_CONFIG.llmTemperature,
      chunkMs: Number(raw.chunkMs) || DEFAULT_CONFIG.chunkMs
    };

    if (config.asrBaseUrl === "https://api.openai.com") {
      config.asrBaseUrl = DEFAULT_CONFIG.asrBaseUrl;
    }

    if (config.llmBaseUrl === "https://api.openai.com") {
      config.llmBaseUrl = DEFAULT_CONFIG.llmBaseUrl;
    }

    if (!String(raw.llmModel || "").trim() || String(raw.llmModel).trim() === "gpt-5.5") {
      config.llmModel = DEFAULT_CONFIG.llmModel;
    }

    config.video2docWhisperModel = normalizeKnowledgeTranscriptionModel(
      config.video2docWhisperModel
    );

    return config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  window.localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(state.config));
}

function loadWorkspacePrefs() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.prefs) || "{}");
  } catch {
    return {};
  }
}

function saveWorkspacePrefs() {
  window.localStorage.setItem(
    STORAGE_KEYS.prefs,
      JSON.stringify({
        audioSource: state.audioSource,
        liveWhisperModel: state.liveWhisperModel,
        meetingTitle: state.meetingTitle,
        summaryTemplate: state.summaryTemplate,
        transcriptionLanguage: state.transcriptionLanguage
      })
  );
}

function loadHistory() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.history) || "[]");
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((record) => ({
      ...record,
      todoStates: normalizeTodoStates(record?.todoStates)
    }));
  } catch {
    return [];
  }
}

function saveHistory() {
  window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function buildDefaultChatbotState() {
  return {
    draft: "",
    errorMessage: "",
    framework: "AgentScope",
    isSending: false,
    isSyncingHealth: false,
    knowledgeRetrieval: false,
    lastHealthCheckAt: "",
    providerLabel: "",
    selectedSessionId: "",
    serviceStatus: "idle",
    sessions: []
  };
}

function normalizeKnowledgeCitationHit(hit) {
  const text = String(hit?.text || "").trim();
  if (!text) {
    return null;
  }

  return {
    chunkId: String(hit?.chunkId || "").trim(),
    docId: String(hit?.docId || "").trim(),
    end: Number(hit?.end) || 0,
    language: String(hit?.language || "auto").trim() || "auto",
    markdownPath: String(hit?.markdownPath || "").trim(),
    model: String(hit?.model || "").trim(),
    score: Number(hit?.score) || 0,
    sourcePath: String(hit?.sourcePath || "").trim(),
    start: Number(hit?.start) || 0,
    text,
    videoName: String(hit?.videoName || "").trim()
  };
}

function normalizeChatbotCitations(citations) {
  const hits = Array.isArray(citations?.hits)
    ? citations.hits.map(normalizeKnowledgeCitationHit).filter(Boolean)
    : [];
  const error = String(citations?.error || "").trim();
  const requested = Boolean(citations?.requested || hits.length || error);

  if (!requested) {
    return null;
  }

  return {
    error,
    hits,
    requested
  };
}

function normalizeChatbotMessage(message) {
  const content = String(message?.content || "").trim();
  if (!content) {
    return null;
  }

  return {
    content,
    citations: normalizeChatbotCitations(message?.citations),
    createdAt: String(message?.createdAt || new Date().toISOString()),
    id: String(message?.id || crypto.randomUUID()),
    role: message?.role === "assistant" ? "assistant" : "user"
  };
}

function normalizeChatbotSession(session) {
  const normalizedMessages = Array.isArray(session?.messages)
    ? session.messages.map(normalizeChatbotMessage).filter(Boolean)
    : [];

  return {
    createdAt: String(session?.createdAt || new Date().toISOString()),
    hasRemoteState: Boolean(session?.hasRemoteState),
    id: String(session?.id || crypto.randomUUID()),
    messages: normalizedMessages,
    title: String(session?.title || "").trim() || "\u65b0\u5bf9\u8bdd",
    updatedAt: String(
      session?.updatedAt ||
        normalizedMessages[normalizedMessages.length - 1]?.createdAt ||
        session?.createdAt ||
        new Date().toISOString()
    )
  };
}

function loadChatbotState() {
  const baseState = buildDefaultChatbotState();

  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.chatbot) || "{}");
    const sessions = Array.isArray(raw?.sessions)
      ? raw.sessions.map(normalizeChatbotSession).filter(Boolean)
      : [];
    const selectedSessionId = sessions.some((session) => session.id === raw?.selectedSessionId)
      ? String(raw.selectedSessionId)
      : sessions[0]?.id || "";

    return {
      ...baseState,
      draft: String(raw?.draft || ""),
      knowledgeRetrieval: Boolean(raw?.knowledgeRetrieval),
      selectedSessionId,
      sessions
    };
  } catch {
    return baseState;
  }
}

function saveChatbotState() {
  window.localStorage.setItem(
    STORAGE_KEYS.chatbot,
    JSON.stringify({
      draft: state.chatbot.draft,
      knowledgeRetrieval: state.chatbot.knowledgeRetrieval,
      selectedSessionId: state.chatbot.selectedSessionId,
      sessions: state.chatbot.sessions
    })
  );
}

function sortedChatbotSessions() {
  return [...state.chatbot.sessions].sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
  );
}

function chatbotSessionById(sessionId) {
  return state.chatbot.sessions.find((session) => session.id === sessionId) || null;
}

function selectedChatbotSession() {
  return chatbotSessionById(state.chatbot.selectedSessionId);
}

function selectChatbotSession(sessionId) {
  if (!chatbotSessionById(sessionId)) {
    return;
  }

  state.chatbot.selectedSessionId = sessionId;
  state.chatbot.errorMessage = "";
  saveChatbotState();
}

function buildChatbotSessionTitle(message) {
  const normalized = String(message || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "\u65b0\u5bf9\u8bdd";
  }

  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

function createChatbotSession(initialTitle = "") {
  const now = new Date().toISOString();
  const session = normalizeChatbotSession({
    createdAt: now,
    id: crypto.randomUUID(),
    title: buildChatbotSessionTitle(initialTitle),
    updatedAt: now
  });

  state.chatbot.sessions = [session, ...state.chatbot.sessions.filter((item) => item.id !== session.id)];
  state.chatbot.selectedSessionId = session.id;
  state.chatbot.errorMessage = "";
  saveChatbotState();
  return session;
}

function upsertChatbotSession(nextSession) {
  const normalized = normalizeChatbotSession(nextSession);
  const remaining = state.chatbot.sessions.filter((session) => session.id !== normalized.id);
  state.chatbot.sessions = [normalized, ...remaining];
  state.chatbot.selectedSessionId = normalized.id;
  saveChatbotState();
  return normalized;
}

function removeChatbotSessionFromState(sessionId) {
  state.chatbot.sessions = state.chatbot.sessions.filter((session) => session.id !== sessionId);

  if (state.chatbot.selectedSessionId === sessionId) {
    state.chatbot.selectedSessionId = sortedChatbotSessions()[0]?.id || "";
  }

  saveChatbotState();
}

function formatChatbotText(content) {
  return escapeHtml(content).replaceAll("\n", "<br />");
}

function formatKnowledgeCitationTimestamp(start, end) {
  const normalize = (value) => {
    const safe = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return `${normalize(start)} → ${normalize(end)}`;
}

function renderChatbotKnowledgeCitations(message) {
  if (message.role !== "assistant" || !message.citations?.requested) {
    return "";
  }

  if (message.citations.error) {
    return `
      <div class="chatbot-knowledge-context">
        <span class="tiny-chip warning">知识检索失败</span>
        <p>${escapeHtml(message.citations.error)}</p>
      </div>
    `;
  }

  if (!message.citations.hits.length) {
    return `
      <div class="chatbot-knowledge-context">
        <span class="tiny-chip neutral">知识来源</span>
        <p>未找到匹配的本地知识片段。</p>
      </div>
    `;
  }

  const items = message.citations.hits
    .map(
      (hit) => `
        <li class="chatbot-knowledge-hit">
          <strong>${escapeHtml(hit.videoName || hit.docId || "未命名知识")}</strong>
          <span>${escapeHtml(formatKnowledgeCitationTimestamp(hit.start, hit.end))}</span>
          <span>${escapeHtml(hit.sourcePath || hit.markdownPath || "未知来源")}</span>
          <span>相关度 ${escapeHtml(`${Math.round(hit.score * 100)}%`)}</span>
          <p>${escapeHtml(hit.text)}</p>
        </li>
      `
    )
    .join("");

  return `
    <div class="chatbot-knowledge-context">
      <span class="tiny-chip neutral">知识来源</span>
      <ul class="chatbot-knowledge-list">${items}</ul>
    </div>
  `;
}

function formatChatbotMoment(isoString) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(isoString));
}

function deriveChatbotStatusMeta() {
  if (state.chatbot.serviceStatus === "ready") {
    return {
      className: "ready",
      detail: state.chatbot.providerLabel || state.chatbot.framework || "AgentScope",
      text: "\u5df2\u8fde\u63a5"
    };
  }

  if (state.chatbot.serviceStatus === "checking") {
    return {
      className: "warning",
      detail: "\u6b63\u5728\u8fde\u63a5",
      text: "\u68c0\u6d4b\u4e2d"
    };
  }

  if (state.chatbot.serviceStatus === "error") {
    return {
      className: "error",
      detail: "\u670d\u52a1\u8fde\u63a5\u5f02\u5e38",
      text: "\u5f02\u5e38"
    };
  }

  return {
    className: "",
    detail: "\u7b49\u5f85\u670d\u52a1\u8fde\u63a5",
    text: "\u672a\u68c0\u6d4b"
  };
}

async function syncChatbotHealth(force = false) {
  if (typeof runtimeApi.chatbotHealth !== "function" || state.chatbot.isSyncingHealth) {
    return;
  }

  const lastCheckedAt = state.chatbot.lastHealthCheckAt
    ? Date.parse(state.chatbot.lastHealthCheckAt)
    : 0;
  if (
    !force &&
    state.chatbot.serviceStatus === "ready" &&
    Number.isFinite(lastCheckedAt) &&
    Date.now() - lastCheckedAt < 60000
  ) {
    return;
  }

  state.chatbot.isSyncingHealth = true;
  if (state.chatbot.serviceStatus !== "ready") {
    state.chatbot.serviceStatus = "checking";
  }
  renderDashboard();

  try {
    const result = await runtimeApi.chatbotHealth();
    state.chatbot.errorMessage = "";
    state.chatbot.framework = String(result?.framework || "AgentScope").trim() || "AgentScope";
    state.chatbot.lastHealthCheckAt = new Date().toISOString();
    state.chatbot.serviceStatus = "ready";
  } catch (error) {
    state.chatbot.errorMessage =
      error instanceof Error ? error.message : String(error || "ChatBot service is unavailable.");
    state.chatbot.serviceStatus = "error";
  } finally {
    state.chatbot.isSyncingHealth = false;
    renderDashboard();
  }
}

function renderChatbotCard() {
  if (
    !elements.dashboardChatbotMessages ||
    !elements.dashboardChatbotSessions ||
    !elements.dashboardChatbotStatus
  ) {
    return;
  }

  const statusMeta = deriveChatbotStatusMeta();
  const sessions = sortedChatbotSessions();
  const session = selectedChatbotSession();
  const messages = session?.messages || [];

  elements.dashboardChatbotStatus.className = statusMeta.className ? `tiny-chip ${statusMeta.className}` : "tiny-chip";
  elements.dashboardChatbotStatus.textContent = statusMeta.text;

  if (elements.dashboardChatbotServiceMeta) {
    let serviceMetaText = statusMeta.detail;
    if (state.chatbot.lastHealthCheckAt) {
      serviceMetaText += ` \u00b7 ${formatChatbotMoment(state.chatbot.lastHealthCheckAt)}`;
    }

    elements.dashboardChatbotServiceMeta.textContent = serviceMetaText;
  }

  if (elements.dashboardChatbotError) {
    elements.dashboardChatbotError.textContent =
      state.chatbot.serviceStatus === "error" ? state.chatbot.errorMessage : "";
  }

  if (elements.dashboardChatbotDraft) {
    elements.dashboardChatbotDraft.value = state.chatbot.draft;
    elements.dashboardChatbotDraft.disabled = state.chatbot.isSending;
  }

  if (elements.dashboardChatbotKnowledgeToggle) {
    elements.dashboardChatbotKnowledgeToggle.checked = Boolean(state.chatbot.knowledgeRetrieval);
    elements.dashboardChatbotKnowledgeToggle.disabled = state.chatbot.isSending;
  }

  if (elements.dashboardChatbotSendBtn) {
    elements.dashboardChatbotSendBtn.disabled =
      state.chatbot.isSending || !String(state.chatbot.draft || "").trim();
    elements.dashboardChatbotSendBtn.textContent =
      state.chatbot.isSending ? "\u53d1\u9001\u4e2d" : "\u53d1\u9001";
  }

  if (elements.dashboardChatbotNewBtn) {
    elements.dashboardChatbotNewBtn.disabled = state.chatbot.isSending;
  }

  if (elements.dashboardChatbotDeleteBtn) {
    elements.dashboardChatbotDeleteBtn.disabled = state.chatbot.isSending || !session;
  }

  if (!sessions.length) {
    elements.dashboardChatbotSessions.innerHTML = `
      <div class="chatbot-empty">
        \u6682\u65e0\u5bf9\u8bdd
      </div>
    `;
  } else {
    elements.dashboardChatbotSessions.innerHTML = sessions
      .map(
        (item) => `
          <button
            class="chatbot-session-item ${item.id === state.chatbot.selectedSessionId ? "active" : ""}"
            data-chatbot-session="${escapeHtml(item.id)}"
            type="button"
          >
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(formatChatbotMoment(item.updatedAt))}</span>
          </button>
        `
      )
      .join("");
  }

  if (!session) {
    elements.dashboardChatbotMessages.innerHTML = `
      <div class="chatbot-empty">
        \u65b0\u5efa\u5bf9\u8bdd\u540e\u5f00\u59cb\u63d0\u95ee
      </div>
    `;
    return;
  }

  if (!messages.length) {
    elements.dashboardChatbotMessages.innerHTML = `
      <div class="chatbot-empty">
        \u8f93\u5165\u95ee\u9898\u5373\u53ef\u5f00\u59cb
      </div>
    `;
    return;
  }

  elements.dashboardChatbotMessages.innerHTML = messages
    .map(
      (message) => `
        <article class="chatbot-message ${message.role}">
          <span class="chatbot-message-meta">
            <strong class="chatbot-message-author">${message.role === "assistant" ? "Memory AI" : "\u4f60"}</strong>
            <time class="chatbot-message-time" datetime="${escapeHtml(String(message.createdAt || ""))}">
              ${escapeHtml(formatChatbotMoment(message.createdAt))}
            </time>
          </span>
          <div class="chatbot-bubble">${formatChatbotText(message.content)}</div>
          ${renderChatbotKnowledgeCitations(message)}
        </article>
      `
    )
    .join("");

  elements.dashboardChatbotMessages.scrollTop =
    elements.dashboardChatbotMessages.scrollHeight;
}

async function submitChatbotDraft() {
  const draft = String(state.chatbot.draft || "").trim();
  if (!draft || state.chatbot.isSending) {
    return;
  }

  let session = selectedChatbotSession() || createChatbotSession(draft);
  const now = new Date().toISOString();
  const userMessage = normalizeChatbotMessage({
    content: draft,
    createdAt: now,
    id: crypto.randomUUID(),
    role: "user"
  });

  session = upsertChatbotSession({
    ...session,
    messages: [...session.messages, userMessage],
    title:
      !String(session.title || "").trim() || session.title === "\u65b0\u5bf9\u8bdd"
        ? buildChatbotSessionTitle(draft)
        : session.title,
    updatedAt: now
  });

  state.chatbot.draft = "";
  state.chatbot.errorMessage = "";
  state.chatbot.isSending = true;
  if (state.chatbot.serviceStatus !== "ready") {
    state.chatbot.serviceStatus = "checking";
  }
  saveChatbotState();
  renderDashboard();

  try {
    const result = await runtimeApi.chatbotSendMessage({
      config: state.config,
      knowledgeRetrieval: state.chatbot.knowledgeRetrieval,
      knowledgeTopK: 3,
      message: draft,
      sessionId: session.id
    });
    const replyText = String(result?.reply || "").trim();
    if (!replyText) {
      throw new Error("ChatBot returned an empty reply.");
    }

    const freshSession = chatbotSessionById(session.id) || session;
    upsertChatbotSession({
      ...freshSession,
      hasRemoteState: true,
      messages: [
        ...freshSession.messages,
        normalizeChatbotMessage({
          content: replyText,
          createdAt: new Date().toISOString(),
          id: crypto.randomUUID(),
          citations: state.chatbot.knowledgeRetrieval
            ? {
                error: String(result?.knowledgeError || "").trim(),
                hits: Array.isArray(result?.knowledgeUsed) ? result.knowledgeUsed : [],
                requested: true
              }
            : null,
          role: "assistant"
        })
      ],
      updatedAt: new Date().toISOString()
    });

    state.chatbot.errorMessage = "";
    state.chatbot.lastHealthCheckAt = new Date().toISOString();
    state.chatbot.providerLabel =
      String(result?.providerLabel || result?.model || "").trim() || "AgentScope";
    state.chatbot.serviceStatus = "ready";
  } catch (error) {
    state.chatbot.errorMessage =
      error instanceof Error ? error.message : String(error || "ChatBot request failed.");
    state.chatbot.serviceStatus = "error";
  } finally {
    state.chatbot.isSending = false;
    renderDashboard();
  }
}

async function deleteSelectedChatbotSession() {
  const session = selectedChatbotSession();
  if (!session || state.chatbot.isSending) {
    return;
  }

  const sessionTitle =
    String(session.title || "\u672a\u547d\u540d\u5bf9\u8bdd").trim() ||
    "\u672a\u547d\u540d\u5bf9\u8bdd";
  const confirmed = window.confirm(
    `\u786e\u5b9a\u5220\u9664\u5bf9\u8bdd\u201c${sessionTitle}\u201d\uff1f\u5220\u9664\u540e\u5c06\u65e0\u6cd5\u6062\u590d\u3002`
  );
  if (!confirmed) {
    return;
  }

  removeChatbotSessionFromState(session.id);
  renderDashboard();

  if (!session.hasRemoteState || typeof runtimeApi.chatbotDeleteSession !== "function") {
    return;
  }

  try {
    await runtimeApi.chatbotDeleteSession({ sessionId: session.id });
  } catch (error) {
    state.chatbot.errorMessage =
      error instanceof Error
        ? error.message
        : String(error || "Local chat was deleted, but remote session cleanup failed.");
    state.chatbot.serviceStatus = "error";
    renderDashboard();
  }
}

function buildDefaultTitle(index = 1) {
  return `\u672a\u547d\u540d\u5f55\u5236 ${Math.max(1, Number(index) || 1)}`;
}

function isAutoGeneratedRecordingTitle(title) {
  const normalized = String(title || "").trim();
  if (!normalized) {
    return false;
  }

  return (
    /^\u672a\u547d\u540d\u5f55\u5236(?:\s+\d+)?$/.test(normalized) ||
    /^\u672a\u547d\u540d\u5f55\u5236\s+\d{1,2}\/\d{1,2}\s+\d{2}:\d{2}$/.test(normalized)
  );
}

function deriveNextUntitledRecordingIndex(records) {
  const maxIndex = (Array.isArray(records) ? records : []).reduce((largest, record) => {
    const match = String(record?.title || "")
      .trim()
      .match(/^\u672a\u547d\u540d\u5f55\u5236\s+(\d+)$/);
    const value = Number(match?.[1] || 0);
    return Number.isFinite(value) && value > largest ? value : largest;
  }, 0);

  return maxIndex + 1;
}

function resolveInitialMeetingTitle(preferredTitle, fallbackIndex) {
  const normalized = String(preferredTitle || "").trim();
  if (!normalized || isAutoGeneratedRecordingTitle(normalized)) {
    return buildDefaultTitle(fallbackIndex);
  }

  return normalized;
}

function resolveDraftFallbackTitle() {
  return buildDefaultTitle(state.currentUntitledRecordingIndex || state.nextUntitledRecordingIndex || 1);
}

function assignNextUntitledTitle() {
  const nextIndex = Math.max(1, Number(state.nextUntitledRecordingIndex) || 1);
  state.currentUntitledRecordingIndex = nextIndex;
  state.nextUntitledRecordingIndex = nextIndex + 1;
  state.meetingTitle = buildDefaultTitle(nextIndex);
}

function selectedRecord() {
  return state.history.find((item) => item.id === state.selectedRecordId) || null;
}

function audioSourceLabelFor(source) {
  if (source === "mic") {
    return "\u9ea6\u514b\u98ce";
  }

  if (source === "both") {
    return "\u7cfb\u7edf + \u9ea6\u514b\u98ce";
  }

  return "\u7cfb\u7edf\u97f3\u9891";
}

function transcriptionLanguageLabelFor(language) {
  if (language === "zh") {
    return "\u4e2d\u6587";
  }

  if (language === "en") {
    return "\u82f1\u6587";
  }

  if (language === "mixed") {
    return "\u4e2d\u82f1\u6df7\u5408";
  }

  return "\u81ea\u52a8\u68c0\u6d4b";
}

function summaryTemplateLabelFor(template) {
  if (template === "learning") {
    return "\u8bfe\u7a0b\u7b14\u8bb0";
  }

  if (template === "interview") {
    return "\u91c7\u8bbf\u603b\u7ed3";
  }

  if (template === "sales") {
    return "\u9500\u552e\u53d1\u73b0";
  }

  if (template === "custom") {
    return "\u81ea\u5b9a\u4e49\u6a21\u677f";
  }

  return "\u4f1a\u8bae\u603b\u7ed3";
}

function templateToRecordMode(template) {
  return template === "learning" ? "video" : "meeting";
}

function historyRecordTranscript(record) {
  if (!record) {
    return "";
  }

  if (Array.isArray(record.transcript)) {
    return record.transcript
      .map((item) => item.text || "")
      .filter(Boolean)
      .join("\n");
  }

  return String(record.transcript || "");
}

function historyRecordTranscriptForSummary(record) {
  if (!record) {
    return "";
  }

  const detailedTranscript = detailTranscriptEntries(record)
    .map((entry) => {
      const text = String(entry.text || "").trim();
      if (!text) {
        return "";
      }

      const prefix = [];
      const timeLabel = String(entry.time || "").trim();
      const speakerLabel = String(entry.speaker || "").trim();

      if (timeLabel) {
        prefix.push(`[${timeLabel}]`);
      }

      if (speakerLabel) {
        prefix.push(`${speakerLabel}:`);
      }

      return [...prefix, text].join(" ").trim();
    })
    .filter(Boolean)
    .join("\n");

  return detailedTranscript || historyRecordTranscript(record);
}

function normalizeAiSections(aiSections) {
  return {
    ...EMPTY_AI_SECTIONS(),
    ...(aiSections || {})
  };
}

function hasAiSectionsContent(aiSections) {
  const sections = normalizeAiSections(aiSections);
  return Boolean(
    String(sections.raw || "").trim() ||
      String(sections.summary || "").trim() ||
      String(sections.minutes || "").trim() ||
      String(sections.tasks || "").trim() ||
      String(sections.risks || "").trim()
  );
}

function normalizeSectionHeading(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/^\d+\s*[.)\u3001-]?\s*/, "")
    .replace(/[【】（）《》]/g, " ")
    .replace(/[`*_#>|:：()[\]{}<>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarySectionLabelsForTemplate(template) {
  if (template === "learning") {
    return {
      summary: "\u5f53\u524d\u603b\u7ed3",
      minutes: "\u5185\u5bb9\u7b14\u8bb0",
      tasks: "\u91cd\u70b9\u56de\u987e",
      risks: "\u98ce\u9669\u4e0e\u5f85\u786e\u8ba4"
    };
  }

  if (template === "interview") {
    return {
      summary: "\u5f53\u524d\u603b\u7ed3",
      minutes: "\u8bbf\u8c08\u8981\u70b9",
      tasks: "\u540e\u7eed\u52a8\u4f5c",
      risks: "\u5f85\u786e\u8ba4\u95ee\u9898"
    };
  }

  if (template === "sales") {
    return {
      summary: "\u5f53\u524d\u603b\u7ed3",
      minutes: "\u9500\u552e\u8981\u70b9",
      tasks: "\u4e0b\u4e00\u6b65\u52a8\u4f5c",
      risks: "\u98ce\u9669\u4e0e\u963b\u585e"
    };
  }

  if (template === "custom") {
    return {
      summary: "\u5f53\u524d\u603b\u7ed3",
      minutes: "\u4e3b\u8981\u5185\u5bb9",
      tasks: "\u884c\u52a8\u9879",
      risks: "\u98ce\u9669\u4e0e\u5f85\u786e\u8ba4"
    };
  }

  return {
    summary: "\u5f53\u524d\u603b\u7ed3",
    minutes: "\u4f1a\u8bae\u7eaa\u8981",
    tasks: "\u5f85\u529e\u4e8b\u9879",
    risks: "\u98ce\u9669\u4e0e\u5f85\u786e\u8ba4"
  };
}

function headingAliasesForTemplate(template) {
  const shared = {
    summary: [
      "\u5f53\u524d\u603b\u7ed3",
      "\u6458\u8981",
      "\u603b\u7ed3",
      "\u603b\u89c8",
      "\u6982\u89c8",
      "\u6982\u8ff0",
      "summary",
      "overview",
      "executive summary",
      "highlights",
      "key points"
    ],
    risks: [
      "\u98ce\u9669\u4e0e\u5f85\u786e\u8ba4",
      "\u98ce\u9669",
      "\u5f85\u786e\u8ba4",
      "\u5f85\u6f84\u6e05",
      "\u5f85\u786e\u8ba4\u95ee\u9898",
      "\u4e0d\u786e\u5b9a\u9879",
      "\u672a\u51b3\u95ee\u9898",
      "risks",
      "risk",
      "open questions",
      "uncertainties",
      "uncertain items"
    ]
  };

  if (template === "learning") {
    return {
      ...shared,
      minutes: [
        "\u5185\u5bb9\u7b14\u8bb0",
        "\u8bfe\u7a0b\u7b14\u8bb0",
        "\u5b66\u4e60\u7b14\u8bb0",
        "\u7b14\u8bb0",
        "notes",
        "content notes",
        "study notes"
      ],
      tasks: [
        "\u91cd\u70b9\u56de\u987e",
        "\u590d\u4e60\u5efa\u8bae",
        "\u590d\u76d8\u5efa\u8bae",
        "\u5b66\u4e60\u884c\u52a8",
        "\u540e\u7eed\u7ec3\u4e60",
        "review points",
        "review",
        "next steps",
        "practice"
      ]
    };
  }

  if (template === "interview") {
    return {
      ...shared,
      minutes: [
        "\u7528\u6237\u80cc\u666f",
        "\u6838\u5fc3\u9700\u6c42",
        "\u4e3b\u8981\u75db\u70b9",
        "\u539f\u8bdd\u6458\u5f55",
        "\u4ea7\u54c1\u673a\u4f1a",
        "\u8bbf\u8c08\u8981\u70b9",
        "\u8bbf\u8c08\u7eaa\u8981",
        "interview notes",
        "background",
        "needs",
        "pain points",
        "quotes",
        "product opportunities"
      ],
      tasks: [
        "\u540e\u7eed\u52a8\u4f5c",
        "\u4e0b\u4e00\u6b65\u52a8\u4f5c",
        "\u884c\u52a8\u5efa\u8bae",
        "\u8ddf\u8fdb\u52a8\u4f5c",
        "action items",
        "next steps",
        "follow-up actions"
      ]
    };
  }

  if (template === "sales") {
    return {
      ...shared,
      minutes: [
        "\u5ba2\u6237\u80cc\u666f",
        "\u6838\u5fc3\u9700\u6c42",
        "\u4e3b\u8981\u5f02\u8bae",
        "\u8ddf\u8fdb\u5efa\u8bae",
        "\u9500\u552e\u8981\u70b9",
        "\u6c9f\u901a\u7eaa\u8981",
        "sales notes",
        "background",
        "needs",
        "objections",
        "follow-up suggestions"
      ],
      tasks: [
        "\u4e0b\u4e00\u6b65\u52a8\u4f5c",
        "\u884c\u52a8\u8ba1\u5212",
        "\u8ddf\u8fdb\u52a8\u4f5c",
        "action items",
        "action plan",
        "next steps",
        "follow-up actions"
      ]
    };
  }

  if (template === "custom") {
    return {
      ...shared,
      minutes: [
        "\u4e3b\u8981\u5185\u5bb9",
        "\u6838\u5fc3\u5185\u5bb9",
        "\u8be6\u7ec6\u8bf4\u660e",
        "content",
        "details",
        "notes"
      ],
      tasks: [
        "\u884c\u52a8\u9879",
        "\u5f85\u529e\u4e8b\u9879",
        "\u4e0b\u4e00\u6b65",
        "tasks",
        "action items",
        "next steps"
      ]
    };
  }

  return {
    ...shared,
    minutes: [
      "\u4f1a\u8bae\u7eaa\u8981",
      "\u7eaa\u8981",
      "\u8ba8\u8bba\u7eaa\u8981",
      "\u4f1a\u8bae\u5185\u5bb9",
      "minutes",
      "meeting notes",
      "discussion notes"
    ],
    tasks: [
      "\u5f85\u529e\u4e8b\u9879",
      "\u884c\u52a8\u9879",
      "\u540e\u7eed\u52a8\u4f5c",
      "\u4e0b\u4e00\u6b65\u52a8\u4f5c",
      "tasks",
      "action items",
      "next steps",
      "follow-up actions"
    ]
  };
}

function mergeParsedSectionEntries(entries, primaryTitle = "") {
  if (!entries.length) {
    return "";
  }

  if (entries.length === 1) {
    const entry = entries[0];
    const title = String(entry.title || "").trim();
    if (!title || normalizeSectionHeading(title) === normalizeSectionHeading(primaryTitle)) {
      return entry.content;
    }

    return `### ${title}\n\n${entry.content}`.trim();
  }

  return entries
    .map((entry) => {
      const title = String(entry.title || "").trim();
      if (!title) {
        return entry.content;
      }

      return `### ${title}\n\n${entry.content}`.trim();
    })
    .join("\n\n")
    .trim();
}

function parseSectionsByHeadings(raw, template) {
  const markdown = String(raw || "").trim();
  const blocks = markdownBlocks(markdown);
  if (!blocks.length) {
    return null;
  }

  const aliases = headingAliasesForTemplate(template);
  const labels = summarySectionLabelsForTemplate(template);
  const aliasToKey = new Map();

  Object.entries(aliases).forEach(([key, titles]) => {
    titles.forEach((title) => {
      const normalized = normalizeSectionHeading(title);
      if (normalized && !aliasToKey.has(normalized)) {
        aliasToKey.set(normalized, key);
      }
    });
  });

  const buckets = {
    summary: [],
    minutes: [],
    tasks: [],
    risks: []
  };
  const unmatched = [];
  let matchedCount = 0;

  blocks.forEach((block) => {
    const title = String(block.title || "").trim();
    const content = String(block.content || "").trim();
    if (!content) {
      return;
    }

    const key = aliasToKey.get(normalizeSectionHeading(title));
    if (key) {
      matchedCount += 1;
      buckets[key].push({ title, content });
      return;
    }

    unmatched.push({ title, content });
  });

  if (!matchedCount) {
    return null;
  }

  if (unmatched.length) {
    buckets.minutes.push(...unmatched);
  }

  const sections = EMPTY_AI_SECTIONS();
  sections.raw = markdown;
  sections.summary = mergeParsedSectionEntries(buckets.summary, labels.summary);
  sections.minutes = mergeParsedSectionEntries(buckets.minutes, labels.minutes);
  sections.tasks = mergeParsedSectionEntries(buckets.tasks, labels.tasks);
  sections.risks = mergeParsedSectionEntries(buckets.risks, labels.risks);
  return sections;
}

function buildStructuredSummaryMarkdown(aiSections, summaryTemplate) {
  const sections = normalizeAiSections(aiSections);
  const labels = summarySectionLabelsForTemplate(summaryTemplate);
  const blocks = [];

  if (String(sections.summary || "").trim()) {
    blocks.push(`## ${labels.summary}`, "", String(sections.summary).trim());
  }

  if (String(sections.minutes || "").trim()) {
    blocks.push(`## ${labels.minutes}`, "", String(sections.minutes).trim());
  }

  if (String(sections.tasks || "").trim()) {
    blocks.push(`## ${labels.tasks}`, "", String(sections.tasks).trim());
  }

  if (String(sections.risks || "").trim()) {
    blocks.push(`## ${labels.risks}`, "", String(sections.risks).trim());
  }

  if (!blocks.length) {
    return String(sections.raw || "").trim();
  }

  return blocks.join("\n");
}

function normalizeTodoStates(todoStates) {
  if (!todoStates || typeof todoStates !== "object") {
    return {};
  }

  return Object.entries(todoStates).reduce((acc, [key, value]) => {
    if (key && value) {
      acc[String(key)] = true;
    }
    return acc;
  }, {});
}

function todoTaskKey(taskText) {
  return String(taskText || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatShortDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(isoString));
}

function formatDashboardDate(isoString) {
  if (!isoString) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoString));
}

function formatDashboardDuration(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);

  if (!safeMs) {
    return "0 \u5206\u949f";
  }

  const totalMinutes = Math.round(safeMs / 60000);
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} \u5206\u949f`;
  }

  const hours = safeMs / 3600000;
  const precision = hours >= 10 ? 0 : 1;
  return `${hours.toFixed(precision)} \u5c0f\u65f6`;
}

function formatClock(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

function formatSegmentTimestamp(segment) {
  if (Number.isFinite(segment?.elapsedMs)) {
    return formatDuration(segment.elapsedMs);
  }

  return formatClock(segment?.createdAt);
}

function defaultSpeakerLabel(index, source = state.audioSource) {
  if (source === "mic") {
    return "You";
  }

  if (source === "both") {
    return index % 2 === 0 ? "Speaker 1" : "Speaker 2";
  }

  return "System Audio";
}

function buildTranscriptText() {
  return state.segments
    .map((segment) => `[${formatSegmentTimestamp(segment)}] ${segment.text}`)
    .join("\n");
}

function sanitizeFileName(name) {
  return String(name || "memory").replace(/[\\/:*?"<>|]/g, "-");
}

function filteredHistory() {
  const query = state.historySearch.trim().toLowerCase();
  const sorted = [...state.history].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  if (!query) {
    return sorted;
  }

  return sorted.filter((record) => {
    const haystack = [
      record.title,
      record.summaryTemplate,
      record.transcriptionLanguage,
      record.audioSource,
      historyRecordTranscript(record),
      record.aiSections?.raw
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function notify(message) {
  window.alert(message);
}

function isDesktopRuntime() {
  return Boolean(window.aiNoteApi);
}

function looksLikePermissionDenied(error) {
  const name = String(error?.name || "").trim();
  const message = String(error?.message || error || "").trim();

  return (
    /NotAllowedError|PermissionDeniedError/i.test(name) ||
    /permission denied|permission dismissed|denied by system|user denied|not allowed/i.test(message)
  );
}

function formatCaptureError(error) {
  const message = String(error?.message || error || "").trim();

  if (looksLikePermissionDenied(error)) {
    if (!isDesktopRuntime()) {
      return "\u5f53\u524d\u6d4f\u89c8\u5668\u9884\u89c8\u73af\u5883\u672a\u6388\u4e88\u5c4f\u5e55/\u7cfb\u7edf\u58f0\u97f3\u6743\u9650\u3002\u8bf7\u5728\u5171\u4eab\u5f39\u7a97\u4e2d\u5141\u8bb8\u5e26\u7cfb\u7edf\u97f3\u9891\u7684\u5c4f\u5e55\u6216\u6807\u7b7e\u9875\uff1b\u82e5\u8981\u4e00\u952e\u5f55\u5236\uff0c\u8bf7\u5728 Electron \u684c\u9762\u7248\u4e2d\u4f7f\u7528\u3002";
    }

    return "\u7cfb\u7edf\u58f0\u97f3\u91c7\u96c6\u6743\u9650\u88ab\u62d2\u7edd\u3002\u8bf7\u68c0\u67e5\u7cfb\u7edf\u5f55\u5c4f/\u97f3\u9891\u6743\u9650\u540e\u91cd\u8bd5\u3002";
  }

  if (/No system audio detected/i.test(message)) {
    return "\u6ca1\u6709\u68c0\u6d4b\u5230\u7f51\u7ad9/\u7cfb\u7edf\u97f3\u8f68\u3002\u8bf7\u9009\u62e9\u5e26\u201c\u5171\u4eab\u6807\u7b7e\u9875\u97f3\u9891\u201d\u6216\u201c\u5171\u4eab\u7cfb\u7edf\u97f3\u9891\u201d\u7684\u5c4f\u5e55/\u6807\u7b7e\u9875\u540e\u91cd\u8bd5\u3002";
  }

  if (/No audio track is available for recording/i.test(message)) {
    return "\u5f53\u524d\u91c7\u96c6\u6d41\u4e2d\u6ca1\u6709\u53ef\u7528\u97f3\u8f68\uff0c\u65e0\u6cd5\u5f00\u59cb\u5b9e\u65f6\u8f6c\u5199\u3002";
  }

  return message || "\u5f00\u59cb\u5f55\u5236\u5931\u8d25\u3002";
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]'
    )
  );
}

function isRecordShortcut(event) {
  return (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    event.code === "Space"
  );
}

function handleRecordShortcutTrigger() {
  if (
    state.isCapturing ||
    state.isPaused ||
    state.liveTranscriptionStopping ||
    state.captureStartInFlight
  ) {
    return;
  }

  startRecordingFlow();
}

function canCreateNewRecordingDraft() {
  return !(
    state.isCapturing ||
    state.isPaused ||
    state.liveTranscriptionStopping ||
    state.captureStartInFlight ||
    state.pendingTranscriptions > 0
  );
}

function hasCurrentRecordingContent() {
  return Boolean(state.segments.length || state.aiSections.raw.trim());
}

function canDeleteCurrentRecording() {
  return !(
    state.isCapturing ||
    state.isPaused ||
    state.liveTranscriptionStopping ||
    state.captureStartInFlight ||
    state.pendingTranscriptions > 0 ||
    !hasCurrentRecordingContent()
  );
}

function isRecordingTranscriptNearBottom() {
  const stream = elements.recordingTranscript;
  if (!stream) {
    return true;
  }

  const distanceToBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
  return distanceToBottom <= 32;
}

function syncRecordingTranscriptAutoFollow() {
  state.recordingTranscriptAutoFollow = isRecordingTranscriptNearBottom();
}

function toggleRecordingTranscript(forceState) {
  const nextState =
    typeof forceState === "boolean" ? Boolean(forceState) : !state.recordingTranscriptCollapsed;
  state.recordingTranscriptCollapsed = nextState;
  renderRecordingPage();
}

function getLibraryRecordMaxScroll() {
  if (!elements.libraryRecordList) {
    return 0;
  }

  return Math.max(0, elements.libraryRecordList.scrollWidth - elements.libraryRecordList.clientWidth);
}

function syncLibraryRecordSlider() {
  if (!elements.libraryRecordList || !elements.libraryRecordSliderRow || !elements.libraryRecordSlider) {
    return;
  }

  const maxScroll = getLibraryRecordMaxScroll();
  const hasOverflow = maxScroll > 8;
  elements.libraryRecordSliderRow.hidden = !hasOverflow;
  elements.libraryRecordSlider.disabled = !hasOverflow;
  elements.libraryRecordList.classList.toggle("has-overflow", hasOverflow);

  if (!hasOverflow) {
    elements.libraryRecordSlider.value = "0";
    return;
  }

  const nextValue = Math.round((elements.libraryRecordList.scrollLeft / maxScroll) * 100);
  elements.libraryRecordSlider.value = String(nextValue);
}

function setLibraryRecordScrollFromSlider(value) {
  if (!elements.libraryRecordList) {
    return;
  }

  const maxScroll = getLibraryRecordMaxScroll();
  if (!maxScroll) {
    elements.libraryRecordList.scrollLeft = 0;
    return;
  }

  const ratio = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
  elements.libraryRecordList.scrollLeft = ratio * maxScroll;
}

function summarizeTranscriptPreview(transcript) {
  const normalized = String(transcript || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

function createRecordingModuleSnapshot(savedRecord = null) {
  const transcript = buildTranscriptText().trim();
  const hasContent = Boolean(transcript || state.aiSections.raw.trim());

  return {
    id: state.sessionId,
    title: state.meetingTitle.trim() || resolveDraftFallbackTitle(),
    createdAt: state.sessionCreatedAt,
    durationMs: getCurrentDurationMs(),
    segmentCount: state.segments.length,
    summaryTemplate: state.summaryTemplate,
    transcriptionLanguage: state.transcriptionLanguage,
    audioSource: state.audioSource,
    whisperModel: state.liveWhisperModel,
    hasContent,
    historyRecordId: savedRecord?.id || null,
    preview: summarizeTranscriptPreview(transcript)
  };
}

function rememberRecordingModule(snapshot) {
  if (!snapshot?.id) {
    return;
  }

  state.recordingModuleStackItems = [
    snapshot,
    ...state.recordingModuleStackItems.filter((item) => item.id !== snapshot.id)
  ].slice(0, 20);
}


function renderRecordingModuleStack() {
  if (!elements.recordingModuleStack) {
    return;
  }

  const modules = Array.isArray(state.recordingModuleStackItems) ? state.recordingModuleStackItems : [];
  elements.recordingModuleStack.hidden = modules.length === 0;

  if (!modules.length) {
    elements.recordingModuleStack.innerHTML = "";
    return;
  }

  elements.recordingModuleStack.innerHTML = modules
    .map((module) => {
      const title = String(module?.title || "\u672a\u547d\u540d\u8bb0\u5f55").trim() || "\u672a\u547d\u540d\u8bb0\u5f55";
      const metaParts = [];
      if (module?.createdAt) {
        metaParts.push(formatDate(module.createdAt));
      }
      metaParts.push(formatShortDuration(Number(module?.durationMs) || 0));

      const metaLine = metaParts.join(" \u00b7 ");
      const categoryTag = summaryTemplateLabelFor(module?.summaryTemplate || "meeting");
      const preview = summarizeTranscriptPreview(module?.preview || "");
      const openTargetId = String(module?.historyRecordId || module?.id || "").trim();
      const actionButton =
        module?.historyRecordId && openTargetId
          ? `<button class="ghost-action compact-action" type="button" data-open-recording-module="${escapeHtml(
              openTargetId
            )}">\u6253\u5f00\u8be6\u60c5</button>`
          : "";
      const previewMarkup = preview
        ? `<p class="recording-module-card-preview">${escapeHtml(preview)}</p>`
        : "";

      return `
        <article class="recording-module-card">
          <div class="recording-module-card-main">
            <div class="recording-module-card-top">
              <strong>${escapeHtml(title)}</strong>
            </div>
            <p class="recording-module-card-meta">${escapeHtml(metaLine)}</p>
            <div class="recording-module-card-tags">
              <span class="tiny-chip neutral">${escapeHtml(categoryTag)}</span>
            </div>
            ${previewMarkup}
          </div>
          <div class="recording-module-card-side">
            ${actionButton}
          </div>
        </article>
      `;
    })
    .join("");
}

function createNewRecordingDraft() {
  if (!canCreateNewRecordingDraft()) {
    return;
  }

  const savedRecord = persistCurrentSession();
  rememberRecordingModule(createRecordingModuleSnapshot(savedRecord));
  resetLiveSession();
  setPage("recording");
}

function deleteHistoryRecord(recordId) {
  const normalizedId = String(recordId || "").trim();
  if (!normalizedId) {
    return false;
  }

  const nextHistory = state.history.filter((item) => item.id !== normalizedId);
  if (nextHistory.length === state.history.length) {
    return false;
  }

  state.history = nextHistory;
  if (state.selectedRecordId === normalizedId) {
    state.selectedRecordId = null;
  }
  saveHistory();
  return true;
}

function deleteCurrentRecording() {
  if (!canDeleteCurrentRecording()) {
    return;
  }

  if (!window.confirm("\u786e\u5b9a\u5220\u9664\u5f53\u524d\u4f1a\u8bae\u8bb0\u5f55\u5417\uff1f\u5220\u9664\u540e\u5c06\u65e0\u6cd5\u6062\u590d\u3002")) {
    return;
  }

  deleteHistoryRecord(state.sessionId);
  resetLiveSession();
  setPage("recording");
  render();
  notify("\u5f53\u524d\u4f1a\u8bae\u8bb0\u5f55\u5df2\u5220\u9664\u3002");
}

function getCurrentDurationMs() {
  if (state.isCapturing && !state.isPaused && state.recordStartedAt) {
    return state.recordedDurationMs + (Date.now() - state.recordStartedAt);
  }

  return state.recordedDurationMs;
}

function beginDurationTimer() {
  stopDurationTimer();
  state.durationTimerId = window.setInterval(() => {
    renderRecordingPage();
  }, 1000);
}

function stopDurationTimer() {
  if (state.durationTimerId) {
    window.clearInterval(state.durationTimerId);
    state.durationTimerId = null;
  }
}

function resolveAsrLanguageValue() {
  if (state.transcriptionLanguage === "zh") {
    return "zh";
  }

  if (state.transcriptionLanguage === "en") {
    return "en";
  }

  return "";
}

function buildRuntimeConfig() {
  return {
    ...state.config,
    asrLanguage: resolveAsrLanguageValue()
  };
}

function resetLiveTranscriptionState() {
  state.liveChunkSeq = 0;
  state.liveSessionId = "";
  state.liveSourceLabel = "";
  state.liveTranscriptionStopping = false;
}

function shouldSkipLiveChunk() {
  if (state.audioMeterLevel >= LIVE_SILENCE_THRESHOLD || state.audioDetected) {
    return false;
  }

  if (!state.lastAudioActivityAt) {
    return true;
  }

  const lastActivityAt = Date.parse(state.lastAudioActivityAt);
  if (!Number.isFinite(lastActivityAt)) {
    return true;
  }

  return Date.now() - lastActivityAt > LIVE_AUDIO_RECENCY_MS;
}

function startRecordingFlow() {
  if (state.liveTranscriptionStopping) {
    return;
  }

  state.audioSource = "system";
  state.transcriptionLanguage = "auto";
  saveWorkspacePrefs();
  setPage("recording");

  const preparedCapture =
    !isDesktopRuntime() && state.audioSource === "system" && supportsCurrentAudioSource()
      ? buildCaptureResources()
          .then((resources) => ({ ok: true, resources }))
          .catch((error) => ({ ok: false, error }))
      : null;

  void startCapture({ preparedCapture });
}

function video2docLanguageLabelFor(language) {
  if (language === "zh") {
    return "\u4e2d\u6587";
  }

  if (language === "en") {
    return "\u82f1\u6587";
  }

  if (language === "ja") {
    return "\u65e5\u6587";
  }

  if (language === "ko") {
    return "\u97e9\u6587";
  }

  return "\u81ea\u52a8\u68c0\u6d4b";
}

function buildKnowledgeRuntimeConfig() {
  const hotwords = String(state.config.video2docHotwords || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    model: normalizeKnowledgeTranscriptionModel(state.config.video2docWhisperModel),
    language: state.config.video2docLanguage === "auto" ? "" : state.config.video2docLanguage,
    ffmpegPath: String(state.config.video2docFfmpegPath || "").trim(),
    ffprobePath: String(state.config.video2docFfprobePath || "").trim(),
    wordTimestamps: Boolean(state.config.video2docWordTimestamps),
    appendTimeline: Boolean(state.config.video2docAppendTimeline),
    hotwords
  };
}

function parseKnowledgeTimestamp(value) {
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

function formatKnowledgeTimestamp(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeKnowledgeTranscriptEntries(transcript, segments = []) {
  if (Array.isArray(segments) && segments.length) {
    return segments
      .map((segment) => {
        const start = Math.max(0, Number(segment.start) || 0);
        const end = Math.max(start + 0.5, Number(segment.end) || start + 0.5);
        const text = String(segment.text || "").trim();

        return text
          ? {
              end,
              speaker: segment.speaker || "Speaker 1",
              start,
              text,
              time: formatKnowledgeTimestamp(start)
            }
          : null;
      })
      .filter(Boolean);
  }

  const parsed = String(transcript || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[([^\]]+)\]\s*(?:(.+?):\s*)?(.*)$/);
      if (!match) {
        return {
          end: 0,
          speaker: "Speaker 1",
          start: 0,
          text: line,
          time: "--:--"
        };
      }

      const start = parseKnowledgeTimestamp(match[1]);
      return {
        end: start,
        speaker: match[2] || "Speaker 1",
        start,
        text: match[3] || "",
        time: match[1]
      };
    });

  return parsed.map((entry, index) => {
    const nextStart = parsed[index + 1]?.start;
    const fallbackDuration = Math.max(1.5, entry.text.length / 16);
    return {
      ...entry,
      end: nextStart && nextStart > entry.start ? nextStart : entry.start + fallbackDuration
    };
  });
}

function serializeKnowledgeTranscriptEntries(entries) {
  return entries
    .map((entry) => `[${entry.time}] ${entry.speaker}: ${entry.text}`)
    .join("\n");
}

function visibleKnowledgeTranscriptAt(entries, elapsedSeconds) {
  let activeIndex = -1;
  const lines = [];

  entries.forEach((entry, index) => {
    if (elapsedSeconds < entry.start) {
      return;
    }

    if (elapsedSeconds >= entry.end) {
      lines.push(`[${entry.time}] ${entry.speaker}: ${entry.text}`);
      return;
    }

    activeIndex = index;
    const duration = Math.max(0.4, entry.end - entry.start);
    const progress = Math.max(0, Math.min(1, (elapsedSeconds - entry.start) / duration));
    const visibleLength = Math.min(
      entry.text.length,
      Math.max(1, Math.ceil(entry.text.length * progress))
    );
    lines.push(`[${entry.time}] ${entry.speaker}: ${entry.text.slice(0, visibleLength)}`);
  });

  return {
    activeIndex,
    transcript: lines.join("\n")
  };
}

function stopKnowledgeTranscriptAnimation() {
  const timerId = state.knowledge.transcriptAnimation?.timerId;
  if (timerId) {
    window.clearTimeout(timerId);
  }

  state.knowledge.transcriptAnimation = null;
  state.knowledge.transcriptAnimationIndex = -1;
}


function createKnowledgeAbortError() {
  const error = new Error("\u77e5\u8bc6\u8f6c\u5f55\u5df2\u4e2d\u65ad\u3002");
  error.name = "AbortError";
  return error;
}

function isKnowledgeAbortError(error) {
  return error?.name === "AbortError";
}

function isKnowledgeTranscriptionStale(runId) {
  return !runId || state.knowledge.transcriptionRunId !== runId || state.knowledge.stopRequested;
}

function assertKnowledgeTranscriptionActive(runId) {
  if (isKnowledgeTranscriptionStale(runId)) {
    throw createKnowledgeAbortError();
  }
}


function stopKnowledgeTranscription({ silent = false } = {}) {
  const controller = state.knowledge.transcriptionAbortController;

  state.knowledge.stopRequested = true;
  state.knowledge.transcriptionAbortController = null;
  state.knowledge.transcriptionRunId = "";
  state.knowledge.isProcessing = false;

  if (controller && !controller.signal.aborted) {
    controller.abort();
  }

  stopKnowledgeTranscriptAnimation();

  if (!silent) {
    state.knowledge.statusMessage = "\u5df2\u505c\u6b62\u77e5\u8bc6\u8f6c\u5f55\u3002";
    state.knowledge.stepAudio = state.knowledge.videoFile ? "ready" : "neutral";
    state.knowledge.stepAsr = state.knowledge.transcriptPreview ? "warning" : "neutral";
    state.knowledge.stepDoc = state.knowledge.docMarkdown ? "ready" : "neutral";
    renderKnowledgePage();
  }
}

function playKnowledgeTranscriptAnimation({ transcript, segments }) {
  stopKnowledgeTranscriptAnimation();

  const entries = normalizeKnowledgeTranscriptEntries(transcript, segments);
  if (!entries.length) {
    state.knowledge.transcriptPreview = String(transcript || "").trim();
    renderKnowledgePage();
    return Promise.resolve();
  }

  const finalTranscript = serializeKnowledgeTranscriptEntries(entries);
  const duration = Math.max(...entries.map((entry) => entry.end));
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  state.knowledge.transcriptAnimation = {
    entries,
    finalTranscript,
    runId,
    startedAt: performance.now(),
    timerId: null
  };

  return new Promise((resolve) => {
    const tick = () => {
      const animation = state.knowledge.transcriptAnimation;
      if (!animation || animation.runId !== runId) {
        resolve();
        return;
      }

      const elapsedSeconds = (performance.now() - animation.startedAt) / 1000;
      const visible = visibleKnowledgeTranscriptAt(entries, elapsedSeconds);
      state.knowledge.transcriptPreview = visible.transcript;
      state.knowledge.transcriptAnimationIndex = visible.activeIndex;
      renderKnowledgePage();

      if (elapsedSeconds >= duration) {
        state.knowledge.transcriptPreview = finalTranscript;
        state.knowledge.transcriptAnimation = null;
        state.knowledge.transcriptAnimationIndex = -1;
        renderKnowledgePage();
        resolve();
        return;
      }

      animation.timerId = window.setTimeout(tick, KNOWLEDGE_TRANSCRIPT_TICK_MS);
    };

    tick();
  });
}


function deriveTranscriptFromKnowledgeMarkdown(markdown) {
  const raw = String(markdown || "");
  if (!raw.trim()) {
    return "";
  }

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const transcriptLines = [];
  let pendingTime = "";

  for (const line of lines) {
    const timeMatch = line.match(
      /^\*\*\[(\d{2}:\d{2}:\d{2})(?:\s*(?:-|-->|~|～|–|—|至)\s*(\d{2}:\d{2}:\d{2}))?\]\*\*$/
    );

    if (timeMatch) {
      pendingTime = timeMatch[1];
      continue;
    }

    if (
      line.startsWith("#") ||
      line.startsWith(">") ||
      line.startsWith("|") ||
      line === "---" ||
      line.startsWith("##")
    ) {
      continue;
    }

    const timeLabel = pendingTime || "--:--";
    transcriptLines.push(`[${timeLabel}] \u53d1\u8a00 1: ${line}`);
    pendingTime = "";
  }

  return transcriptLines.join("\n");
}

function buildTranscriptionPrompt() {
  const prompt = String(state.config.transcriptionPrompt || "").trim();
  const instructions = [];

  if (prompt) {
    instructions.push(prompt);
  }

  if (state.transcriptionLanguage === "mixed") {
    instructions.push(
      "This audio may contain both Chinese and English. Preserve the original language, names, numbers, and technical terms."
    );
  } else if (state.transcriptionLanguage === "en") {
    instructions.push("Transcribe in English and preserve names, numbers, and technical terms.");
  } else if (state.transcriptionLanguage === "zh") {
    instructions.push("\u8bf7\u4f7f\u7528\u4e2d\u6587\u8f6c\u5199\uff0c\u5c3d\u91cf\u4fdd\u7559\u4e13\u6709\u540d\u8bcd\u3001\u6570\u5b57\u548c\u672f\u8bed\u3002");
  }

  return instructions.join("\n").trim();
}

function buildLiveSourceLabel(modelName) {
  const normalizedModel = String(modelName || "").trim();
  return normalizedModel ? `Built-in Whisper \u00b7 ${normalizedModel}` : "Built-in Whisper";
}

function isOpenRouterBaseUrl(baseUrl) {
  return /(^|\/\/)openrouter\.ai(\/|$)/i.test(String(baseUrl || "").trim());
}

function isOpenRouterWhisperModel(modelName) {
  return OPENROUTER_WHISPER_MODEL_ALIASES.has(String(modelName || "").trim().toLowerCase());
}

function normalizeKnowledgeTranscriptionModel(modelName) {
  const normalized = String(modelName || "").trim();
  return !normalized || normalized === "large" || isOpenRouterWhisperModel(normalized)
    ? DEFAULT_OPENROUTER_TRANSCRIBE_MODEL
    : normalized;
}

function normalizeOpenRouterWhisperModel(modelName) {
  return normalizeKnowledgeTranscriptionModel(modelName);
}

function buildTranscriptionEngineLabel({ baseUrl = "", modelName = "", preferLocalFallback = false } = {}) {
  const normalizedModel = String(modelName || "").trim();
  if (!normalizedModel) {
    return "";
  }

  if (isOpenRouterBaseUrl(baseUrl) || isOpenRouterWhisperModel(normalizedModel)) {
    return `OpenRouter \u00b7 ${normalizeOpenRouterWhisperModel(normalizedModel)}`;
  }

  if (preferLocalFallback) {
    return `Built-in Whisper \u00b7 ${normalizedModel}`;
  }

  return normalizedModel;
}

function derivePreferredAsrLabel() {
  if (state.liveSourceLabel) {
    return state.liveSourceLabel;
  }

  const configuredBaseUrl = state.config.asrBaseUrl || state.config.baseUrl || "";
  const liveModelLabel = buildTranscriptionEngineLabel({
    baseUrl: configuredBaseUrl,
    modelName: state.liveWhisperModel,
    preferLocalFallback: true
  });
  if (liveModelLabel) {
    return liveModelLabel;
  }

  const explicitAsrLabel = buildTranscriptionEngineLabel({
    baseUrl: configuredBaseUrl,
    modelName: state.config.asrModel
  });
  if (explicitAsrLabel) {
    return explicitAsrLabel;
  }

  return buildTranscriptionEngineLabel({
    baseUrl: configuredBaseUrl,
    modelName: state.config.video2docWhisperModel,
    preferLocalFallback: true
  });
}

function deriveKnowledgeTranscriptionLabel() {
  return buildTranscriptionEngineLabel({
    baseUrl: state.config.asrBaseUrl || state.config.baseUrl || "",
    modelName: normalizeKnowledgeTranscriptionModel(state.config.video2docWhisperModel),
    preferLocalFallback: true
  });
}

function deriveKnowledgeSourceLabel() {
  return String(state.knowledge.transcriptionSourceLabel || "").trim() || deriveKnowledgeTranscriptionLabel();
}

function isAsrConfigured() {
  return Boolean(derivePreferredAsrLabel());
}

function isLlmConfigured() {
  return Boolean(state.config.llmBaseUrl && state.config.llmModel);
}

function supportsCurrentAudioSource() {
  if (state.audioSource === "mic") {
    return state.diagnostics.supportsUserMedia;
  }

  if (state.audioSource === "both") {
    return state.diagnostics.supportsDisplayCapture && state.diagnostics.supportsUserMedia;
  }

  return state.diagnostics.supportsDisplayCapture;
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return (
    RECORDER_CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || ""
  );
}

function setPage(page) {
  state.currentPage = page;
  render();
  if (page === "dashboard") {
    void syncChatbotHealth();
  }
}

function deriveDashboardBufferUsage() {
  if (state.isCapturing) {
    return Math.min(100, Math.round(12 + state.pendingTranscriptions * 14 + state.audioMeterLevel * 36));
  }

  return Math.min(100, state.pendingTranscriptions * 16);
}

function deriveEngineState(kind) {
  if (kind === "asr") {
    if (!isAsrConfigured()) {
      return { className: "neutral", text: "UNCONFIGURED" };
    }

    if (state.isCapturing || state.pendingTranscriptions > 0) {
      return { className: "ready", text: "ACTIVE" };
    }

    if (state.testResults.asr.status === "error") {
      return { className: "error", text: "ERROR" };
    }

    return { className: "ready", text: "STABLE" };
  }

  if (!isLlmConfigured()) {
    return { className: "neutral", text: "UNCONFIGURED" };
  }

  if (state.isSummarizing) {
    return { className: "ready", text: "ACTIVE" };
  }

  if (state.testResults.llm.status === "error") {
    return { className: "error", text: "ERROR" };
  }

  return { className: "ready", text: "STABLE" };
}

function deriveRecordingSubtitleLegacy() {
  if (state.isCapturing && !state.isPaused) {
    return `\u76d1\u542c ${audioSourceLabelFor(state.audioSource)} \u00b7 ${transcriptionLanguageLabelFor(
      state.transcriptionLanguage
    )}`;
  }

  if (state.isPaused) {
    return "\u5f55\u5236\u5df2\u6682\u505c\u3002\u968f\u65f6\u51c6\u5907\u7ee7\u7eed\u3002";
  }

  return "\u672c\u5730\u6355\u83b7\u6d41\u6b63\u5728\u5f85\u62bd\u3002";
}

function deriveRecordingSubtitle() {
  if (state.captureStartInFlight) {
    return "\u6b63\u5728\u8bf7\u6c42\u7f51\u7ad9/\u7cfb\u7edf\u97f3\u9891\u6743\u9650\u3002";
  }

  if (state.liveTranscriptionStopping) {
    return "\u6b63\u5728\u6536\u5c3e\u6700\u540e\u4e00\u6bb5\u8f6c\u5199\u3002";
  }

  if (state.isCapturing && !state.isPaused) {
    const sourceLabel = [audioSourceLabelFor(state.audioSource), state.liveSourceLabel]
      .filter(Boolean)
      .join(" \u00b7 ");
    return `\u6b63\u5728\u8f6c\u5199 ${sourceLabel} \u00b7 ${transcriptionLanguageLabelFor(
      state.transcriptionLanguage
    )}`;
  }

  if (state.isPaused) {
    return "\u5f55\u5236\u5df2\u6682\u505c\u3002\u968f\u65f6\u51c6\u5907\u7ee7\u7eed\u3002";
  }

  return `\u70b9\u51fb\u5f00\u59cb\u5f55\u5236\u6216\u6309 ${RECORD_SHORTCUT_LABEL} \u5373\u53ef\u8f6c\u5199\u7f51\u7ad9/\u7cfb\u7edf\u58f0\u97f3\u3002`;
}

function renderNavigation() {
  document.body.dataset.page = state.currentPage;

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === state.currentPage);
  });

  document.querySelectorAll("[data-page-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.pagePanel === state.currentPage);
  });
}

function renderTopbar() {
  elements.pageBreadcrumb.textContent = PAGE_META[state.currentPage];
  elements.globalSearch.value = state.historySearch;
}

function renderDashboard() {
  renderDashboardNotebook();
  renderChatbotCard();
  return;
  const llmState = deriveEngineState("llm");
  const asrState = deriveEngineState("asr");
  const records = filteredHistory().slice(0, 6);
  const bufferUsage = deriveDashboardBufferUsage();
  const asrLabel = derivePreferredAsrLabel();

  elements.dashboardLlmModel.textContent = isLlmConfigured()
    ? state.config.llmModel
    : "LLM \u672a\u914d\u7f6e";
  elements.dashboardAsrModel.textContent = isAsrConfigured()
    ? asrLabel
    : "ASR \u672a\u914d\u7f6e";
  elements.dashboardLlmState.className = `engine-state ${llmState.className}`;
  elements.dashboardLlmState.textContent = llmState.text;
  elements.dashboardAsrState.className = `engine-state ${asrState.className}`;
  elements.dashboardAsrState.textContent = asrState.text;
  elements.dashboardBufferUsage.textContent = `${bufferUsage}%`;
  elements.dashboardBufferFill.style.width = `${bufferUsage}%`;
  elements.dashboardAsrModel.title = isAsrConfigured()
    ? `${asrLabel} / ${transcriptionLanguageLabelFor(state.transcriptionLanguage)}`
    : "\u914d\u7f6e\u540e\u5c31\u7eea";

  if (!records.length) {
    const demoData = [
      { title: "\u5468\u62a5\u4ea7\u54c1\u540c\u6b65", date: "2025-01-20", duration: 2712, hasSummary: true },
      { title: "\u5ba2\u6237\u8bbf\u8c08\uff1a\u9879\u76ee X", date: "2025-01-19", duration: 1925, hasSummary: false },
      { title: "\u5de5\u7a0b\u7ad9\u4f1a", date: "2025-01-19", duration: 890, hasSummary: true }
    ];
    elements.dashboardRecords.innerHTML = demoData.map((r) => `
      <div class="record-row">
        <div class="record-name-cell">
          <div class="record-file"></div>
          <div>
            <div class="record-title">${r.title}</div>
            <p class="record-meta">\u4f1a\u8bae\u7eaa\u8981</p>
          </div>
        </div>
        <span>${r.date}</span>
        <span>${formatShortDuration(r.duration * 1000)}</span>
        <span class="record-status ${r.hasSummary ? "summary" : "transcript"}">${r.hasSummary ? "\u5df2\u751f\u6210\u7eaa\u8981" : "\u4ec5\u6709\u8f6c\u5199"}</span>
        <button class="record-action" disabled>...</button>
      </div>
    `).join("");
  } else {
    elements.dashboardRecords.innerHTML = records
      .map((record) => {
        const hasSummary = Boolean(record.aiSections?.raw || record.aiSections?.summary);
        return `
          <div class="record-row">
            <div class="record-name-cell">
              <div class="record-file"></div>
              <div>
                <div class="record-title">${escapeHtml(record.title)}</div>
                <p class="record-meta">${escapeHtml(summaryTemplateLabelFor(record.summaryTemplate || "meeting"))}</p>
              </div>
            </div>
            <span>${escapeHtml(formatDate(record.updatedAt))}</span>
            <span>${escapeHtml(formatShortDuration(Number(record.durationMs) || 0))}</span>
            <span class="record-status ${hasSummary ? "summary" : "transcript"}">${escapeHtml(
              hasSummary ? "\u5df2\u751f\u6210\u7eaa\u8981" : "\u4ec5\u6709\u8f6c\u5199"
            )}</span>
            <button class="record-action" data-open-record="${escapeHtml(record.id)}">...</button>
          </div>
        `;
      })
      .join("");
  }

  const totalDuration = state.history.reduce(
    (sum, record) => sum + (Number(record.durationMs) || 0),
    0
  );
  const templateCounts = state.history.reduce((acc, record) => {
    const key = record.summaryTemplate || "meeting";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const dominantTemplate =
    Object.entries(templateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Weekly insight
  if (state.history.length) {
    elements.dashboardWeeklyInsight.textContent = `\u60a8\u5b8c\u6210\u4e86 ${state.history.length} \u6b21\u5f55\u5236\uff0c\u603b\u8d77\u6765 ${Math.round(
      totalDuration / 3600000
    )} \u5c0f\u65f6\u3002\u672c\u5468\u6700\u5e38\u7528\u7684\u5de5\u4f5c\u6d41\u662f \"${summaryTemplateLabelFor(
      dominantTemplate
    )}\"\u3002`;
  } else {
    // Show demo insight
    elements.dashboardWeeklyInsight.textContent = "\u4f60\u8fd9\u4e00\u5468\u6700\u7ecf\u5e38\u7684\u4f1a\u8bae\u4e3b\u9898\u662f \"API \u67b6\u6784\"\u3002\u4f60\u5728\u8fd9\u4e2a\u4e3b\u9898\u4e0a\u7684 5 \u4e2a\u4f1a\u8bae\u4e2d\u82b1\u4e86 4.2 \u5c0f\u65f6\u3002";
  }
}

function renderDashboardNotebook() {
  const historyRecords = filteredHistory();
  const records = historyRecords.slice(0, 6);
  const latestRecord = historyRecords[0] || null;
  const totalDuration = state.history.reduce(
    (sum, record) => sum + (Number(record.durationMs) || 0),
    0
  );
  const summaryCount = state.history.filter((record) =>
    Boolean(record.aiSections?.raw || record.aiSections?.summary)
  ).length;
  const pendingSummaryCount = Math.max(0, state.history.length - summaryCount);
  const totalRecords = new Intl.NumberFormat("zh-CN").format(state.history.length);

  const heroEyebrow = document.querySelector(".hero-card .eyebrow");
  if (heroEyebrow) {
    heroEyebrow.textContent = "\u5de5\u4f5c\u533a / \u9996\u9875";
  }

  const heroTitle = document.querySelector(".hero-copy h2");
  if (heroTitle) {
    heroTitle.textContent = "\u8bb0\u4e0b\u6b64\u523b";
  }

  const heroDescription = document.querySelector(".hero-copy > p");
  if (heroDescription) {
    heroDescription.textContent =
      "\u5f00\u59cb\u5b9e\u65f6\u5f55\u5236\uff0c\u6216\u4e0a\u4f20\u97f3\u89c6\u9891\u751f\u6210\u8f6c\u5199\u4e0e\u6458\u8981\u3002";
  }

  if (elements.dashboardStartBtn?.lastElementChild) {
    elements.dashboardStartBtn.lastElementChild.textContent = "\u5f00\u59cb\u5f55\u5236";
  }

  if (elements.dashboardOpenLibraryBtn) {
    elements.dashboardOpenLibraryBtn.textContent = "\u4e0a\u4f20\u6587\u4ef6";
  }

  const notebookTitle = document.querySelector(".notebook-card .card-head h3");
  if (notebookTitle) {
    notebookTitle.textContent = "\u6982\u89c8";
  }

  const notebookDescription = document.querySelector(".notebook-card .card-head p");
  if (notebookDescription) {
    notebookDescription.textContent = "\u628a\u6700\u91cd\u8981\u7684 3 \u4e2a\u7ed3\u679c\u653e\u5728\u9996\u9875\u3002";
  }

  const recordsTitle = document.querySelector(".records-card .section-head h3");
  if (recordsTitle) {
    recordsTitle.textContent = "\u6700\u8fd1\u8bb0\u5f55";
  }

  const recordsDescription = document.querySelector(".records-card .section-head p");
  if (recordsDescription) {
    recordsDescription.textContent = "\u6700\u8fd1\u7684\u8f6c\u5199\u548c\u6458\u8981\u3002";
  }

  if (elements.viewLibraryBtn) {
    elements.viewLibraryBtn.textContent = "\u67e5\u770b\u5168\u90e8";
  }

  const chatbotTitle = document.querySelector(".chatbot-card .section-head h3");
  if (chatbotTitle) {
    chatbotTitle.textContent = "Memory AI";
  }

  const sessionToolbarLabel = document.querySelector(".chatbot-session-toolbar span");
  if (sessionToolbarLabel) {
    sessionToolbarLabel.textContent = "\u6700\u8fd1\u5bf9\u8bdd";
  }

  if (elements.dashboardChatbotNewBtn) {
    elements.dashboardChatbotNewBtn.textContent = "\u65b0\u5bf9\u8bdd";
  }

  if (elements.dashboardChatbotDeleteBtn) {
    elements.dashboardChatbotDeleteBtn.textContent = "\u5220\u9664\u5f53\u524d";
  }

  if (elements.dashboardChatbotDraft) {
    elements.dashboardChatbotDraft.placeholder =
      "\u8f93\u5165\u95ee\u9898\uff0c\u5f00\u59cb\u5bf9\u8bdd";
  }

  if (elements.dashboardNotebookList) {
    elements.dashboardNotebookList.innerHTML = [
      {
        label: "\u603b\u8bb0\u5f55",
        tone: "tone-rose",
        value: totalRecords,
        meta: latestRecord
          ? `\u6700\u8fd1\u66f4\u65b0 ${formatDashboardDate(latestRecord.updatedAt)}`
          : "\u6682\u65e0\u8bb0\u5f55"
      },
      {
        label: "\u603b\u65f6\u957f",
        tone: "tone-sky",
        value: formatDashboardDuration(totalDuration),
        meta: state.history.length
          ? `\u5171\u4fdd\u5b58 ${totalRecords} \u6761`
          : "\u5f55\u5236\u540e\u81ea\u52a8\u7d2f\u8ba1"
      },
      {
        label: "AI \u6458\u8981",
        tone: "tone-sand",
        value: new Intl.NumberFormat("zh-CN").format(summaryCount),
        meta: pendingSummaryCount
          ? `\u5f85\u6574\u7406 ${pendingSummaryCount} \u6761`
          : state.history.length
            ? "\u5df2\u5168\u90e8\u6574\u7406"
            : "\u6682\u65e0\u6458\u8981"
      }
    ]
      .map(
        (item) => `
          <article class="dashboard-stat-card ${item.tone}">
            <span class="dashboard-stat-kicker">${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.meta)}</p>
          </article>
        `
      )
      .join("");
  }

  if (!elements.dashboardRecords) {
    return;
  }

  if (!records.length) {
    elements.dashboardRecords.innerHTML = `
      <div class="dashboard-record-empty">
        <strong>\u8fd8\u6ca1\u6709\u4f1a\u8bae\u8bb0\u5f55</strong>
        <p>\u5f00\u59cb\u5f55\u5236\u6216\u4e0a\u4f20\u6587\u4ef6\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u6700\u8fd1\u7684\u8f6c\u5199\u4e0e\u6458\u8981\u3002</p>
      </div>
    `;
    return;
  }

  elements.dashboardRecords.innerHTML = records
    .map((record) => {
      const hasSummary = Boolean(record.aiSections?.raw || record.aiSections?.summary);
      return `
        <div class="record-row">
          <div class="record-name-cell">
            <div class="record-file"></div>
            <div>
              <div class="record-title">${escapeHtml(record.title)}</div>
              <p class="record-meta">${escapeHtml(
                summaryTemplateLabelFor(record.summaryTemplate || "meeting")
              )}</p>
            </div>
          </div>
          <span>${escapeHtml(formatDashboardDate(record.updatedAt))}</span>
          <span>${escapeHtml(formatShortDuration(Number(record.durationMs) || 0))}</span>
          <span class="record-status ${hasSummary ? "summary" : "transcript"}">${escapeHtml(
            hasSummary ? "\u5df2\u751f\u6210\u6458\u8981" : "\u4ec5\u6709\u8f6c\u5199"
          )}</span>
          <button class="record-action" type="button" data-open-record="${escapeHtml(record.id)}">\u67e5\u770b</button>
        </div>
      `;
    })
    .join("");
}

function renderWaveBars() {
  const bars = [];
  const baseLevel = Math.max(0.18, state.audioMeterLevel);

  for (let index = 0; index < 22; index += 1) {
    const distance = Math.abs(index - 10.5);
    const shape = Math.max(0.24, 1 - distance / 11);
    const dynamic = state.isCapturing ? baseLevel : 0.18;
    const height = Math.round((22 + shape * 30) * dynamic + 10 + (index % 3) * 2);
    bars.push(`<span style="height:${height}px"></span>`);
  }

  elements.waveBars.innerHTML = bars.join("");
}

function renderGainDots() {
  const activeCount = Math.min(5, Math.max(1, Math.round(state.audioMeterLevel * 5)));
  elements.gainDots.forEach((dot, index) => {
    dot.classList.toggle("active", state.isCapturing && index < activeCount);
  });
}

function renderRecordingPage() {
  const previousScrollTop = elements.recordingTranscript?.scrollTop || 0;
  const shouldAutoFollow = state.recordingTranscriptAutoFollow;
  const allowNewDraft = canCreateNewRecordingDraft();
  const allowDeleteCurrent = canDeleteCurrentRecording();
  const draftTitle = state.meetingTitle.trim() || resolveDraftFallbackTitle();
  const hasSavedRecordingModules = state.recordingModuleStackItems.length > 0;
  const newDraftLabel = "\u5f00\u59cb\u8f6c\u5199";

  if (elements.recordingTitle) {
    elements.recordingTitle.placeholder = resolveDraftFallbackTitle();
    if (document.activeElement !== elements.recordingTitle && elements.recordingTitle.value !== draftTitle) {
      elements.recordingTitle.value = draftTitle;
    }
  }
  if (elements.recordingSubtitle) {
    elements.recordingSubtitle.textContent = deriveRecordingSubtitle();
  }
  if (elements.recordingTemplateSelect) {
    elements.recordingTemplateSelect.value = state.summaryTemplate;
  }
  if (elements.recordingWhisperModelSelect) {
    elements.recordingWhisperModelSelect.value = state.liveWhisperModel;
  }
  elements.recordingDuration.textContent = formatDuration(getCurrentDurationMs());
  if (elements.recordingPage) {
    elements.recordingPage.classList.toggle("collapsed", state.recordingTranscriptCollapsed);
  }
  if (elements.recordingHeader) {
    elements.recordingHeader.classList.toggle("is-collapsed", state.recordingTranscriptCollapsed);
  }
  if (elements.recordingCollapseToggle) {
    elements.recordingCollapseToggle.setAttribute(
      "aria-expanded",
      String(!state.recordingTranscriptCollapsed)
    );
  }
  if (elements.recordingCollapseLabel) {
    elements.recordingCollapseLabel.textContent = state.recordingTranscriptCollapsed
      ? "\u5c55\u5f00\u539f\u59cb\u8f6c\u5199"
      : "\u6536\u8d77\u539f\u59cb\u8f6c\u5199";
  }
  if (elements.recordingDeleteBtn) {
    elements.recordingDeleteBtn.hidden = !allowDeleteCurrent;
    elements.recordingDeleteBtn.disabled = !allowDeleteCurrent;
    elements.recordingDeleteBtn.title = "\u5220\u9664\u5f53\u524d\u8bb0\u5f55";
  }
  if (elements.recordingSecondaryAction) {
    elements.recordingSecondaryAction.disabled = !allowNewDraft;
    elements.recordingSecondaryAction.classList.toggle("is-actionable", allowNewDraft);
    elements.recordingSecondaryAction.setAttribute("aria-label", newDraftLabel);
    elements.recordingSecondaryAction.title = newDraftLabel;
  }
  if (elements.recordingSecondaryActionLabel) {
    elements.recordingSecondaryActionLabel.textContent = newDraftLabel;
  }
  if (elements.recordingStartBtn) {
    elements.recordingStartBtn.style.display =
      !state.isCapturing && !state.isPaused ? "inline-flex" : "none";
    elements.recordingStartBtn.disabled =
      state.liveTranscriptionStopping || state.captureStartInFlight;
  }
  elements.pauseBtn.style.display = state.isCapturing && !state.isPaused ? "inline-flex" : "none";
  elements.resumeBtn.style.display = state.isPaused ? "inline-flex" : "none";
  elements.pauseBtn.disabled = state.liveTranscriptionStopping;
  elements.resumeBtn.disabled = state.liveTranscriptionStopping;
  elements.stopBtn.disabled = (!state.isCapturing && !state.isPaused) || state.liveTranscriptionStopping;
  elements.markHighlightBtn.disabled = state.segments.length === 0;

  if (elements.recordingTranscript) {
    elements.recordingTranscript.classList.toggle("is-collapsed", state.recordingTranscriptCollapsed);
  }

  if (state.recordingTranscriptCollapsed) {
    elements.recordingTranscript.innerHTML = "";
    elements.recordingTranscript.scrollTop = 0;
  } else if (!state.segments.length) {
    elements.recordingTranscript.innerHTML = hasSavedRecordingModules
      ? ""
      : `
        <div class="ai-block">
          <h4>\u5b9e\u65f6\u8f6c\u5199\u5c06\u663e\u793a\u5728\u8fd9\u91cc</h4>
          <p>${
            allowNewDraft
              ? "\u70b9\u51fb\u4e0a\u65b9\u767d\u8272\u6309\u94ae\u53ef\u4ee5\u589e\u52a0\u65b0\u7684\u5f55\u5236\u6587\u4ef6\uff0c\u7136\u540e\u518d\u70b9\u51fb\u201c\u5f00\u59cb\u5f55\u5236\u201d\u6216\u6309 Alt+Space \u5f00\u59cb\u8f6c\u5199\u3002"
              : "\u5f53\u524d\u6b63\u5728\u5904\u7406\u5f55\u5236\u4efb\u52a1\uff0c\u8f6c\u5199\u7ed3\u679c\u4f1a\u5728\u8fd9\u91cc\u6301\u7eed\u8ffd\u52a0\u3002"
          }</p>
        </div>
      `;
    elements.recordingTranscript.scrollTop = 0;
  } else {
    elements.recordingTranscript.innerHTML = state.segments
      .map((segment, index) => {
        const speaker = segment.speaker || defaultSpeakerLabel(index, state.audioSource);
        return `
          <article class="recording-entry ${segment.highlighted ? "highlighted" : ""}">
            <div class="recording-entry-meta">
              <time>[${escapeHtml(formatSegmentTimestamp(segment))}]</time>
              <strong>${escapeHtml(speaker)}</strong>
            </div>
            <div class="recording-bubble">${escapeHtml(segment.text)}</div>
            ${
              segment.highlighted
                ? '<span class="recording-highlight-badge">\u91cd\u70b9</span>'
                : "<span></span>"
            }
          </article>
        `;
      })
      .join("");

    elements.recordingTranscript.scrollTop = shouldAutoFollow
      ? elements.recordingTranscript.scrollHeight
      : previousScrollTop;
  }

  renderRecordingModuleStack();
  renderWaveBars();
  renderGainDots();
}

function renderLibraryList() {
  const records = filteredHistory();
  const previousScrollLeft = elements.libraryRecordList?.scrollLeft || 0;

  if (!records.length) {
    elements.libraryRecordList.innerHTML = `
      <div class="library-record-empty">还没有历史记录，完成一次录制后会显示在这里。</div>
    `;
    syncLibraryRecordSlider();
    return;
  }

  if (
    state.currentPage === "library" &&
    !records.some((record) => record.id === state.selectedRecordId)
  ) {
    selectRecord(records[0].id, false);
  }

  elements.libraryRecordList.innerHTML = records
    .map((record) => {
      const active = record.id === state.selectedRecordId;
      const summaryReady = Boolean(record.aiSections?.raw || record.aiSections?.summary);
      return `
        <article class="library-item ${active ? "active" : ""}" data-library-item="${escapeHtml(
          record.id
        )}">
          <div class="library-item-top">
            <strong>${escapeHtml(record.title)}</strong>
            <span class="tiny-chip ${summaryReady ? "ready" : "neutral"}">${escapeHtml(
              summaryReady ? "AI \u5df2\u5904\u7406" : "\u8f6c\u5199"
            )}</span>
          </div>
          <p class="record-meta">${escapeHtml(
            `${formatDate(record.updatedAt)} \u00b7 ${formatShortDuration(Number(record.durationMs) || 0)}`
          )}</p>
          <div class="library-item-meta">
            <span class="tiny-chip neutral">${escapeHtml(
              summaryTemplateLabelFor(record.summaryTemplate || "meeting")
            )}</span>
            <span class="tiny-chip neutral">${escapeHtml(
              transcriptionLanguageLabelFor(record.transcriptionLanguage || "auto")
            )}</span>
          </div>
        </article>
      `;
    })
    .join("");

  window.requestAnimationFrame(() => {
    if (!elements.libraryRecordList) {
      return;
    }

    const maxScroll = getLibraryRecordMaxScroll();
    elements.libraryRecordList.scrollLeft = Math.min(previousScrollLeft, maxScroll);
    syncLibraryRecordSlider();
  });
}

function markdownBlocks(markdown) {
  const raw = String(markdown || "").trim();
  if (!raw) {
    return [];
  }

  const lines = raw.split("\n");
  const blocks = [];
  let title = "Overview";
  let buffer = [];

  const flush = () => {
    if (!buffer.length) {
      return;
    }

    blocks.push({
      title,
      content: buffer.join("\n").trim()
    });
    buffer = [];
  };

  lines.forEach((line) => {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) {
      flush();
      title = match[1].trim();
      return;
    }

    buffer.push(line);
  });

  flush();
  return blocks.length ? blocks : [{ title: "\u603b\u7ed3", content: raw }];
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function extractListItems(...sources) {
  const items = [];

  sources.forEach((source) => {
    String(source || "")
      .split("\n")
      .map((line) => line.trim())
      .forEach((line) => {
        const cleaned = line
          .replace(/^[-*\u2022]\s+/, "")
          .replace(/^\d+[.)]\s+/, "")
          .replace(/^\[[ xX]\]\s+/, "")
          .trim();

        if (!cleaned || cleaned.length < 4 || /^#{1,3}\s+/.test(line)) {
          return;
        }

        items.push(cleaned);
      });
  });

  return Array.from(new Set(items));
}

function formatInlineMarkdownHtml(text) {
  let html = escapeHtml(String(text || "").trim());
  if (!html) {
    return "";
  }

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function formatRichTextHtml(text, fallbackText = "") {
  const raw = pickFirstNonEmpty(text, fallbackText);
  if (!raw) {
    return "";
  }

  const blocks = [];
  let paragraphLines = [];
  let listType = "";
  let listItems = [];
  let quoteLines = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    blocks.push(`<p>${formatInlineMarkdownHtml(paragraphLines.join(" "))}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = "";
      listItems = [];
      return;
    }

    blocks.push(
      `<${listType}>${listItems
        .map((item) => `<li>${formatInlineMarkdownHtml(item)}</li>`)
        .join("")}</${listType}>`
    );
    listType = "";
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) {
      return;
    }

    blocks.push(
      `<blockquote><p>${quoteLines
        .map((line) => formatInlineMarkdownHtml(line))
        .join("<br />")}</p></blockquote>`
    );
    quoteLines = [];
  };

  String(raw)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        flushQuote();
        return;
      }

      const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        flushQuote();
        blocks.push(
          `<p class="knowledge-doc-subheading">${formatInlineMarkdownHtml(headingMatch[1])}</p>`
        );
        return;
      }

      const bulletMatch =
        trimmed.match(/^[-*+]\s+(.+)$/) || trimmed.match(/^\[[ xX]\]\s+(.+)$/);
      if (bulletMatch) {
        flushParagraph();
        flushQuote();
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        listItems.push(bulletMatch[1]);
        return;
      }

      const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (orderedMatch) {
        flushParagraph();
        flushQuote();
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        listItems.push(orderedMatch[1]);
        return;
      }

      const quoteMatch = trimmed.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        flushParagraph();
        flushList();
        quoteLines.push(String(quoteMatch[1] || "").trim());
        return;
      }

      flushList();
      flushQuote();
      paragraphLines.push(trimmed);
    });

  flushParagraph();
  flushList();
  flushQuote();
  return blocks.join("");
}

function formatSummarySectionHtml(text, fallbackText = "") {
  return escapeHtml(pickFirstNonEmpty(text, fallbackText)).replace(/\n/g, "<br />");
}

function knowledgeTranscriptForSummary() {
  const previewTranscript =
    state.knowledge.transcriptAnimation?.finalTranscript ||
    String(state.knowledge.transcriptPreview || "").trim();
  const markdownTranscript = deriveTranscriptFromKnowledgeMarkdown(state.knowledge.transcriptMarkdown);
  return String(previewTranscript || markdownTranscript || "").trim();
}


function knowledgeDocSectionLabels(template) {
  if (template === "learning") {
    return {
      summary: "\u8bfe\u7a0b\u6982\u89c8",
      minutes: "\u77e5\u8bc6\u8981\u70b9",
      tasks: "\u5b9e\u64cd\u5efa\u8bae",
      risks: "\u5f85\u786e\u8ba4\u95ee\u9898"
    };
  }

  return {
    summary: "\u77e5\u8bc6\u603b\u7ed3",
    minutes: "\u6838\u5fc3\u8981\u70b9",
    tasks: "\u884c\u52a8\u5efa\u8bae",
    risks: "\u98ce\u9669\u4e0e\u963b\u585e"
  };
}

function knowledgeDocListItems(text, fallbackText = "") {
  const items = extractListItems(text);
  if (items.length) {
    return items;
  }

  const normalized = String(text || "").trim();
  if (normalized) {
    return [normalized];
  }

  return fallbackText ? [fallbackText] : [];
}

function detailTranscriptEntries(record) {
  if (!record) {
    return [];
  }

  if (Array.isArray(record.transcript)) {
    return record.transcript
      .map((item, index) => ({
        speaker: item.speaker || defaultSpeakerLabel(index, record.audioSource || state.audioSource),
        time: item.createdAt ? formatClock(item.createdAt) : "",
        text: String(item.text || "").trim()
      }))
      .filter((item) => item.text);
  }

  return state.detailTranscriptDraft
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^\[([^\]]+)\]\s*(?:(.+?):\s*)?(.*)$/);
      if (match) {
        return {
          speaker:
            String(match[2] || "").trim() ||
            defaultSpeakerLabel(index, record.audioSource || state.audioSource),
          time: String(match[1] || "").trim(),
          text: String(match[3] || "").trim()
        };
      }

      return {
        speaker: defaultSpeakerLabel(index, record.audioSource || state.audioSource),
        time: "",
        text: line
      };
    })
    .filter((item) => item.text);
}

function detailSummaryClipboardText(record) {
  const summaryTemplate = record?.summaryTemplate || state.summaryTemplate;
  const sections = normalizeAiSections(record?.aiSections || state.detailAiSections);
  const structuredSummary = String(
    buildStructuredSummaryMarkdown(sections, summaryTemplate) || ""
  ).trim();
  const title = String(record?.title || "\u4f1a\u8bae\u8bb0\u5f55").trim() || "\u4f1a\u8bae\u8bb0\u5f55";

  return [`# ${title}`, "", structuredSummary || "\u6682\u65e0 AI \u6458\u8981\u5185\u5bb9\u3002"].join("\n");
}

function demoLibraryRecord() {
  const updatedAt = new Date("2025-01-20T10:15:00").toISOString();
  const transcript = [
    {
      speaker: "Alex Rivera",
      createdAt: "2025-01-20T10:02:00",
      text: "Let us align on the Q3 priorities and confirm the launch timeline."
    },
    {
      speaker: "Maya Chen",
      createdAt: "2025-01-20T10:12:00",
      text: "The team can finish the onboarding flow and analytics dashboard this month."
    },
    {
      speaker: "Jordan Lee",
      createdAt: "2025-01-20T10:28:00",
      text: "The main risk is delayed design feedback, so we should lock owners and dates today."
    }
  ];

  return {
    id: "demo-q3-sync",
    title: "Q3 Product Sync",
    updatedAt,
    durationMs: 42 * 60 * 1000 + 15 * 1000,
    audioSource: "both",
    transcriptionLanguage: "en",
    summaryTemplate: "meeting",
    transcript,
    aiSections: normalizeAiSections({
      summary:
        "The team aligned on the Q3 launch scope, delivery sequence, and ownership for the next milestone.",
      minutes: [
        "- Confirmed the onboarding flow and analytics dashboard as the current focus.",
        "- Agreed to finalize launch dates after design review.",
        "- Decided to track dependencies in the weekly sync."
      ].join("\n"),
      tasks: [
        "- Alex: publish the delivery timeline by Friday.",
        "- Maya: complete the onboarding checklist draft.",
        "- Jordan: follow up on design feedback and unblock review."
      ].join("\n"),
      risks: [
        "- Design feedback may arrive later than planned.",
        "- Cross-team dependency tracking is still manual."
      ].join("\n"),
      raw: [
        "## Summary",
        "",
        "The team aligned on the Q3 launch scope, delivery sequence, and ownership for the next milestone.",
        "",
        "## Notes",
        "",
        "- Confirmed the onboarding flow and analytics dashboard as the current focus.",
        "- Agreed to finalize launch dates after design review.",
        "",
        "## Actions",
        "",
        "- Alex: publish the delivery timeline by Friday.",
        "- Maya: complete the onboarding checklist draft.",
        "",
        "## Risks",
        "",
        "- Design feedback may arrive later than planned."
      ].join("\n")
    }),
    todoStates: {}
  };
}


function renderLibraryDetail() {
  if (
    !elements.detailTitle ||
    !elements.detailMeta ||
    !elements.detailDurationChip ||
    !elements.detailTemplateSelect ||
    !elements.detailLanguageChip ||
    !elements.detailStatusChip ||
    !elements.detailTranscriptStream ||
    !elements.detailAiOutput
  ) {
    notify("未找到可保存的记录。");
    return;
  }

  const persistedRecord = selectedRecord();
  const record = persistedRecord || demoLibraryRecord();
  const isDemoRecord = !persistedRecord;
  const summaryTemplate = record.summaryTemplate || state.summaryTemplate || "meeting";
  const labels = summarySectionLabelsForTemplate(summaryTemplate);
  const sourceSections = isDemoRecord ? normalizeAiSections(record.aiSections) : state.detailAiSections;
  const hasSummary = hasAiSectionsContent(sourceSections);
  const isGeneratingSummary = !isDemoRecord && state.isSummarizing;
  const summaryError = !isDemoRecord ? String(state.detailSummaryError || "").trim() : "";
  const transcriptEntries = detailTranscriptEntries(record);
  const structuredSummary = String(
    buildStructuredSummaryMarkdown(sourceSections, summaryTemplate) || ""
  ).trim();
  const availableRecordCount = filteredHistory().length;
  const todoStates = normalizeTodoStates(record.todoStates);
  const taskItems = knowledgeDocListItems(sourceSections.tasks);
  const escapeAttribute = (value) =>
    escapeHtml(String(value || ""))
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  elements.detailTitle.textContent = record.title || "会议记录";
  elements.detailMeta.textContent = [
    isDemoRecord ? "示例记录" : "",
    summaryTemplateLabelFor(summaryTemplate),
    record.updatedAt ? formatDate(record.updatedAt) : ""
  ]
    .filter(Boolean)
    .join(" · ");

  if (elements.detailRecordCurrent) {
    elements.detailRecordCurrent.textContent = record.title || "选择会议记录";
  }

  if (elements.detailRecordCurrentMeta) {
    elements.detailRecordCurrentMeta.textContent = isDemoRecord
      ? "当前展示的是示例内容。选择历史记录后可查看真实会议详情。"
      : `${formatDate(record.updatedAt)} · 共 ${Math.max(1, availableRecordCount)} 条记录`;
  }

  if (elements.detailRecordPicker) {
    elements.detailRecordPicker.classList.toggle("is-empty", !availableRecordCount);
  }

  elements.detailDurationChip.textContent = formatShortDuration(Number(record.durationMs) || 0);
  elements.detailTemplateSelect.value = summaryTemplate;
  elements.detailTemplateSelect.disabled = isGeneratingSummary;
  elements.detailLanguageChip.textContent = transcriptionLanguageLabelFor(
    record.transcriptionLanguage || state.transcriptionLanguage
  );

  elements.detailStatusChip.className = `tiny-chip ${
    isGeneratingSummary ? "warning" : summaryError ? "error" : hasSummary ? "ready" : "neutral"
  }`;
  elements.detailStatusChip.textContent = isGeneratingSummary
    ? "正在生成摘要"
    : summaryError
    ? "生成失败"
    : hasSummary
    ? "摘要已生成"
    : "暂无摘要";

  elements.detailTranscriptStream.innerHTML = transcriptEntries.length
    ? transcriptEntries
        .map(
          (item, index) => `
            <article class="transcript-entry">
              <div class="transcript-entry-head">
                <span class="speaker-badge speaker-${index % 3}">${escapeHtml(item.speaker)}</span>
                ${item.time ? `<time>${escapeHtml(item.time)}</time>` : ""}
              </div>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `
        )
        .join("")
    : `
        <article class="ai-block">
          <h4>暂无转写内容</h4>
          <p>当前记录还没有可显示的原始转写文本。</p>
        </article>
      `;

  if (!hasSummary) {
    if (summaryError) {
      elements.detailAiOutput.innerHTML = `
        <article class="ai-block">
          <h4>摘要生成失败</h4>
          <p>${escapeHtml(summaryError)}</p>
        </article>
      `;
      return;
    }

    if (isGeneratingSummary) {
      elements.detailAiOutput.innerHTML = `
        <article class="ai-block report-cta">
          <div>
            <strong>正在生成 AI 会议摘要</strong>
            <p>系统正在根据当前转写整理摘要，请稍候。</p>
          </div>
        </article>
      `;
      return;
    }

    elements.detailAiOutput.innerHTML = `
      <article class="ai-block report-cta">
        <div>
          <strong>还没有 AI 会议摘要</strong>
          <p>点击上方“生成摘要”后，系统会根据当前转写生成结构化摘要。</p>
        </div>
      </article>
    `;
    return;
  }

  const blocks = [];

  const pushRichTextBlock = (title, content) => {
    const html = formatRichTextHtml(content);
    if (!html) {
      return;
    }

    blocks.push(`
      <article class="ai-block summary-block">
        <h4>${escapeHtml(title)}</h4>
        <div class="summary-rich-text">${html}</div>
      </article>
    `);
  };

  if (summaryError) {
    blocks.push(`
      <article class="ai-block summary-block">
        <h4>本次生成提示</h4>
        <p>${escapeHtml(summaryError)}</p>
      </article>
    `);
  }

  pushRichTextBlock(labels.summary, sourceSections.summary);
  pushRichTextBlock(labels.minutes, sourceSections.minutes);

  if (taskItems.length) {
    const todoListHtml = taskItems
      .map((item) => {
        const taskKey = todoTaskKey(item);
        const checked = Boolean(todoStates[taskKey]);
        return `
          <li class="${checked ? "done" : ""}">
            <input
              class="todo-toggle"
              type="checkbox"
              data-todo-key="${escapeAttribute(taskKey)}"
              ${checked ? "checked" : ""}
            />
            <span>${formatInlineMarkdownHtml(item)}</span>
          </li>
        `;
      })
      .join("");

    blocks.push(`
      <article class="ai-block summary-block">
        <h4>${escapeHtml(labels.tasks)}</h4>
        <ul class="todo-list">${todoListHtml}</ul>
      </article>
    `);
  } else {
    pushRichTextBlock(labels.tasks, sourceSections.tasks);
  }

  pushRichTextBlock(labels.risks, sourceSections.risks);

  if (!blocks.length && structuredSummary) {
    pushRichTextBlock(labels.summary, structuredSummary);
  }

  elements.detailAiOutput.innerHTML = blocks.join("");
}

function renderModelConfig() {
  if (elements.settingsLanguage) {
    elements.settingsLanguage.value = state.transcriptionLanguage;
  }

  if (elements.settingsAudioSource) {
    elements.settingsAudioSource.value = state.audioSource;
  }

  if (elements.settingsTemplate) {
    elements.settingsTemplate.value = state.summaryTemplate;
  }

  document.querySelectorAll("[data-config-key]").forEach((field) => {
    const key = field.getAttribute("data-config-key");
    const value = state.config[key];

    if (field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }

    field.value = value;
  });

  if (elements.asrTestResult) {
    elements.asrTestResult.className = `status-banner ${state.testResults.asr.status}`;
    elements.asrTestResult.textContent = state.testResults.asr.message;
  }

  if (elements.llmTestResult) {
    elements.llmTestResult.className = `status-banner ${state.testResults.llm.status}`;
    elements.llmTestResult.textContent = state.testResults.llm.message;
  }
}


function knowledgeStepLabel(status) {
  if (status === "warning") {
    return "处理中";
  }

  if (status === "ready") {
    return "已完成";
  }

  if (status === "error") {
    return "失败";
  }

  return "待处理";
}

function knowledgeStepClass(status) {
  return ["tiny-chip", status].join(" ");
}

function renderKnowledgePage() {
  if (
    !elements.knowledgeStatus ||
    !elements.knowledgeStartBtn ||
    !elements.knowledgeArchiveBtn ||
    !elements.knowledgeGenerateDocBtn ||
    !elements.knowledgeTranscriptPreview ||
    !elements.knowledgeDocPreview ||
    !elements.knowledgeStepAudio ||
    !elements.knowledgeStepAsr ||
    !elements.knowledgeStepDoc ||
    !elements.knowledgeStepNotion ||
    !elements.knowledgeNotionResult
  ) {
    return;
  }

  const stepPairs = [
    [elements.knowledgeStepAudio, state.knowledge.stepAudio],
    [elements.knowledgeStepAsr, state.knowledge.stepAsr],
    [elements.knowledgeStepDoc, state.knowledge.stepDoc],
    [elements.knowledgeStepNotion, state.knowledge.stepNotion]
  ];

  stepPairs.forEach(([element, status]) => {
    element.className = knowledgeStepClass(status);
    element.textContent = knowledgeStepLabel(status);
  });

  const videoName = String(state.knowledge.videoName || "").trim();
  const cleanTitle = videoName.replace(/\.[^.]+$/, "").trim();
  const sourceLabel = String(deriveKnowledgeSourceLabel() || "").trim() || "转写引擎";
  const languageLabel = video2docLanguageLabelFor(state.config.video2docLanguage);

  if (elements.knowledgeVideoTitle) {
    elements.knowledgeVideoTitle.textContent = cleanTitle ? `视频：${cleanTitle}` : "视频";
  }

  if (elements.knowledgeVideoMeta) {
    elements.knowledgeVideoMeta.textContent = cleanTitle
      ? `${sourceLabel} · ${languageLabel}`
      : "导入视频后开始转写";
  }

  let statusClass = "neutral";
  if (
    state.knowledge.stepAudio === "error" ||
    state.knowledge.stepAsr === "error" ||
    state.knowledge.stepDoc === "error" ||
    state.knowledge.stepNotion === "error"
  ) {
    statusClass = "error";
  } else if (state.knowledge.isArchiving || state.knowledge.isProcessing || state.knowledge.isGeneratingDoc) {
    statusClass = "warning";
  } else if (
    state.knowledge.stepNotion === "ready" ||
    state.knowledge.stepDoc === "ready" ||
    state.knowledge.stepAsr === "ready"
  ) {
    statusClass = "ready";
  }

  elements.knowledgeStatus.className = ["tiny-chip", statusClass].join(" ");
  elements.knowledgeStatus.textContent = String(state.knowledge.statusMessage || "").trim() || "等待导入";

  let notionStatusClass = "neutral";
  if (state.knowledge.stepNotion === "error") {
    notionStatusClass = "error";
  } else if (state.knowledge.isArchiving) {
    notionStatusClass = "warning";
  } else if (state.knowledge.notionUrl) {
    notionStatusClass = "success";
  }

  elements.knowledgeNotionResult.className = `status-banner ${notionStatusClass}`;
  if (state.knowledge.notionUrl) {
    elements.knowledgeNotionResult.innerHTML = `
      <span>已同步到 Notion。</span>
      <a href="${escapeHtml(state.knowledge.notionUrl)}" target="_blank" rel="noreferrer">查看页面</a>
    `;
  } else {
    elements.knowledgeNotionResult.textContent =
      String(state.knowledge.notionResultMessage || "").trim() || "尚未同步到 Notion。";
  }

  elements.knowledgeStartBtn.disabled =
    state.knowledge.isArchiving || state.knowledge.isGeneratingDoc || state.knowledge.isProcessing;
  elements.knowledgeStartBtn.textContent = state.knowledge.videoFile ? "更换视频" : "导入视频";

  elements.knowledgeArchiveBtn.disabled =
    state.knowledge.isGeneratingDoc ||
    state.knowledge.isArchiving ||
    (!state.knowledge.isProcessing && !state.knowledge.videoFile);
  elements.knowledgeArchiveBtn.classList.toggle("stop", state.knowledge.isProcessing);
  elements.knowledgeArchiveBtn.textContent = state.knowledge.isProcessing ? "停止转写" : "开始转写";

  const canGenerateKnowledgeDoc = Boolean(
    !state.knowledge.isArchiving &&
      !state.knowledge.isProcessing &&
      state.knowledge.videoFile &&
      knowledgeTranscriptForSummary()
  );
  elements.knowledgeGenerateDocBtn.disabled = state.knowledge.isGeneratingDoc || !canGenerateKnowledgeDoc;
  elements.knowledgeGenerateDocBtn.textContent = state.knowledge.isGeneratingDoc
    ? "生成中..."
    : "生成总结文档";

  const transcriptSource = String(state.knowledge.transcriptPreview || "").trim();
  const markdownTranscript = String(
    deriveTranscriptFromKnowledgeMarkdown(state.knowledge.transcriptMarkdown) ||
      state.knowledge.transcriptMarkdown ||
      ""
  ).trim();
  const mergedTranscript = transcriptSource || markdownTranscript;

  if (!mergedTranscript) {
    const emptyTitle = cleanTitle ? "等待转写内容" : "尚未导入视频";
    const emptyBody = cleanTitle
      ? "点击“开始转写”后，这里会展示原始转写。"
      : "请先导入一个视频文件。";

    elements.knowledgeTranscriptPreview.innerHTML = `
      <div class="ai-block">
        <h4>${escapeHtml(emptyTitle)}</h4>
        <p>${escapeHtml(emptyBody)}</p>
      </div>
    `;
  } else {
    const transcriptEntries = mergedTranscript
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^\[([^\]]+)\]\s*(?:(.+?):\s*)?(.*)$/);
        if (!match) {
          return {
            speaker: "发言人",
            text: line,
            time: "--:--"
          };
        }

        return {
          speaker: String(match[2] || "").trim() || "发言人",
          text: String(match[3] || "").trim(),
          time: String(match[1] || "").trim() || "--:--"
        };
      });

    const transcriptHtml = transcriptEntries
      .map((item, index) => {
        const isTypingLine =
          Boolean(state.knowledge.transcriptAnimation) &&
          index === state.knowledge.transcriptAnimationIndex;

        return `
          <article class="knowledge-transcript-item${isTypingLine ? " is-typing" : ""}">
            <time class="knowledge-transcript-time">${escapeHtml(item.time)}</time>
            <div class="knowledge-transcript-bubble">
              <strong class="knowledge-speaker">${escapeHtml(item.speaker)}</strong>
              <p>${escapeHtml(item.text)}${
                isTypingLine ? '<span class="knowledge-typing-caret" aria-hidden="true"></span>' : ""
              }</p>
            </div>
          </article>
        `;
      })
      .join("");

    elements.knowledgeTranscriptPreview.innerHTML = transcriptHtml;
  }

  const knowledgeDocMarkdown = String(state.knowledge.docMarkdown || "").trim();
  const knowledgeDocError = String(state.knowledge.docError || "").trim();

  if (!knowledgeDocMarkdown) {
    const emptyTitle = cleanTitle ? "总结文档尚未生成" : "尚未导入视频";
    const emptyBody = cleanTitle
      ? "转写完成后，点击“生成总结文档”开始总结。"
      : "请先导入视频并完成转写。";

    elements.knowledgeDocPreview.innerHTML = knowledgeDocError
      ? `
        <div class="status-banner error knowledge-doc-error">${escapeHtml(knowledgeDocError)}</div>
        <div class="ai-block">
          <h4>${escapeHtml(emptyTitle)}</h4>
          <p>${escapeHtml(emptyBody)}</p>
        </div>
      `
      : `
        <div class="ai-block">
          <h4>${escapeHtml(emptyTitle)}</h4>
          <p>${escapeHtml(emptyBody)}</p>
        </div>
      `;
    return;
  }

  const template = state.knowledge.template || "learning";
  const templateLabel = summaryTemplateLabelFor(template);
  const labels = knowledgeDocSectionLabels(template);
  const docSections = parseAiSections(knowledgeDocMarkdown, template) || EMPTY_AI_SECTIONS();
  const summaryText = pickFirstNonEmpty(docSections.summary, knowledgeDocMarkdown);
  const minutesText = pickFirstNonEmpty(docSections.minutes);
  const tasksItems = knowledgeDocListItems(docSections.tasks);
  const riskItems = knowledgeDocListItems(docSections.risks);

  const renderRichSection = (title, content, fallbackText) => `
    <section class="knowledge-doc-section">
      <h4>${escapeHtml(title)}</h4>
      <div class="knowledge-doc-copy knowledge-doc-rich-text">${formatRichTextHtml(content, fallbackText)}</div>
    </section>
  `;

  const renderListSection = (title, items, fallbackText) => {
    if (!items.length) {
      return renderRichSection(title, "", fallbackText);
    }

    return `
      <section class="knowledge-doc-section">
        <h4>${escapeHtml(title)}</h4>
        <div class="knowledge-doc-copy knowledge-doc-rich-text">
          <ul>
            ${items.map((item) => `<li>${formatInlineMarkdownHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </section>
    `;
  };

  elements.knowledgeDocPreview.innerHTML = `
    <article class="knowledge-doc-theme">
      <span class="knowledge-doc-label">文档概览</span>
      <div class="knowledge-doc-rich-text">
        <p><strong>模板：</strong>${escapeHtml(templateLabel)}</p>
        <p><strong>转写来源：</strong>${escapeHtml(sourceLabel)}</p>
        <p><strong>语言：</strong>${escapeHtml(languageLabel)}</p>
      </div>
    </article>
    ${renderRichSection(labels.summary, summaryText, "暂无总结内容。")}
    ${renderRichSection(labels.minutes, minutesText, "暂无核心要点。")}
    ${renderListSection(labels.tasks, tasksItems, "暂无行动建议。")}
    ${renderListSection(labels.risks, riskItems, "暂无风险或阻塞。")}
  `;
}


async function startKnowledgeTranscription() {
  if (state.knowledge.isProcessing) {
    return;
  }

  if (!state.knowledge.videoFile) {
    elements.knowledgeVideoInput?.click();
    return;
  }

  stopKnowledgeTranscriptAnimation();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const abortController = new AbortController();
  const videoFile = state.knowledge.videoFile;
  const videoName = state.knowledge.videoName;

  state.knowledge.isProcessing = true;
  state.knowledge.stopRequested = false;
  state.knowledge.transcriptionAbortController = abortController;
  state.knowledge.transcriptionRunId = runId;
  state.knowledge.notionUrl = "";
  state.knowledge.notionResultMessage = "\u5c1a\u672a\u540c\u6b65\u5230 Notion\u3002";
  state.knowledge.statusMessage = "\u6b63\u5728\u8f6c\u5199\u89c6\u9891...";
  state.knowledge.docMarkdown = "";
  state.knowledge.docError = "";
  state.knowledge.docGenerationRunId = "";
  state.knowledge.isGeneratingDoc = false;
  state.knowledge.transcriptMarkdown = "";
  state.knowledge.transcriptMarkdownPath = "";
  state.knowledge.transcriptPreview = "";
  state.knowledge.transcriptionSourceLabel = "";
  state.knowledge.stepAudio = videoFile ? "ready" : "neutral";
  state.knowledge.stepAsr = "warning";
  state.knowledge.stepDoc = "neutral";
  state.knowledge.stepNotion = "neutral";
  renderKnowledgePage();

  try {
    const videoBuffer = await videoFile.arrayBuffer();
    assertKnowledgeTranscriptionActive(runId);

    const result = await postJson(
      "/api/knowledge/transcribe",
      {
        config: state.config,
        knowledgeConfig: buildKnowledgeRuntimeConfig(),
        refs: state.knowledge.refs,
        template: state.knowledge.template,
        videoName,
        videoBase64: arrayBufferToBase64(videoBuffer)
      },
      { signal: abortController.signal }
    );
    assertKnowledgeTranscriptionActive(runId);

    let transcript = String(result.transcript || "").trim();
    const transcriptSourceLabel = String(result.sourceLabel || "").trim();
    const transcriptWarning = String(result.warning || "").trim();
    const transcriptSegments = Array.isArray(result.segments) ? result.segments : [];

    state.knowledge.transcriptionSourceLabel =
      transcriptSourceLabel || deriveKnowledgeTranscriptionLabel();
    state.knowledge.transcriptMarkdown = String(result.markdown || "").trim();
    state.knowledge.transcriptMarkdownPath = String(result.markdownFilePath || "").trim();

    if (!transcript && state.knowledge.transcriptMarkdown) {
      transcript = deriveTranscriptFromKnowledgeMarkdown(state.knowledge.transcriptMarkdown);
    }

    if (!transcript && !state.knowledge.transcriptMarkdown) {
      throw new Error("\u672a\u83b7\u53d6\u5230\u53ef\u7528\u7684\u8f6c\u5199\u5185\u5bb9\u3002");
    }

    state.knowledge.stepAudio = "ready";
    state.knowledge.stepAsr = "ready";
    state.knowledge.statusMessage = transcriptWarning
      ? `\u8f6c\u5199\u5df2\u5b8c\u6210\uff0c${transcriptWarning}`
      : "\u8f6c\u5199\u5df2\u5b8c\u6210\uff0c\u53ef\u4ee5\u751f\u6210\u603b\u7ed3\u6587\u6863\u4e86\u3002";
    renderKnowledgePage();

    void playKnowledgeTranscriptAnimation({
      transcript,
      segments: transcriptSegments
    });
  } catch (error) {
    if (
      isKnowledgeAbortError(error) ||
      abortController.signal.aborted ||
      isKnowledgeTranscriptionStale(runId)
    ) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    state.knowledge.stepAsr = "error";
    state.knowledge.statusMessage = message;
    state.knowledge.transcriptPreview = "";
    state.knowledge.transcriptMarkdown = "";
    state.knowledge.transcriptMarkdownPath = "";
    state.knowledge.transcriptionSourceLabel = "";
    renderKnowledgePage();
    notify(message);
  } finally {
    if (state.knowledge.transcriptionRunId === runId) {
      state.knowledge.transcriptionRunId = "";
    }
    if (state.knowledge.transcriptionAbortController === abortController) {
      state.knowledge.transcriptionAbortController = null;
    }

    state.knowledge.isProcessing = false;
    state.knowledge.stopRequested = false;
    renderKnowledgePage();
  }
}

async function generateKnowledgeDocument() {
  if (state.knowledge.isProcessing || state.knowledge.isGeneratingDoc) {
    return;
  }

  const transcript = knowledgeTranscriptForSummary();
  if (!transcript) {
    notify("\u8bf7\u5148\u5b8c\u6210\u8f6c\u5199\uff0c\u518d\u751f\u6210\u603b\u7ed3\u6587\u6863\u3002");
    return;
  }

  if (!isLlmConfigured()) {
    const message = "\u5f53\u524d\u672a\u68c0\u6d4b\u5230\u53ef\u7528\u7684 LLM \u914d\u7f6e\u3002";
    state.knowledge.docError = message;
    state.knowledge.stepDoc = "error";
    state.knowledge.statusMessage = message;
    renderKnowledgePage();
    notify(message);
    return;
  }

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const title =
    String(state.knowledge.videoName || "")
      .replace(/\.[^.]+$/, "")
      .trim() || "\u77e5\u8bc6\u8f6c\u5f55";

  state.knowledge.isGeneratingDoc = true;
  state.knowledge.docGenerationRunId = runId;
  state.knowledge.docError = "";
  state.knowledge.stepDoc = "warning";
  state.knowledge.statusMessage = "\u6b63\u5728\u751f\u6210\u603b\u7ed3\u6587\u6863...";
  renderKnowledgePage();

  try {
    const result = await runtimeApi.generateSummary({
      config: state.config,
      meetingTitle: title,
      recordMode: "video",
      summaryTemplate: state.knowledge.template || "learning",
      transcript
    });

    if (state.knowledge.docGenerationRunId !== runId) {
      return;
    }

    const docMarkdown = String(result?.content || "").trim();
    if (!docMarkdown) {
      throw new Error("\u6a21\u578b\u6ca1\u6709\u8fd4\u56de\u603b\u7ed3\u5185\u5bb9\u3002");
    }

    state.knowledge.docMarkdown = docMarkdown;
    state.knowledge.docError = "";
    state.knowledge.stepDoc = "ready";
    state.knowledge.statusMessage = "\u603b\u7ed3\u6587\u6863\u5df2\u751f\u6210\u3002";
    renderKnowledgePage();
  } catch (error) {
    if (state.knowledge.docGenerationRunId !== runId) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    state.knowledge.docMarkdown = "";
    state.knowledge.docError = message;
    state.knowledge.stepDoc = "error";
    state.knowledge.statusMessage = message;
    renderKnowledgePage();
    notify(message);
  } finally {
    if (state.knowledge.docGenerationRunId === runId) {
      state.knowledge.docGenerationRunId = "";
    }

    state.knowledge.isGeneratingDoc = false;
    renderKnowledgePage();
  }
}


function buildKnowledgeExportMarkdown() {
  const title =
    String(state.knowledge.videoName || "")
      .replace(/\.[^.]+$/, "")
      .trim() || "知识转写";
  const existingMarkdown = String(state.knowledge.transcriptMarkdown || "").trim();

  if (existingMarkdown) {
    return existingMarkdown;
  }

  const finalTranscript = String(
    state.knowledge.transcriptAnimation?.finalTranscript ||
      state.knowledge.transcriptPreview ||
      deriveTranscriptFromKnowledgeMarkdown(state.knowledge.transcriptMarkdown)
  ).trim();
  const sourceLabel =
    String(deriveKnowledgeSourceLabel() || state.config.video2docWhisperModel || "转写引擎").trim() ||
    "转写引擎";
  const languageLabel = video2docLanguageLabelFor(state.config.video2docLanguage);
  const lines = [
    `# ${title}`,
    "",
    `> 导出时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    `> 转写来源：${sourceLabel}`,
    `> 语言：${languageLabel}`,
    "",
    "## 转写内容",
    "",
    finalTranscript || "暂无可导出的转写内容。"
  ];
  const docMarkdown = String(state.knowledge.docMarkdown || "").trim();

  if (docMarkdown) {
    lines.push("", "## AI 整理", "", docMarkdown);
  }

  return lines.join("\n").trim();
}

async function exportKnowledgeMarkdown() {
  const content = buildKnowledgeExportMarkdown();

  if (!content.trim()) {
    notify("没有可导出的 Markdown 内容。");
    return;
  }

  const title =
    String(state.knowledge.videoName || "")
      .replace(/\.[^.]+$/, "")
      .trim() || "知识转写";
  await runtimeApi.exportMarkdown({
    content,
    defaultFileName: `${sanitizeFileName(title)}.md`
  });
}

async function archiveKnowledgeToNotion() {
  if (state.knowledge.isArchiving) {
    return;
  }

  const docMarkdown = buildKnowledgeExportMarkdown();
  if (!docMarkdown.trim()) {
    notify("没有可同步到 Notion 的内容。");
    return;
  }

  state.knowledge.isArchiving = true;
  state.knowledge.stepNotion = "warning";
  state.knowledge.statusMessage = "正在同步到 Notion...";
  state.knowledge.notionUrl = "";
  state.knowledge.notionResultMessage = "正在同步到 Notion...";
  renderKnowledgePage();

  try {
    const result = await postJson("/api/knowledge/archive-notion", {
      docMarkdown,
      refs: state.knowledge.refs,
      transcriptPreview: state.knowledge.transcriptPreview,
      videoName: state.knowledge.videoName
    });
    const notionUrl = String(result?.url || result?.notionUrl || "").trim();

    if (!notionUrl) {
      throw new Error("Notion 没有返回页面地址。");
    }

    state.knowledge.notionUrl = notionUrl;
    state.knowledge.notionResultMessage = "已同步到 Notion。";
    state.knowledge.stepNotion = "ready";
    state.knowledge.statusMessage = "已完成同步到 Notion。";
  } catch (error) {
    if (state.knowledge.stopRequested) {
      return;
    }

    const message =
      error instanceof Error ? error.message : String(error || "同步到 Notion 失败。");
    state.knowledge.stepNotion = "error";
    state.knowledge.statusMessage = message;
    state.knowledge.notionResultMessage = message;
    notify(message);
  } finally {
    state.knowledge.isArchiving = false;
    renderKnowledgePage();
  }
}

function render() {
  renderNavigation();
  renderTopbar();
  renderDashboard();
  renderRecordingPage();
  renderLibraryList();
  renderLibraryDetail();
  renderModelConfig();
  renderKnowledgePage();
}

async function queryPermission(name) {
  if (!navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const result = await navigator.permissions.query({ name });
    return result.state || "unknown";
  } catch {
    return "unknown";
  }
}

async function runDiagnostics() {
  state.permissions.mic = await queryPermission("microphone");

  if (navigator.mediaDevices?.enumerateDevices) {
    state.diagnostics.devices = await navigator.mediaDevices.enumerateDevices();
  }

  state.diagnostics.supportsDisplayCapture = Boolean(navigator.mediaDevices?.getDisplayMedia);
  state.diagnostics.supportsUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
  state.diagnostics.supportsMediaRecorder = typeof MediaRecorder !== "undefined";
  state.diagnostics.updatedAt = new Date().toISOString();
}

function stopAudioMonitor() {
  if (state.monitorFrameId) {
    window.cancelAnimationFrame(state.monitorFrameId);
    state.monitorFrameId = null;
  }

  state.audioMeterLevel = 0;
  state.audioDetected = false;
}

function startAudioMonitor(analyser) {
  stopAudioMonitor();
  const sampleBuffer = new Uint8Array(analyser.fftSize);

  const loop = () => {
    analyser.getByteTimeDomainData(sampleBuffer);

    let sumSquares = 0;
    for (let index = 0; index < sampleBuffer.length; index += 1) {
      const normalized = (sampleBuffer[index] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / sampleBuffer.length);
    state.audioMeterLevel = Math.min(1, rms * 4.2);
    state.audioDetected = state.audioMeterLevel > 0.06;

    if (state.audioDetected) {
      state.lastAudioActivityAt = new Date().toISOString();
    }

    renderRecordingPage();
    renderDashboard();
    state.monitorFrameId = window.requestAnimationFrame(loop);
  };

  state.monitorFrameId = window.requestAnimationFrame(loop);
}

function stopStream(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function buildPreferredDisplayMediaOptions() {
  return {
    video: {
      displaySurface: "browser"
    },
    audio: {
      suppressLocalAudioPlayback: false
    },
    monitorTypeSurfaces: "exclude",
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "include",
    systemAudio: "include"
  };
}

function buildFallbackDisplayMediaOptions() {
  return {
    video: true,
    audio: true
  };
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeMonoPcmToWav(samples, sampleRate) {
  const frameCount = samples.length;
  const bytesPerSample = 2;
  const dataLength = frameCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] || 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += bytesPerSample;
  }

  return buffer;
}

function createPcmChunkRecorder(resources, { chunkMs }) {
  const audioContext = resources?.audioContext;
  const mixedStream = resources?.stream;
  const sourceNodes = Array.isArray(resources?.sourceNodes) ? resources.sourceNodes : [];

  if (!audioContext || !mixedStream || typeof audioContext.createScriptProcessor !== "function") {
    return null;
  }

  const processorNode = audioContext.createScriptProcessor(2048, 1, 1);
  const silenceGain = audioContext.createGain();
  silenceGain.gain.value = 0;
  const processorSources = sourceNodes.length
    ? sourceNodes
    : [audioContext.createMediaStreamSource(mixedStream)];

  processorSources.forEach((node) => {
    node.connect(processorNode);
  });
  processorNode.connect(silenceGain);
  silenceGain.connect(audioContext.destination);

  const listeners = new Map([
    ["dataavailable", new Set()],
    ["error", new Set()],
    ["stop", new Set()]
  ]);

  const emit = (type, payload = {}) => {
    const bucket = listeners.get(type);
    if (!bucket) {
      return;
    }

    bucket.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // Ignore listener failures from UI handlers.
      }
    });
  };

  const targetFrameCount = Math.max(
    processorNode.bufferSize,
    Math.round(audioContext.sampleRate * (Number(chunkMs) || LIVE_CHUNK_MS) / 1000)
  );
  const initialFrameCount = Math.max(
    processorNode.bufferSize,
    Math.round(audioContext.sampleRate * LIVE_INITIAL_CHUNK_MS / 1000)
  );

  const sampleQueue = [];
  let queueFrameCount = 0;
  let queueHeadOffset = 0;
  let recorderState = "inactive";
  let isClosed = false;
  let hasEmittedChunk = false;

  const detach = () => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    processorNode.onaudioprocess = null;

    processorSources.forEach((node) => {
      try {
        if (sourceNodes.length) {
          node.disconnect(processorNode);
        } else {
          node.disconnect();
        }
      } catch {
        // Ignore disconnect races during shutdown.
      }
    });

    try {
      processorNode.disconnect();
    } catch {
      // Ignore disconnect races during shutdown.
    }

    try {
      silenceGain.disconnect();
    } catch {
      // Ignore disconnect races during shutdown.
    }
  };

  const consumeFrames = (frameCount) => {
    const output = new Float32Array(frameCount);
    let outputOffset = 0;

    while (outputOffset < frameCount && sampleQueue.length) {
      const head = sampleQueue[0];
      const available = head.length - queueHeadOffset;
      const take = Math.min(frameCount - outputOffset, available);
      output.set(head.subarray(queueHeadOffset, queueHeadOffset + take), outputOffset);
      outputOffset += take;
      queueHeadOffset += take;
      queueFrameCount -= take;

      if (queueHeadOffset >= head.length) {
        sampleQueue.shift();
        queueHeadOffset = 0;
      }
    }

    return output;
  };

  const flushChunks = (force = false) => {
    while (
      queueFrameCount >= (hasEmittedChunk ? targetFrameCount : initialFrameCount) ||
      (force && queueFrameCount > 0)
    ) {
      const frameCount = force
        ? queueFrameCount
        : hasEmittedChunk
          ? targetFrameCount
          : initialFrameCount;
      const samples = consumeFrames(frameCount);
      const wavBuffer = encodeMonoPcmToWav(samples, audioContext.sampleRate);
      emit("dataavailable", {
        data: new Blob([wavBuffer], { type: "audio/wav" })
      });
      hasEmittedChunk = true;
      force = false;
    }
  };

  processorNode.onaudioprocess = (event) => {
    if (recorderState !== "recording") {
      return;
    }

    try {
      const inputBuffer = event.inputBuffer;
      const channelCount = Math.max(1, inputBuffer.numberOfChannels);
      const monoSamples = new Float32Array(inputBuffer.length);

      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        const channelData = inputBuffer.getChannelData(channelIndex);
        for (let frameIndex = 0; frameIndex < channelData.length; frameIndex += 1) {
          monoSamples[frameIndex] += channelData[frameIndex] / channelCount;
        }
      }

      sampleQueue.push(monoSamples);
      queueFrameCount += monoSamples.length;
      flushChunks(false);
    } catch (error) {
      emit("error", {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  };

  return {
    mimeType: "audio/wav",
    get state() {
      return recorderState;
    },
    addEventListener(type, listener) {
      listeners.get(type)?.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    start() {
      if (recorderState !== "inactive") {
        return;
      }

      recorderState = "recording";
    },
    pause() {
      if (recorderState !== "recording") {
        return;
      }

      flushChunks(true);
      recorderState = "paused";
    },
    resume() {
      if (recorderState !== "paused") {
        return;
      }

      recorderState = "recording";
    },
    stop() {
      if (recorderState === "inactive") {
        emit("stop");
        return;
      }

      flushChunks(true);
      recorderState = "inactive";
      detach();
      emit("stop");
    }
  };
}

function shouldRetryDisplayCaptureWithFallback(error) {
  const name = String(error?.name || "").trim();
  const message = String(error?.message || error || "").trim();

  return (
    /TypeError|OverconstrainedError|NotSupportedError/i.test(name) ||
    /constraint|not supported|invalid/i.test(message)
  );
}

async function requestDisplayStream() {
  try {
    let displayStream = null;

    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia(
        buildPreferredDisplayMediaOptions()
      );
    } catch (error) {
      if (!shouldRetryDisplayCaptureWithFallback(error)) {
        throw error;
      }

      displayStream = await navigator.mediaDevices.getDisplayMedia(buildFallbackDisplayMediaOptions());
    }

    state.permissions.display = "granted";

    if (!displayStream.getAudioTracks().length) {
      state.permissions.systemAudio = "missing";
      stopStream(displayStream);
      throw new Error("No system audio detected. Please share the system audio source.");
    }

    state.permissions.systemAudio = "granted";
    return displayStream;
  } catch (error) {
    if (looksLikePermissionDenied(error)) {
      state.permissions.display = "denied";
      state.permissions.systemAudio = "denied";
    }

    throw error;
  }
}

async function requestMicrophoneStream() {
  try {
    const microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    state.permissions.mic = "granted";
    return microphoneStream;
  } catch (error) {
    if (looksLikePermissionDenied(error)) {
      state.permissions.mic = "denied";
    }

    throw error;
  }
}

async function buildCaptureResources() {
  const sourceStreams = [];

  try {
    if (state.audioSource === "system" || state.audioSource === "both") {
      sourceStreams.push(await requestDisplayStream());
    }

    if (state.audioSource === "mic" || state.audioSource === "both") {
      sourceStreams.push(await requestMicrophoneStream());
    }
  } catch (error) {
    sourceStreams.forEach(stopStream);
    throw error;
  }

  const audioContext = new AudioContext();
  await audioContext.resume();

  const destination = audioContext.createMediaStreamDestination();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;

  const sourceNodes = [];

  sourceStreams.forEach((stream) => {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      return;
    }

    const node = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
    node.connect(destination);
    node.connect(analyser);
    sourceNodes.push(node);
  });

  if (!sourceNodes.length) {
    sourceStreams.forEach(stopStream);
    await audioContext.close();
    throw new Error("No audio track is available for recording.");
  }

  const mixedStream = new MediaStream(destination.stream.getAudioTracks());
  const cleanup = async () => {
    stopAudioMonitor();
    stopStream(mixedStream);
    sourceStreams.forEach(stopStream);
    if (audioContext.state !== "closed") {
      await audioContext.close();
    }
  };

  return {
    analyser,
    audioContext,
    cleanup,
    sourceNodes,
    stream: mixedStream
  };
}

function resetLiveSession() {
  if (state.autoSummaryTimer) {
    window.clearTimeout(state.autoSummaryTimer);
    state.autoSummaryTimer = null;
  }

  state.aiSections = EMPTY_AI_SECTIONS();
  state.audioDetected = false;
  state.audioMeterLevel = 0;
  state.detailAiSections = EMPTY_AI_SECTIONS();
  state.detailSummaryError = "";
  state.detailTranscriptDraft = "";
  state.isSummarizing = false;
  state.captureStartInFlight = false;
  assignNextUntitledTitle();
  state.pendingTranscriptions = 0;
  state.recordedDurationMs = 0;
  state.recordingTranscriptAutoFollow = true;
  state.recordingTranscriptCollapsed = false;
  state.recordStartedAt = null;
  state.segments = [];
  state.selectedRecordId = null;
  state.sessionCreatedAt = new Date().toISOString();
  state.sessionId = crypto.randomUUID();
  state.workflowState = "idle";
  resetLiveTranscriptionState();
  stopAudioMonitor();
  stopDurationTimer();
  saveWorkspacePrefs();
}

function persistCurrentSession() {
  const transcript = buildTranscriptText().trim();
  const hasContent = transcript || state.aiSections.raw.trim();

  if (!hasContent) {
    return null;
  }

  const record = {
    id: state.sessionId,
    title: state.meetingTitle.trim() || resolveDraftFallbackTitle(),
    recordMode: templateToRecordMode(state.summaryTemplate),
    audioSource: state.audioSource,
    summaryTemplate: state.summaryTemplate,
    transcriptionLanguage: state.transcriptionLanguage,
    createdAt: state.sessionCreatedAt,
    updatedAt: new Date().toISOString(),
    durationMs: getCurrentDurationMs(),
    segmentCount: state.segments.length,
    transcript,
    aiSections: {
      ...state.aiSections
    }
  };

  const nextHistory = state.history.filter((item) => item.id !== record.id);
  nextHistory.unshift(record);
  state.history = nextHistory.slice(0, 100);
  saveHistory();
  return record;
}

function selectRecord(recordId, navigate = true) {
  const record = state.history.find((item) => item.id === recordId);
  if (!record) {
    return;
  }

  state.selectedRecordId = record.id;
  state.detailTranscriptDraft = historyRecordTranscript(record);
  state.detailAiSections = normalizeAiSections(record.aiSections);
  state.detailSummaryError = "";
  state.summaryTemplate = record.summaryTemplate || "meeting";
  state.transcriptionLanguage = record.transcriptionLanguage || "auto";
  state.audioSource = record.audioSource || state.audioSource;
  saveWorkspacePrefs();

  if (navigate) {
    state.currentPage = "library";
  }
}

function upsertSelectedRecord(updates) {
  const record = selectedRecord();
  if (!record) {
    return;
  }

  state.history = state.history.map((item) =>
    item.id === record.id
      ? {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString()
        }
      : item
  );
  saveHistory();
}

async function startCapture(options = {}) {
  if (
    state.isCapturing ||
    state.isPaused ||
    state.liveTranscriptionStopping ||
    state.captureStartInFlight
  ) {
    return;
  }

  state.captureStartInFlight = true;

  state.audioSource = "system";
  state.transcriptionLanguage = "auto";
  saveWorkspacePrefs();

  if (!supportsCurrentAudioSource()) {
    state.captureStartInFlight = false;
    notify("\u6240\u9009\u7684\u97f3\u9891\u6765\u6e90\u5728\u5f53\u524d\u73af\u5883\u4e2d\u4e0d\u53ef\u7528\u3002");
    return;
  }

  if (state.segments.length > 0 || state.aiSections.raw.trim()) {
    persistCurrentSession();
    resetLiveSession();
  }

  let startedSessionId = "";
  let preparedResources = null;

  try {
    const liveSession = await runtimeApi.startLiveTranscription({
      language: resolveAsrLanguageValue(),
      model: state.liveWhisperModel,
      prompt: buildTranscriptionPrompt()
    });
    startedSessionId = String(liveSession?.sessionId || "");

    if (!startedSessionId) {
      throw new Error("Live transcription session failed to start.");
    }

    state.liveSessionId = startedSessionId;
    state.liveChunkSeq = 0;
    state.liveSourceLabel =
      String(liveSession?.sourceLabel || "").trim() || buildLiveSourceLabel(state.liveWhisperModel);
    state.liveTranscriptionStopping = false;

    if (options.preparedCapture) {
      preparedResources = await options.preparedCapture;
      if (!preparedResources?.ok) {
        throw preparedResources?.error || new Error("准备录音资源失败。");
      }
    }

    const resources = preparedResources?.resources || (await buildCaptureResources());
    const mimeType = pickRecorderMimeType();
    const pcmRecorder = createPcmChunkRecorder(resources, {
      chunkMs: LIVE_CHUNK_MS
    });

    state.cleanupCaptureResources = resources.cleanup;
    state.recorder = pcmRecorder
      ? pcmRecorder
      : mimeType
        ? new MediaRecorder(resources.stream, { mimeType })
        : new MediaRecorder(resources.stream);
    const recorderMimeType = state.recorder.mimeType || mimeType || "audio/webm";

    state.recorder.addEventListener("dataavailable", (event) => {
      if (!event.data || event.data.size === 0) {
        return;
      }

      queueTranscription(event.data, recorderMimeType);
    });

    state.recorder.addEventListener("error", (event) => {
      notify(formatCaptureError(event.error || "\u5f55\u5236\u5668\u9519\u8bef\u3002"));
    });

    state.recorder.start(LIVE_CHUNK_MS);
    state.isCapturing = true;
    state.isPaused = false;
    state.recordStartedAt = Date.now();
    state.workflowState = "recording";
    startAudioMonitor(resources.analyser);
    beginDurationTimer();
    setPage("recording");
    state.captureStartInFlight = false;
  } catch (error) {
    state.isCapturing = false;
    state.isPaused = false;
    state.recordStartedAt = null;
    state.workflowState = "idle";
    state.captureStartInFlight = false;
    stopAudioMonitor();
    stopDurationTimer();

    if (!state.cleanupCaptureResources && preparedResources?.ok && preparedResources.resources?.cleanup) {
      try {
        await preparedResources.resources.cleanup();
      } catch {
        // Ignore prepared capture cleanup errors after failed startup.
      }
    }

    if (state.cleanupCaptureResources) {
      try {
        await state.cleanupCaptureResources();
      } catch {
        // Ignore cleanup errors after failed startup.
      }
      state.cleanupCaptureResources = null;
    }

    if (startedSessionId) {
      try {
        await runtimeApi.stopLiveTranscription({ sessionId: startedSessionId });
      } catch {
        // Ignore session cleanup errors after failed startup.
      }
    }

    state.recorder = null;
    resetLiveTranscriptionState();
    renderDashboard();
    renderRecordingPage();
    notify(formatCaptureError(error));
  }
}

function pauseCapture() {
  if (!state.recorder || !state.isCapturing || state.isPaused) {
    return;
  }

  if (state.recorder.state === "recording") {
    state.recorder.pause();
  }

  if (state.recordStartedAt) {
    state.recordedDurationMs += Date.now() - state.recordStartedAt;
  }

  state.recordStartedAt = null;
  state.isPaused = true;
  renderRecordingPage();
}

function resumeCapture() {
  if (!state.recorder || !state.isPaused) {
    return;
  }

  if (state.recorder.state === "paused") {
    state.recorder.resume();
  }

  state.isPaused = false;
  state.isCapturing = true;
  state.recordStartedAt = Date.now();
  renderRecordingPage();
}

function appendSegment(text, options = {}) {
  const elapsedMs = Number.isFinite(options.elapsedMs)
    ? Math.max(0, options.elapsedMs)
    : getCurrentDurationMs();

  state.segments.push({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    elapsedMs,
    highlighted: false,
    text
  });

  if (state.config.autoSummary && isLlmConfigured()) {
    scheduleAutoSummary();
  }

  renderRecordingPage();
  renderDashboard();
}

function queueTranscription(blob, mimeType) {
  if (!state.liveSessionId || shouldSkipLiveChunk()) {
    return;
  }

  const sessionId = state.liveSessionId;
  const seq = state.liveChunkSeq;
  const elapsedMs = getCurrentDurationMs();
  state.liveChunkSeq += 1;
  state.pendingTranscriptions += 1;
  renderDashboard();
  renderRecordingPage();

  state.transcriptionChain = state.transcriptionChain
    .catch(() => undefined)
    .then(async () => {
      const buffer = await blob.arrayBuffer();
      const result = await runtimeApi.transcribeLiveChunk({
        audioBase64: arrayBufferToBase64(buffer),
        mimeType,
        seq,
        sessionId
      });
      const sourceLabel = String(result?.sourceLabel || "").trim();
      if (sourceLabel && sourceLabel !== state.liveSourceLabel) {
        state.liveSourceLabel = sourceLabel;
        renderDashboard();
        renderRecordingPage();
      }
      const text = String(result?.text || "").trim();
      if (text) {
        appendSegment(text, { elapsedMs });
      }
    })
    .catch((error) => {
      notify(error instanceof Error ? error.message : String(error));
    })
    .finally(() => {
      state.pendingTranscriptions = Math.max(0, state.pendingTranscriptions - 1);
      renderDashboard();
      renderRecordingPage();
    });
}

function scheduleAutoSummary() {
  if (state.autoSummaryTimer) {
    window.clearTimeout(state.autoSummaryTimer);
  }

  state.autoSummaryTimer = window.setTimeout(() => {
    state.autoSummaryTimer = null;
    void generateSummary({ silent: true });
  }, 1200);
}

async function endCapture() {
  if (!state.recorder && !state.isCapturing && !state.isPaused && !state.liveSessionId) {
    return;
  }

  if (!state.isPaused && state.recordStartedAt) {
    state.recordedDurationMs += Date.now() - state.recordStartedAt;
  }

  state.recordStartedAt = null;
  state.isCapturing = false;
  state.isPaused = false;
  state.workflowState = "idle";
  stopDurationTimer();

  const recorder = state.recorder;
  const liveSessionId = state.liveSessionId;
  state.recorder = null;

  try {
    if (recorder && recorder.state !== "inactive") {
      await new Promise((resolve) => {
        recorder.addEventListener("stop", resolve, { once: true });
        recorder.stop();
      });
    }

    state.liveTranscriptionStopping = Boolean(liveSessionId);
    renderRecordingPage();

    await state.transcriptionChain.catch(() => undefined);

    if (liveSessionId) {
      try {
        await runtimeApi.stopLiveTranscription({ sessionId: liveSessionId });
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error));
      }
    }

    resetLiveTranscriptionState();

    if (state.cleanupCaptureResources) {
      try {
        await state.cleanupCaptureResources();
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error));
      }
      state.cleanupCaptureResources = null;
    }

    const record = persistCurrentSession();
    if (record) {
      state.selectedRecordId = record.id;
      state.detailTranscriptDraft = historyRecordTranscript(record);
      state.detailAiSections = normalizeAiSections(record.aiSections);
      state.detailSummaryError = "";
      state.currentPage = "recording";
      render();
      return;
    }

    resetLiveSession();
    setPage("recording");
    render();
  } catch (error) {
    resetLiveTranscriptionState();
    if (state.cleanupCaptureResources) {
      try {
        await state.cleanupCaptureResources();
      } catch {
        // Ignore cleanup errors while reporting the primary stop failure.
      }
      state.cleanupCaptureResources = null;
    }
    notify(error instanceof Error ? error.message : String(error));
  }
}

function markLatestHighlight() {
  if (!state.segments.length) {
    return;
  }

  const latest = state.segments[state.segments.length - 1];
  latest.highlighted = !latest.highlighted;
  renderRecordingPage();
}

function parseAiSections(markdown, template) {
  const sections = EMPTY_AI_SECTIONS();
  const raw = String(markdown || "").trim();
  sections.raw = raw;

  if (!raw) {
    return sections;
  }

  const parsedByHeading = parseSectionsByHeadings(raw, template);
  if (parsedByHeading) {
    return parsedByHeading;
  }

  if (template === "learning") {
    const blocks = markdownBlocks(raw);
    sections.summary = blocks[0]?.content || "";
    sections.minutes = blocks[1]?.content || "";
    sections.tasks = blocks[2]?.content || "";
    sections.risks = blocks[3]?.content || "";
    return sections;
  }

  const blocks = markdownBlocks(raw);
  sections.summary = blocks[0]?.content || raw;
  sections.minutes = blocks[1]?.content || "";
  sections.tasks = blocks[2]?.content || "";
  sections.risks = blocks[3]?.content || "";
  return sections;
}

function activeTranscriptText() {
  if (state.currentPage === "library" && state.detailTranscriptDraft.trim()) {
    return state.detailTranscriptDraft.trim();
  }

  return buildTranscriptText().trim();
}

function activeTranscriptTextForSummary() {
  if (state.currentPage === "library" && selectedRecord()) {
    return historyRecordTranscriptForSummary(selectedRecord()).trim();
  }

  return activeTranscriptText();
}

function activeMeetingTitle() {
  if (state.currentPage === "library" && selectedRecord()) {
    return selectedRecord().title;
  }

  return state.meetingTitle.trim() || resolveDraftFallbackTitle();
}

async function generateSummary(options = {}) {
  const transcript = activeTranscriptTextForSummary();

  if (!transcript) {
    if (!options.silent) {
      notify("\u6ca1\u6709\u8f6c\u5199\u5185\u5bb9\u53ef\u603b\u7ed3\u3002");
    }
    return;
  }

  if (!isLlmConfigured()) {
    if (!options.silent) {
      notify("\u5f53\u524d\u672a\u68c0\u6d4b\u5230\u53ef\u7528\u7684 LLM \u914d\u7f6e\u3002");
    }
    return;
  }

  if (state.isSummarizing) {
    return;
  }

  state.isSummarizing = true;
  if (state.currentPage === "library") {
    state.detailSummaryError = "";
  }
  render();

  try {
    const result = await runtimeApi.generateSummary({
      config: state.config,
      meetingTitle: activeMeetingTitle(),
      recordMode: templateToRecordMode(state.summaryTemplate),
      summaryTemplate: state.summaryTemplate,
      transcript
    });

    const sections = parseAiSections(result.content, state.summaryTemplate);

    if (state.currentPage === "library" && selectedRecord()) {
      state.detailAiSections = sections;
      state.detailSummaryError = "";
      upsertSelectedRecord({
        aiSections: sections,
        summaryTemplate: state.summaryTemplate,
        transcriptionLanguage: state.transcriptionLanguage,
        transcript: state.detailTranscriptDraft
      });
    } else {
      state.aiSections = sections;
      const record = persistCurrentSession();
      if (record) {
        selectRecord(record.id, false);
      }
    }

    render();
  } catch (error) {
    if (state.currentPage === "library") {
      state.detailSummaryError = error instanceof Error ? error.message : String(error);
    }
    if (!options.silent) {
      notify(error instanceof Error ? error.message : String(error));
    }
  } finally {
    state.isSummarizing = false;
    render();
  }
}

function buildExportMarkdown({
  title,
  transcript,
  aiSections,
  summaryTemplate,
  transcriptionLanguage,
  audioSource
}) {
  const safeTitle = String(title || "未命名记录").trim() || "未命名记录";
  const template = summaryTemplate || "meeting";
  const language = transcriptionLanguage || "auto";
  const source = audioSource || "system";
  const summaryMarkdown = buildStructuredSummaryMarkdown(aiSections, template).trim();
  const transcriptText = String(transcript || "").trim();

  return [
    `# ${safeTitle}`,
    "",
    `- 模板：${summaryTemplateLabelFor(template)}`,
    `- 转写语言：${transcriptionLanguageLabelFor(language)}`,
    `- 音频来源：${audioSourceLabelFor(source)}`,
    `- 导出时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
    "",
    summaryMarkdown || "_暂无 AI 摘要_",
    "",
    "## 全量转写",
    "",
    transcriptText || "_暂无转写内容_"
  ].join("\n");
}

async function exportCurrentRecord() {
  let payload;

  if (state.currentPage === "library" && selectedRecord()) {
    const record = selectedRecord();
    payload = {
      title: record.title,
      transcript: state.detailTranscriptDraft.trim(),
      aiSections: state.detailAiSections,
      summaryTemplate: state.summaryTemplate,
      transcriptionLanguage: record.transcriptionLanguage || state.transcriptionLanguage,
      audioSource: record.audioSource
    };
  } else {
    payload = {
      title: state.meetingTitle.trim() || resolveDraftFallbackTitle(),
      transcript: buildTranscriptText().trim(),
      aiSections: state.aiSections,
      summaryTemplate: state.summaryTemplate,
      transcriptionLanguage: state.transcriptionLanguage,
      audioSource: state.audioSource
    };
  }

  if (!payload.transcript && !payload.aiSections.raw) {
    notify("\u6ca1\u6709\u8f6c\u5199\u5185\u5bb9\u53ef\u5bfc\u51fa\u3002");
    return;
  }

  await runtimeApi.exportMarkdown({
    content: buildExportMarkdown(payload),
    defaultFileName: `${sanitizeFileName(payload.title)}.md`
  });
}

function saveDetailTranscript() {
  const record = selectedRecord();

  if (!record) {
    notify("未找到可保存的记录。");
    return;
  }

  upsertSelectedRecord({
    transcript: state.detailTranscriptDraft,
    summaryTemplate: state.summaryTemplate,
    transcriptionLanguage: state.transcriptionLanguage
  });
  renderDashboard();
  notify("你的转写已本地保存。");
}

async function copyDetailSummary() {
  const record = selectedRecord();

  if (!record) {
    notify("未找到可复制的摘要。");
    return;
  }

  try {
    await navigator.clipboard.writeText(detailSummaryClipboardText(record));
    notify("摘要已复制到剪贴板。");
  } catch {
    notify("摘要复制失败，请重试。");
  }
}

async function testModelConnection(kind) {
  state.testResults[kind] = {
    status: "warning",
    message: "Testing connection..."
  };
  renderModelConfig();

  try {
    const result = await runtimeApi.testModelConnection({
      config: state.config,
      kind
    });

    state.testResults[kind] = {
      status: result.ok ? "success" : "error",
      message: result.message || (result.ok ? "Connection successful." : "Connection failed.")
    };
  } catch (error) {
    state.testResults[kind] = {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }

  renderDashboard();
  renderModelConfig();
}

function updateConfigValue(key, rawValue, type) {
  if (type === "checkbox") {
    state.config[key] = Boolean(rawValue);
  } else if (type === "number" || type === "range") {
    state.config[key] = Number(rawValue) || DEFAULT_CONFIG[key];
  } else if (key === "video2docWhisperModel") {
    state.config[key] = normalizeKnowledgeTranscriptionModel(rawValue);
  } else {
    state.config[key] = rawValue;
  }

  saveConfig();
  renderDashboard();
  renderModelConfig();
  renderKnowledgePage();
}

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      setPage(button.dataset.page);
    });
  });

  elements.globalSearch.addEventListener("input", (event) => {
    state.historySearch = event.target.value;
    renderDashboard();
    renderLibraryList();
  });

  elements.dashboardStartBtn.addEventListener("click", () => {
    startRecordingFlow();
  });
  elements.dashboardOpenLibraryBtn.addEventListener("click", () => setPage("knowledge"));
  elements.viewLibraryBtn.addEventListener("click", () => setPage("library"));

  if (elements.dashboardChatbotDraft) {
    elements.dashboardChatbotDraft.addEventListener("input", (event) => {
      state.chatbot.draft = event.target.value;
      saveChatbotState();
      if (elements.dashboardChatbotSendBtn) {
        elements.dashboardChatbotSendBtn.disabled =
          state.chatbot.isSending || !String(state.chatbot.draft || "").trim();
      }
    });

    elements.dashboardChatbotDraft.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }

      event.preventDefault();
      void submitChatbotDraft();
    });
  }

  if (elements.dashboardChatbotKnowledgeToggle) {
    elements.dashboardChatbotKnowledgeToggle.addEventListener("change", (event) => {
      state.chatbot.knowledgeRetrieval = Boolean(event.target.checked);
      saveChatbotState();
      renderDashboard();
    });
  }

  if (elements.dashboardChatbotForm) {
    elements.dashboardChatbotForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitChatbotDraft();
    });
  }

  if (elements.dashboardChatbotNewBtn) {
    elements.dashboardChatbotNewBtn.addEventListener("click", () => {
      createChatbotSession();
      state.chatbot.draft = "";
      saveChatbotState();
      renderDashboard();
      elements.dashboardChatbotDraft?.focus();
    });
  }

  if (elements.dashboardChatbotDeleteBtn) {
    elements.dashboardChatbotDeleteBtn.addEventListener("click", () => {
      void deleteSelectedChatbotSession();
    });
  }

  if (elements.recordingStartBtn) {
    elements.recordingStartBtn.addEventListener("click", startRecordingFlow);
  }

  if (elements.recordingTitle) {
    elements.recordingTitle.addEventListener("input", (event) => {
      state.meetingTitle = event.target.value;
      saveWorkspacePrefs();
    });

    elements.recordingTitle.addEventListener("blur", (event) => {
      if (!event.target.value.trim()) {
        state.meetingTitle = resolveDraftFallbackTitle();
        saveWorkspacePrefs();
        renderRecordingPage();
        return;
      }

      state.meetingTitle = event.target.value.trim();
      event.target.value = state.meetingTitle;
      saveWorkspacePrefs();
    });

    elements.recordingTitle.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    });
  }

  if (elements.recordingTemplateSelect) {
    elements.recordingTemplateSelect.addEventListener("change", (event) => {
      state.summaryTemplate = event.target.value;
      saveWorkspacePrefs();
      render();
    });
  }

  if (elements.recordingWhisperModelSelect) {
    elements.recordingWhisperModelSelect.addEventListener("change", (event) => {
      state.liveWhisperModel =
        String(event.target.value || "").trim() || LIVE_DEFAULT_WHISPER_MODEL;
      saveWorkspacePrefs();
      renderRecordingPage();
    });
  }

  if (elements.recordingDeleteBtn) {
    elements.recordingDeleteBtn.addEventListener("click", () => {
      deleteCurrentRecording();
    });
  }

  if (elements.recordingCollapseToggle) {
    elements.recordingCollapseToggle.addEventListener("click", () => {
      toggleRecordingTranscript();
    });
  }

  if (elements.recordingSecondaryAction) {
    elements.recordingSecondaryAction.addEventListener("click", () => {
      createNewRecordingDraft();
    });
  }

  if (elements.recordingModuleStack) {
    elements.recordingModuleStack.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-recording-module]");
      if (!button) {
        return;
      }

      openRecordingModuleDetail(button.dataset.openRecordingModule);
    });
  }

  if (elements.recordingTranscript) {
    elements.recordingTranscript.addEventListener("scroll", () => {
      syncRecordingTranscriptAutoFollow();
    });
  }

  if (elements.libraryRecordList) {
    elements.libraryRecordList.addEventListener("scroll", () => {
      syncLibraryRecordSlider();
    });
  }

  if (elements.libraryRecordSlider) {
    elements.libraryRecordSlider.addEventListener("input", (event) => {
      setLibraryRecordScrollFromSlider(event.target.value);
    });
  }

  window.addEventListener("resize", () => {
    window.requestAnimationFrame(() => {
      syncLibraryRecordSlider();
    });
  });

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat || !isRecordShortcut(event) || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleRecordShortcutTrigger();
    },
    true
  );

  if (typeof runtimeApi.onShortcutTriggered === "function") {
    runtimeApi.onShortcutTriggered((payload) => {
      if (payload?.action === "start-recording") {
        handleRecordShortcutTrigger();
      }
    });
  }

  if (elements.detailBackBtn) {
    elements.detailBackBtn.addEventListener("click", () => setPage("dashboard"));
  }

  elements.pauseBtn.addEventListener("click", pauseCapture);
  elements.resumeBtn.addEventListener("click", resumeCapture);
  elements.markHighlightBtn.addEventListener("click", markLatestHighlight);
  elements.stopBtn.addEventListener("click", () => {
    void endCapture();
  });

  elements.dashboardRecords.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-record]");
    if (!button) {
      return;
    }

    selectRecord(button.dataset.openRecord);
    render();
  });

  if (elements.dashboardChatbotSessions) {
    elements.dashboardChatbotSessions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-chatbot-session]");
      if (!button) {
        return;
      }

      selectChatbotSession(button.dataset.chatbotSession);
      renderDashboard();
    });
  }

  elements.libraryRecordList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-library-item]");
    if (!item) {
      return;
    }

    selectRecord(item.dataset.libraryItem, false);
    if (elements.detailRecordPicker) {
      elements.detailRecordPicker.open = false;
    }
    render();
  });

  if (elements.detailTemplateSelect) {
    elements.detailTemplateSelect.addEventListener("change", (event) => {
      state.summaryTemplate = event.target.value;
      saveWorkspacePrefs();

      if (selectedRecord()) {
        upsertSelectedRecord({
          summaryTemplate: state.summaryTemplate
        });
      }

      render();
    });
  }

  if (elements.detailGenerateBtn) {
    elements.detailGenerateBtn.addEventListener("click", () => {
      void generateSummary();
    });
  }
  if (elements.detailCopyBtn) {
    elements.detailCopyBtn.addEventListener("click", () => {
      void copyDetailSummary();
    });
  }
  if (elements.detailSaveBtn) {
    elements.detailSaveBtn.addEventListener("click", saveDetailTranscript);
  }
  if (elements.detailExportBtn) {
    elements.detailExportBtn.addEventListener("click", () => {
      void exportCurrentRecord();
    });
  }

  if (elements.detailAiOutput) {
    elements.detailAiOutput.addEventListener("change", (event) => {
      const checkbox = event.target.closest(".todo-toggle");
      if (!checkbox) {
        return;
      }

      const record = selectedRecord();
      if (!record) {
        return;
      }

      const taskKey = String(checkbox.dataset.todoKey || "").trim();
      if (!taskKey) {
        return;
      }

      const todoStates = normalizeTodoStates(record.todoStates);
      if (checkbox.checked) {
        todoStates[taskKey] = true;
      } else {
        delete todoStates[taskKey];
      }

      upsertSelectedRecord({ todoStates });
    });
  }

  if (elements.knowledgeVideoInput) {
    elements.knowledgeVideoInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      event.target.value = "";

      if (state.knowledge.isProcessing) {
        stopKnowledgeTranscription({ silent: true });
      } else {
        stopKnowledgeTranscriptAnimation();
      }

      state.knowledge.isProcessing = false;
      state.knowledge.stopRequested = false;
      state.knowledge.transcriptionAbortController = null;
      state.knowledge.transcriptionRunId = "";
      state.knowledge.videoFile = file;
      state.knowledge.videoName = file?.name || "";
      state.knowledge.docMarkdown = "";
      state.knowledge.docError = "";
      state.knowledge.docGenerationRunId = "";
      state.knowledge.isGeneratingDoc = false;
      state.knowledge.transcriptMarkdown = "";
      state.knowledge.transcriptMarkdownPath = "";
      state.knowledge.transcriptPreview = "";
      state.knowledge.transcriptionSourceLabel = "";
      state.knowledge.stepAudio = file ? "ready" : "neutral";
      state.knowledge.stepAsr = "neutral";
      state.knowledge.stepDoc = "neutral";
      state.knowledge.stepNotion = "neutral";
      state.knowledge.statusMessage = file ? "已导入视频，等待开始转写。" : "等待导入";
      renderKnowledgePage();
    });
  }

  if (elements.knowledgeTopbar) {
    elements.knowledgeTopbar.addEventListener("click", (event) => {
      if (event.target.closest("button, select, input, textarea, a")) {
        return;
      }
      if (state.knowledge.isArchiving || state.knowledge.isGeneratingDoc) {
        return;
      }
      elements.knowledgeVideoInput?.click();
    });

    elements.knowledgeTopbar.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      if (event.target.closest("button, select, input, textarea, a")) {
        return;
      }
      if (state.knowledge.isArchiving || state.knowledge.isGeneratingDoc) {
        return;
      }

      event.preventDefault();
      elements.knowledgeVideoInput?.click();
    });
  }

  if (elements.knowledgeRefsInput) {
    elements.knowledgeRefsInput.addEventListener("input", (event) => {
      state.knowledge.refs = event.target.value;
    });
  }

  if (elements.knowledgeTemplateSelect) {
    elements.knowledgeTemplateSelect.addEventListener("change", (event) => {
      state.knowledge.template = event.target.value;
    });
  }

  if (elements.knowledgeStartBtn) {
    elements.knowledgeStartBtn.addEventListener("click", () => {
      elements.knowledgeVideoInput?.click();
    });
  }

  if (elements.knowledgeArchiveBtn) {
    elements.knowledgeArchiveBtn.addEventListener("click", () => {
      if (state.knowledge.isProcessing) {
        stopKnowledgeTranscription();
        return;
      }

      void startKnowledgeTranscription();
    });
  }

  if (elements.knowledgeGenerateDocBtn) {
    elements.knowledgeGenerateDocBtn.addEventListener("click", () => {
      void generateKnowledgeDocument();
    });
  }

  if (elements.knowledgeExportMarkdownBtn) {
    elements.knowledgeExportMarkdownBtn.addEventListener("click", () => {
      void exportKnowledgeMarkdown();
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("#detail-inline-report-btn");
    if (!button) {
      return;
    }

    void generateSummary();
  });

  if (elements.settingsLanguage) {
    elements.settingsLanguage.addEventListener("change", (event) => {
      state.transcriptionLanguage = event.target.value;
      saveWorkspacePrefs();
      render();
    });
  }

  if (elements.settingsAudioSource) {
    elements.settingsAudioSource.addEventListener("change", (event) => {
      state.audioSource = event.target.value;
      saveWorkspacePrefs();
      render();
    });
  }

  if (elements.settingsTemplate) {
    elements.settingsTemplate.addEventListener("change", (event) => {
      state.summaryTemplate = event.target.value;
      saveWorkspacePrefs();
      render();
    });
  }

  document.querySelectorAll("[data-config-key]").forEach((field) => {
    const applyConfigChange = (event) => {
      const key = event.target.getAttribute("data-config-key");
      const rawValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      updateConfigValue(key, rawValue, event.target.type);
    };

    field.addEventListener("input", applyConfigChange);
    field.addEventListener("change", applyConfigChange);
  });

  if (elements.testAsrBtn) {
    elements.testAsrBtn.addEventListener("click", () => {
      void testModelConnection("asr");
    });
  }

  if (elements.testLlmBtn) {
    elements.testLlmBtn.addEventListener("click", () => {
      void testModelConnection("llm");
    });
  }

  if (elements.restorePromptsBtn) {
    elements.restorePromptsBtn.addEventListener("click", () => {
      state.config.transcriptionPrompt = DEFAULT_CONFIG.transcriptionPrompt;
      state.config.summaryPromptMeeting = DEFAULT_CONFIG.summaryPromptMeeting;
      state.config.summaryPromptVideo = DEFAULT_CONFIG.summaryPromptVideo;
      state.config.summaryPromptCustom = DEFAULT_CONFIG.summaryPromptCustom;
      saveConfig();
      renderModelConfig();
    });
  }

  window.addEventListener("beforeunload", () => {
    persistCurrentSession();
    stopAudioMonitor();
    stopDurationTimer();
  });
}

bindEvents();
void runDiagnostics();
render();
void syncChatbotHealth();


