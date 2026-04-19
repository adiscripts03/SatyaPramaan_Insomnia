describe("aiExplanation.service", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  it("returns null when AI explanation is disabled", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        AI_EXPLANATION_ENABLED: false,
        AI_PROVIDER: "openai_compatible",
        AI_API_KEY: "",
        AI_MODEL: "gpt-4.1-mini",
        AI_BASE_URL: "",
        AI_TIMEOUT_MS: 3000,
        AI_MAX_SUMMARY_CHARS: 280
      }
    }));

    const service = require("../../src/modules/verification/aiExplanation.service");
    const result = await service.generateVerificationAiExplanation({
      method: "upload",
      resultStatus: "verified",
      resultReasonCode: "VERIFIED",
      resultMessage: "Document is verified"
    });

    expect(result).toBeNull();
  });

  it("generates sanitized AI explanation for openai-compatible providers", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        AI_EXPLANATION_ENABLED: true,
        AI_PROVIDER: "openai_compatible",
        AI_API_KEY: "test-key",
        AI_MODEL: "gpt-4.1-mini",
        AI_BASE_URL: "https://api.openai.com/v1",
        AI_TIMEOUT_MS: 3000,
        AI_MAX_SUMMARY_CHARS: 40
      }
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "This is a long explanation summary that should be truncated by the service output sanitizer.",
                keyFindings: ["Finding one", "Finding two"],
                confidence: 82
              })
            }
          }
        ]
      })
    });

    const service = require("../../src/modules/verification/aiExplanation.service");
    const result = await service.generateVerificationAiExplanation({
      method: "upload",
      resultStatus: "tampered",
      resultReasonCode: "TEXT_DIFF_DETECTED",
      resultMessage: "Text differences were detected",
      detectors: {
        textLayerChanged: true,
        ocrLayerChanged: false,
        visualLayerChanged: false
      },
      changedWordCount: 5,
      changedPages: [1],
      ocrDiffSummary: { changedWordCount: 0, changedPages: [], confidence: 0.93 },
      summarySignals: ["Text token differences detected"]
    });

    expect(result).toEqual(
      expect.objectContaining({
        advisoryOnly: true,
        provider: "openai_compatible",
        model: "gpt-4.1-mini",
        confidence: 0.82,
        keyFindings: ["Finding one", "Finding two"]
      })
    );
    expect(result.summary.length).toBeLessThanOrEqual(40);
  });

  it("returns null when model output is not valid JSON", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        AI_EXPLANATION_ENABLED: true,
        AI_PROVIDER: "openai_compatible",
        AI_API_KEY: "test-key",
        AI_MODEL: "gpt-4.1-mini",
        AI_BASE_URL: "https://api.openai.com/v1",
        AI_TIMEOUT_MS: 3000,
        AI_MAX_SUMMARY_CHARS: 280
      }
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: "not-json"
            }
          }
        ]
      })
    });

    const service = require("../../src/modules/verification/aiExplanation.service");
    const result = await service.generateVerificationAiExplanation({
      method: "upload",
      resultStatus: "verified",
      resultReasonCode: "VERIFIED",
      resultMessage: "Document is verified"
    });

    expect(result).toBeNull();
  });

  it("returns disconnected health result when key is missing", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        AI_EXPLANATION_ENABLED: true,
        AI_PROVIDER: "openai_compatible",
        AI_API_KEY: "",
        AI_MODEL: "gpt-4.1-mini",
        AI_BASE_URL: "https://api.openai.com/v1",
        AI_TIMEOUT_MS: 3000,
        AI_MAX_SUMMARY_CHARS: 280
      }
    }));

    const service = require("../../src/modules/verification/aiExplanation.service");
    const health = await service.checkAiProviderHealth();

    expect(health.connected).toBe(false);
    expect(health.apiKeyConfigured).toBe(false);
    expect(health.message).toBe("AI API key is not configured");
  });

  it("returns connected health result when provider responds", async () => {
    jest.doMock("../../src/config/env", () => ({
      env: {
        AI_EXPLANATION_ENABLED: true,
        AI_PROVIDER: "openai_compatible",
        AI_API_KEY: "test-key",
        AI_MODEL: "gpt-4.1-mini",
        AI_BASE_URL: "https://api.openai.com/v1",
        AI_TIMEOUT_MS: 3000,
        AI_MAX_SUMMARY_CHARS: 280
      }
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: [] })
    });

    const service = require("../../src/modules/verification/aiExplanation.service");
    const health = await service.checkAiProviderHealth();

    expect(health.connected).toBe(true);
    expect(health.statusCode).toBe(200);
    expect(health.message).toBe("AI provider reachable");
  });
});
