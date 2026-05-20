const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_SUMMARY_MODEL = "gpt-5.4-nano";
const LLM_RETRY_DELAYS_MS = [450, 900];

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function resolveEndpoint(baseUrl, endpoint) {
  return `${normalizeBaseUrl(baseUrl)}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function resolveOpenAiBaseUrl(baseUrl) {
  const normalized = String(baseUrl || "").trim();
  if (!normalized || normalized === "https://api.openai.com") {
    return DEFAULT_OPENAI_BASE_URL;
  }

  return normalized;
}

function parseJsonResponse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessageOf(error) {
  return String(error instanceof Error ? error.message : error || "").trim();
}

function errorCodeOf(error) {
  return String(error?.code || error?.type || "").trim();
}

function causeCodeOf(error) {
  return String(error?.cause?.code || "").trim();
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

function isUnsupportedRegionError(error) {
  const haystack = [errorMessageOf(error), errorCodeOf(error)].join(" ");
  return /unsupported_country_region_territory|Country, region, or territory not supported/i.test(
    haystack
  );
}

function isInvalidApiKeyError(error) {
  const haystack = [errorMessageOf(error), errorCodeOf(error)].join(" ");
  return /invalid_api_key|Incorrect API key provided|unauthorized|authentication/i.test(haystack);
}

function isQuotaError(error) {
  const haystack = [errorMessageOf(error), errorCodeOf(error)].join(" ");
  return /insufficient_quota|quota|billing/i.test(haystack);
}

function isModelAccessError(error) {
  const haystack = [errorMessageOf(error), errorCodeOf(error)].join(" ");
  return /model.*does not exist|model_not_found|access.*denied|permission/i.test(haystack);
}

function isTransientLlmError(error) {
  if (isAbortError(error)) {
    return false;
  }

  const haystack = [errorMessageOf(error), errorCodeOf(error), causeCodeOf(error)].join(" ");
  return /fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|UND_ERR_SOCKET|socket|other side closed/i.test(
    haystack
  );
}

function humanizeLlmError(error, baseUrl) {
  const message = errorMessageOf(error);
  const causeCode = causeCodeOf(error);
  const suffix = causeCode ? ` / ${causeCode}` : "";

  if (isUnsupportedRegionError(error)) {
    return "OpenAI 当前返回区域限制：Country, region, or territory not supported。请检查当前网络出口地区，或改用当前环境可访问的 LLM 提供方。";
  }

  if (isInvalidApiKeyError(error)) {
    return "当前 LLM API Key 无效或未授权。请检查 OpenAI Key 是否填写正确，并确认该 Key 具备模型访问权限。";
  }

  if (isQuotaError(error)) {
    return "当前 LLM 账户额度不足或计费不可用。请检查 OpenAI 账户配额与计费状态。";
  }

  if (isModelAccessError(error)) {
    return "当前 LLM 模型不可用或无访问权限。请检查模型名称是否正确，以及账户是否有该模型权限。";
  }

  if (isTransientLlmError(error)) {
    return `LLM 总结请求连接中断（${message || "fetch failed"}${suffix}）。系统已自动重试；如果仍然失败，请检查网络/代理，或确认 LLM Base URL 是否可访问：${baseUrl}`;
  }

  return message || "AI 总结生成失败。";
}

function wrapLlmError(error, baseUrl) {
  const wrapped = new Error(humanizeLlmError(error, baseUrl), {
    cause: error instanceof Error ? error : undefined
  });
  wrapped.code = error?.code || "";
  wrapped.status = error?.status;
  return wrapped;
}

function ensureUint8Array(bufferLike) {
  if (bufferLike instanceof Uint8Array) {
    return bufferLike;
  }

  if (bufferLike instanceof ArrayBuffer) {
    return new Uint8Array(bufferLike);
  }

  if (ArrayBuffer.isView(bufferLike)) {
    return new Uint8Array(
      bufferLike.buffer,
      bufferLike.byteOffset,
      bufferLike.byteLength
    );
  }

  if (bufferLike && bufferLike.type === "Buffer" && Array.isArray(bufferLike.data)) {
    return Uint8Array.from(bufferLike.data);
  }

  throw new Error("无法处理音频数据。");
}

function resolveAsrConfig(config) {
  return {
    apiKey: config.asrApiKey || config.apiKey || "",
    baseUrl: config.asrBaseUrl || config.baseUrl,
    language: config.asrLanguage || config.language || "",
    model: config.asrModel || config.transcriptionModel
  };
}

function resolveLlmConfig(config) {
  return {
    apiKey:
      config.llmApiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENAI_LLM_API_KEY ||
      config.apiKey ||
      "",
    baseUrl: resolveOpenAiBaseUrl(
      config.llmBaseUrl ||
        process.env.OPENAI_BASE_URL ||
        process.env.OPENAI_API_BASE ||
        config.baseUrl ||
        ""
    ),
    meetingPrompt: config.summaryPromptMeeting || config.summaryPrompt || "",
    model:
      config.llmModel ||
      process.env.OPENAI_LLM_MODEL ||
      process.env.OPENAI_MODEL ||
      config.summaryModel ||
      DEFAULT_OPENAI_SUMMARY_MODEL,
    videoPrompt: config.summaryPromptVideo || config.summaryPrompt || ""
  };
}

function buildAuthHeaders(config) {
  const headers = {};

  if (config.apiKey && String(config.apiKey).trim()) {
    headers.Authorization = `Bearer ${String(config.apiKey).trim()}`;
  }

  return headers;
}

function buildLlmCompletionOptions({ model, maxTokens, temperature }) {
  const normalizedModel = String(model || "").trim().toLowerCase();
  const payload = {
    temperature
  };

  if (normalizedModel.startsWith("gpt-5")) {
    payload.max_completion_tokens = maxTokens;
  } else {
    payload.max_tokens = maxTokens;
  }

  return payload;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const rawText = await response.text();
  const data = parseJsonResponse(rawText);

  if (!response.ok) {
    const error = new Error(data?.error?.message || rawText || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code || "";
    error.type = data?.error?.type || "";
    error.rawText = rawText;
    throw error;
  }

  return data ?? { rawText };
}

async function requestLlmJsonWithRetry(url, init, { baseUrl, maxAttempts = 3 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await requestJson(url, init);
    } catch (error) {
      lastError = error;

      if (!isTransientLlmError(error) || attempt >= maxAttempts) {
        break;
      }

      const delayMs =
        LLM_RETRY_DELAYS_MS[Math.min(attempt - 1, LLM_RETRY_DELAYS_MS.length - 1)] || 0;
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw wrapLlmError(lastError, baseUrl || url);
}

async function transcribeChunk({ config, buffer, mimeType, prompt }) {
  const asr = resolveAsrConfig(config);
  const audioBytes = ensureUint8Array(buffer);
  const blob = new Blob([audioBytes], {
    type: mimeType || "audio/webm"
  });
  const extension = mimeType?.includes("mp4") ? "m4a" : "webm";
  const formData = new FormData();

  formData.append("file", blob, `chunk.${extension}`);
  formData.append("model", asr.model);
  formData.append("response_format", "json");

  if (asr.language && String(asr.language).trim()) {
    formData.append("language", String(asr.language).trim());
  }

  if (prompt && String(prompt).trim()) {
    formData.append("prompt", String(prompt).trim());
  }

  const data = await requestJson(resolveEndpoint(asr.baseUrl, "/audio/transcriptions"), {
    method: "POST",
    headers: buildAuthHeaders(asr),
    body: formData
  });

  return {
    text: typeof data.text === "string" ? data.text.trim() : "",
    raw: data
  };
}

function meetingPrompt(configPrompt) {
  return (
    String(configPrompt || "").trim() ||
    "你是一名会议纪要助手。请只使用中文输出，并严格按以下 Markdown 标题返回：## 当前总结、## 会议纪要、## 待办事项、## 风险与待确认。待办事项尽量写成“任务 | 负责人建议 | 截止时间建议 | 状态”的列表。"
  );
}

function videoPrompt(configPrompt) {
  return (
    String(configPrompt || "").trim() ||
    "你是一名视频学习助手。请只使用中文输出，并严格按以下 Markdown 标题返回：## 当前总结、## 内容笔记、## 重点回顾、## 风险与待确认。重点回顾里请给出可执行的复习建议或后续行动。"
  );
}

function interviewPrompt(configPrompt) {
  return (
    String(configPrompt || "").trim() ||
    "你是一名用户访谈分析助手。请只使用中文输出，并严格按以下 Markdown 标题返回：## 当前总结、## 用户背景、## 核心需求、## 主要痛点、## 原话摘录、## 产品机会、## 后续动作。"
  );
}

function salesPrompt(configPrompt) {
  return (
    String(configPrompt || "").trim() ||
    "你是一名销售跟进助手。请只使用中文输出，并严格按以下 Markdown 标题返回：## 当前总结、## 客户背景、## 核心需求、## 主要异议、## 跟进建议、## 下一步动作。"
  );
}

function customPrompt(configPrompt) {
  return (
    String(configPrompt || "").trim() ||
    "请只使用中文输出，并根据用户给出的转写内容生成结构化 Markdown，总结重点、可执行事项与风险。"
  );
}

function buildSummaryPrompts({ config, meetingTitle, recordMode, summaryTemplate, transcript }) {
  const llm = resolveLlmConfig(config);
  const template = summaryTemplate || (recordMode === "video" ? "learning" : "meeting");

  if (template === "learning") {
    return {
      systemPrompt: videoPrompt(llm.videoPrompt),
      userPrompt: [
        `记录标题：${meetingTitle || "未命名视频记录"}`,
        "",
        "请基于下面的转写内容整理学习型结果。",
        "要求：",
        "1. 严格使用以下标题：## 当前总结、## 内容笔记、## 重点回顾、## 风险与待确认。",
        "2. 当前总结先给 3-5 条重点。",
        "3. 内容笔记可以按章节、主题或时间线组织。",
        "4. 重点回顾尽量给出复习建议、关键结论或后续行动。",
        "5. 不确定的内容请写到“风险与待确认”。",
        "",
        "转写内容：",
        transcript
      ].join("\n")
    };
  }

  if (template === "interview") {
    return {
      systemPrompt: interviewPrompt(llm.meetingPrompt),
      userPrompt: [
        `访谈标题：${meetingTitle || "未命名访谈"}`,
        "",
        "请基于下面的转写内容整理访谈结果。",
        "要求：",
        "1. 严格使用以下标题：## 当前总结、## 用户背景、## 核心需求、## 主要痛点、## 原话摘录、## 产品机会、## 后续动作。",
        "2. 原话摘录优先保留最能代表用户意图和情绪的句子。",
        "3. 不确定的信息请谨慎表述，不要编造。",
        "",
        "转写内容：",
        transcript
      ].join("\n")
    };
  }

  if (template === "sales") {
    return {
      systemPrompt: salesPrompt(llm.meetingPrompt),
      userPrompt: [
        `沟通标题：${meetingTitle || "未命名销售沟通"}`,
        "",
        "请基于下面的转写内容整理销售跟进结果。",
        "要求：",
        "1. 严格使用以下标题：## 当前总结、## 客户背景、## 核心需求、## 主要异议、## 跟进建议、## 下一步动作。",
        "2. 下一步动作要尽量明确责任、时间和目标。",
        "3. 不确定内容请明确标记。",
        "",
        "转写内容：",
        transcript
      ].join("\n")
    };
  }

  if (template === "custom") {
    return {
      systemPrompt: customPrompt(config.summaryPromptCustom),
      userPrompt: [
        `记录标题：${meetingTitle || "未命名记录"}`,
        "",
        "请严格遵循自定义模板要求，并仅基于以下转写内容输出。",
        "",
        "转写内容：",
        transcript
      ].join("\n")
    };
  }

  return {
    systemPrompt: meetingPrompt(llm.meetingPrompt),
    userPrompt: [
      `会议标题：${meetingTitle || "未命名会议"}`,
      "",
      "请基于下面的转写内容整理会议结果。",
      "要求：",
      "1. 严格使用以下标题：## 当前总结、## 会议纪要、## 待办事项、## 风险与待确认。",
      "2. 当前总结先给 3-5 条关键结论。",
      "3. 会议纪要里要清楚整理主要讨论、结论和上下文。",
      "4. 待办事项尽量写成“任务 | 负责人建议 | 截止时间建议 | 状态”的项目列表。",
      "5. 不确定或听写不清的内容请写到“风险与待确认”。",
      "",
      "转写内容：",
      transcript
    ].join("\n")
  };
}

async function generateSummary({ config, meetingTitle, recordMode, summaryTemplate, transcript }) {
  const llm = resolveLlmConfig(config);
  const { systemPrompt, userPrompt } = buildSummaryPrompts({
    config,
    meetingTitle,
    recordMode,
    summaryTemplate,
    transcript
  });

  const data = await requestLlmJsonWithRetry(
    resolveEndpoint(llm.baseUrl, "/chat/completions"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(llm)
      },
      body: JSON.stringify({
        model: llm.model,
        ...buildLlmCompletionOptions({
          model: llm.model,
          maxTokens: Number(config.llmMaxTokens) || 4096,
          temperature:
            config.llmTemperature !== undefined
              ? Number(config.llmTemperature)
              : 0.2
        }),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    },
    { baseUrl: llm.baseUrl }
  );

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("模型没有返回可用的结构化结果。");
  }

  return {
    content: content.trim(),
    raw: data
  };
}

async function testModelConnection({ config, kind }) {
  const target = kind === "llm" ? resolveLlmConfig(config) : resolveAsrConfig(config);

  if (!target.baseUrl || !target.model) {
    throw new Error("请先填写 Base URL 和模型名称。");
  }

  if (kind === "llm") {
    await requestLlmJsonWithRetry(
      resolveEndpoint(target.baseUrl, "/chat/completions"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(target)
        },
        body: JSON.stringify({
          ...buildLlmCompletionOptions({
            model: target.model,
            maxTokens: 1,
            temperature: 0
          }),
          messages: [{ role: "user", content: "ping" }],
          model: target.model
        })
      },
      { baseUrl: target.baseUrl, maxAttempts: 2 }
    );

    return {
      ok: true,
      message: "AI 总结模型连接正常。"
    };
  }

  try {
    await requestJson(resolveEndpoint(target.baseUrl, "/models"), {
      method: "GET",
      headers: buildAuthHeaders(target)
    });

    return {
      ok: true,
      message: "语音识别模型连接正常。"
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`连接测试失败：${rawMessage}`);
  }
}

module.exports = {
  generateSummary,
  testModelConnection,
  transcribeChunk
};
