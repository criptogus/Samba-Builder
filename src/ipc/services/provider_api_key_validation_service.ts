import { createGoogleGenerativeAI as createGoogle } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type LanguageModel } from "ai";
import log from "electron-log";

import { SambaError, SambaErrorKind, isSambaError } from "@/errors/samba_error";
import type { ProviderApiKeyValidationProvider } from "@/ipc/types";
import { readEffectiveSettings } from "@/main/settings";
import {
  findInvalidProviderApiKeyCharacter,
  formatInvalidProviderApiKeyMessage,
  normalizeProviderApiKeyInput,
} from "@/lib/providerApiKey";
import type { UserSettings } from "@/lib/schemas";
import { createSambaEngine } from "@/ipc/utils/llm_engine_provider";
import { fastTextOutput } from "@/ipc/utils/stream_text_utils";
import { IS_TEST_BUILD } from "@/ipc/utils/test_utils";
import { getSambaEngineBaseUrl } from "@/ipc/utils/samba_engine_url";
import { getTestFetchOption } from "@/ipc/utils/test_fetch_override";
import { getOpenRouterAppAttributionHeaders } from "@/ipc/utils/openrouter_attribution";

const logger = log.scope("provider_api_key_validation");

const VALIDATION_PROMPT =
  "What number is after four? Reply with only the number.";
const VALIDATION_TIMEOUT_MS = 20_000;

const PROVIDER_DISPLAY_NAMES: Record<ProviderApiKeyValidationProvider, string> =
  {
    google: "Google",
    openrouter: "OpenRouter",
    auto: "Samba Builder",
  };

export async function validateProviderApiKey({
  provider,
  apiKey,
}: {
  provider: ProviderApiKeyValidationProvider;
  apiKey: string;
}): Promise<{ ok: true }> {
  const normalizedApiKey = normalizeProviderApiKeyInput(apiKey);
  const providerDisplayName = PROVIDER_DISPLAY_NAMES[provider];

  if (!normalizedApiKey) {
    throw new SambaError("API Key cannot be empty.", SambaErrorKind.Validation);
  }

  const invalidCharacter = findInvalidProviderApiKeyCharacter(normalizedApiKey);
  if (invalidCharacter) {
    throw new SambaError(
      formatInvalidProviderApiKeyMessage(providerDisplayName, invalidCharacter),
      SambaErrorKind.Validation,
    );
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new SambaError(
          `${providerDisplayName} did not respond while checking this API key. Please try again.`,
          SambaErrorKind.External,
        ),
      );
    }, VALIDATION_TIMEOUT_MS);
  });

  // Some providers (e.g. the Samba Builder engine) report auth failures as an error
  // event inside an HTTP 200 stream. streamText surfaces those through
  // onError while its text promise resolves with empty text, so capture
  // and re-throw them to fail validation. For HTTP-level failures the text
  // promise rejects with a NoOutputGeneratedError wrapper while onError
  // receives the underlying APICallError, so the captured error is also the
  // better one to classify.
  let streamError: unknown;
  try {
    const stream = streamText({
      output: fastTextOutput(),
      model: await createValidationModel(provider, normalizedApiKey),
      maxOutputTokens: 8,
      temperature: 0,
      maxRetries: 0,
      abortSignal: controller.signal,
      onError: ({ error }) => {
        streamError = error;
      },
      messages: [{ role: "user", content: VALIDATION_PROMPT }],
    });

    const textPromise = Promise.resolve(stream.text);
    textPromise.catch(() => {});
    await Promise.race([textPromise, timeout]);
    if (streamError !== undefined) {
      throw streamError;
    }
    return { ok: true };
  } catch (error) {
    const rootError = isSambaError(error) ? error : (streamError ?? error);
    throw classifyValidationError(rootError, providerDisplayName);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function createValidationModel(
  provider: ProviderApiKeyValidationProvider,
  apiKey: string,
): Promise<LanguageModel> {
  switch (provider) {
    case "google": {
      const google = createGoogle({
        apiKey,
        baseURL: getGoogleBaseUrl(),
        ...getTestFetchOption(),
      });
      return google("gemini-flash-latest");
    }
    case "openrouter": {
      const openrouter = createOpenAICompatible({
        name: "openrouter",
        apiKey,
        baseURL: getOpenRouterBaseUrl(),
        headers: getOpenRouterAppAttributionHeaders(),
        ...getTestFetchOption(),
      });
      return openrouter("openrouter/free");
    }
    case "auto": {
      const settings = await readEffectiveSettings();
      const samba = createSambaEngine({
        apiKey,
        baseURL: getSambaEngineBaseUrl(),
        ...getTestFetchOption(),
        sambaOptions: {
          enableLazyEdits: false,
          enableSmartFilesContext: false,
          enableWebSearch: false,
        },
        settings: {
          ...settings,
          enableSambaPro: true,
          providerSettings: {
            ...settings.providerSettings,
            auto: {
              ...settings.providerSettings?.auto,
              apiKey: { value: apiKey },
            },
          },
        } satisfies UserSettings,
      });
      return samba("samba/auto", { providerId: "openai" });
    }
  }
}

function getGoogleBaseUrl() {
  if (IS_TEST_BUILD && process.env.FAKE_LLM_PORT) {
    return `http://localhost:${process.env.FAKE_LLM_PORT}/google/v1beta`;
  }
  return undefined;
}

function getOpenRouterBaseUrl() {
  if (IS_TEST_BUILD && process.env.FAKE_LLM_PORT) {
    return `http://localhost:${process.env.FAKE_LLM_PORT}/openrouter/v1`;
  }
  return "https://openrouter.ai/api/v1";
}

function classifyValidationError(
  error: unknown,
  providerDisplayName: string,
): SambaError {
  if (isSambaError(error)) {
    return error;
  }

  const errorMessage = extractErrorMessage(error);
  const statusCode =
    extractStatusCode(error) ?? extractStatusCodeFromMessage(errorMessage);

  logger.info(
    `Validation failed for ${providerDisplayName}: status=${statusCode ?? "unknown"} authError=${isAuthError(errorMessage)}`,
  );

  if (statusCode === 401 || statusCode === 403 || isAuthError(errorMessage)) {
    return new SambaError(
      `${providerDisplayName} rejected this API key. Try another API key or keep this one anyway.`,
      SambaErrorKind.Auth,
    );
  }

  if (
    statusCode === 429 ||
    /rate.?limit|too many requests/i.test(errorMessage)
  ) {
    return new SambaError(
      `${providerDisplayName} rate limited the API key check. You can try again later or keep this key anyway.`,
      SambaErrorKind.RateLimited,
    );
  }

  return new SambaError(
    `Samba Builder could not verify this ${providerDisplayName} API key: ${errorMessage || "Unknown error"}`,
    SambaErrorKind.External,
  );
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

function extractStatusCode(error: unknown, depth = 0): number | undefined {
  if (depth > 5 || typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    statusCode?: unknown;
    status?: unknown;
    response?: { status?: unknown };
    cause?: unknown;
  };
  const status =
    candidate.statusCode ?? candidate.status ?? candidate.response?.status;
  if (typeof status === "number") {
    return status;
  }
  return extractStatusCode(candidate.cause, depth + 1);
}

// Stream error events (e.g. from the Samba Builder engine's LiteLLM proxy) are plain
// strings that lead with the upstream status code, like
// "401 LiteLLM Virtual Key expected. ...".
function extractStatusCodeFromMessage(message: string): number | undefined {
  const match = /^\s*([45]\d{2})\b/.exec(message);
  return match ? Number(match[1]) : undefined;
}

function isAuthError(message: string) {
  return /api key|unauthorized|unauthenticated|invalid.?key|permission denied|forbidden/i.test(
    message,
  );
}
