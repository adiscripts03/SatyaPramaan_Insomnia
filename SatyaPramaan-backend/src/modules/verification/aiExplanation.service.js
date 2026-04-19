const { env } = require("../../config/env");

const GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const AI_DISCLAIMER = "AI-generated advisory explanation. Deterministic verification checks remain the source of truth.";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function truncateText(value, maxLength) {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  if (!Number.isFinite(maxLength) || maxLength <= 0 || input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength - 3).trim()}...`;
}

function clampConfidence(value) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return null;
  }

  if (normalized > 1) {
    return Math.max(0, Math.min(1, Number((normalized / 100).toFixed(3))));
  }

  return Math.max(0, Math.min(1, Number(normalized.toFixed(3))));
}

function sanitizeKeyFindings(value) {
  const rawList = Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
      ? value.items
      : [];

  return rawList
    .map((item) => truncateText(item, 140))
    .filter((item) => item.length > 0)
    .slice(0, 4);
}

function extractJsonObjectSegments(input) {
  if (typeof input !== "string") {
    return [];
  }

  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  const segments = [];

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth -= 1;

      if (depth === 0 && start >= 0) {
        segments.push(input.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return segments;
}

function parseJsonResponse(input) {
  const trimmed = String(input || "").trim();

  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed, ...extractJsonObjectSegments(trimmed)];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (_error) {
      // Try next candidate.
    }
  }

  return null;
}

function isAiEnabled() {
  return Boolean(env.AI_EXPLANATION_ENABLED && env.AI_API_KEY && env.AI_MODEL);
}

function buildPromptInput(input = {}) {
  const uiLanguage = String(input.uiLanguage || "en").toLowerCase();

  return {
    uiLanguage: uiLanguage === "hi" ? "hi" : "en",
    method: String(input.method || "upload"),
    status: String(input.resultStatus || "unknown"),
    reasonCode: String(input.resultReasonCode || "UNKNOWN"),
    reason: truncateText(input.resultMessage, 300),
    documentId: String(input.documentId || ""),
    detectors: {
      textLayerChanged: Boolean(input.detectors?.textLayerChanged),
      ocrLayerChanged: Boolean(input.detectors?.ocrLayerChanged),
      visualLayerChanged: Boolean(input.detectors?.visualLayerChanged)
    },
    changedWordCount: Number(input.changedWordCount) || 0,
    changedPages: Array.isArray(input.changedPages)
      ? input.changedPages.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [],
    ocrDiffSummary: {
      changedWordCount: Number(input.ocrDiffSummary?.changedWordCount) || 0,
      changedPages: Array.isArray(input.ocrDiffSummary?.changedPages)
        ? input.ocrDiffSummary.changedPages
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        : [],
      confidence: clampConfidence(input.ocrDiffSummary?.confidence)
    },
    summarySignals: Array.isArray(input.summarySignals)
      ? input.summarySignals.map((item) => truncateText(item, 140)).filter((item) => item.length > 0).slice(0, 8)
      : []
  };
}

function buildSystemPrompt(uiLanguage = "en") {
  const shouldUseHindi = String(uiLanguage || "en").toLowerCase() === "hi";

  return [
    "You generate concise, factual verification explanations.",
    "Use only provided facts.",
    "Do not change or reinterpret status/reasonCode.",
    shouldUseHindi
      ? "Respond in Hindi (Devanagari), unless an entity name must remain as-is."
      : "Respond in English.",
    "Return valid JSON only with this schema:",
    '{"summary":"string","keyFindings":["string"],"confidence":0.0,"disclaimer":"string"}'
  ].join(" ");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = Number(env.AI_TIMEOUT_MS) > 0 ? Number(env.AI_TIMEOUT_MS) : 5000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAiCompatible(promptInput) {
  const baseUrl = trimTrailingSlash(env.AI_BASE_URL || "https://api.openai.com/v1");
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(promptInput.uiLanguage) },
        {
          role: "user",
          content: `Verification facts: ${JSON.stringify(promptInput)}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("AI provider returned empty content");
  }

  return text;
}

async function callGemini(promptInput) {
  const baseUrl = trimTrailingSlash(env.AI_BASE_URL || GEMINI_DEFAULT_BASE_URL);
  const model = encodeURIComponent(env.AI_MODEL);
  const apiKey = encodeURIComponent(env.AI_API_KEY);

  const response = await fetchWithTimeout(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${buildSystemPrompt(promptInput.uiLanguage)}\nVerification facts: ${JSON.stringify(promptInput)}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("AI provider returned empty content");
  }

  return text;
}

async function generateVerificationAiExplanation(input) {
  if (!isAiEnabled()) {
    return null;
  }

  const promptInput = buildPromptInput(input);

  try {
    const rawResponse = env.AI_PROVIDER === "gemini"
      ? await callGemini(promptInput)
      : await callOpenAiCompatible(promptInput);

    const parsed = parseJsonResponse(rawResponse);

    if (!parsed) {
      return null;
    }

    const summary = truncateText(parsed.summary || parsed.explanation || "", env.AI_MAX_SUMMARY_CHARS);
    const keyFindings = sanitizeKeyFindings(parsed.keyFindings || parsed.findings || []);
    const confidence = clampConfidence(parsed.confidence);

    if (!summary && keyFindings.length === 0) {
      return null;
    }

    return {
      advisoryOnly: true,
      summary,
      keyFindings,
      confidence,
      disclaimer: AI_DISCLAIMER,
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      generatedAt: new Date().toISOString()
    };
  } catch (_error) {
    return null;
  }
}

async function checkAiProviderHealth() {
  const provider = env.AI_PROVIDER;
  const model = env.AI_MODEL;
  const apiKeyConfigured = Boolean(env.AI_API_KEY);
  const explanationEnabled = Boolean(env.AI_EXPLANATION_ENABLED);
  const baseUrl = trimTrailingSlash(
    env.AI_BASE_URL || (provider === "gemini" ? GEMINI_DEFAULT_BASE_URL : "https://api.openai.com/v1")
  );

  const payload = {
    explanationEnabled,
    provider,
    model,
    baseUrl,
    apiKeyConfigured,
    connected: false,
    checkedAt: new Date().toISOString(),
    statusCode: null,
    message: "AI explanation is disabled"
  };

  if (!explanationEnabled) {
    return payload;
  }

  if (!apiKeyConfigured) {
    return {
      ...payload,
      message: "AI API key is not configured"
    };
  }

  try {
    const response = provider === "gemini"
      ? await fetchWithTimeout(`${baseUrl}/models?key=${encodeURIComponent(env.AI_API_KEY)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        })
      : await fetchWithTimeout(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.AI_API_KEY}`
          }
        });

    if (response.ok) {
      return {
        ...payload,
        connected: true,
        statusCode: response.status,
        message: "AI provider reachable"
      };
    }

    return {
      ...payload,
      connected: false,
      statusCode: response.status,
      message: "AI provider returned a non-success status"
    };
  } catch (_error) {
    return {
      ...payload,
      connected: false,
      message: "AI provider request failed"
    };
  }
}

module.exports = {
  generateVerificationAiExplanation,
  checkAiProviderHealth
};
