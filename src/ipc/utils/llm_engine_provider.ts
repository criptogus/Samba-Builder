import { OpenAICompatibleChatLanguageModel } from "@ai-sdk/openai-compatible";
import { OpenAIResponsesLanguageModel } from "@ai-sdk/openai/internal";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from "@ai-sdk/provider-utils";

import log from "electron-log";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { getExtraProviderOptionsForEngine } from "./thinking_utils";
import { getTestFetchOption } from "./test_fetch_override";
import { SAMBA_INTERNAL_REQUEST_ID_HEADER } from "./provider_options";
import type { ModelSelection, UserSettings } from "../../lib/schemas";
import type { LanguageModel } from "ai";
import {
  findInvalidProviderApiKeyCharacter,
  formatInvalidProviderApiKeyMessage,
  normalizeProviderApiKeyInput,
} from "@/lib/providerApiKey";

const logger = log.scope("llm_engine_provider");

export type ExampleChatModelId = string & {};
export interface ChatParams {
  providerId: string;
}

type SambaEngineProviderOptions = Record<string, any>;

export interface ExampleProviderSettings {
  /**
Example API key.
*/
  apiKey?: string;
  /**
Base URL for the API calls.
*/
  baseURL?: string;
  /**
Custom headers to include in the requests.
*/
  headers?: Record<string, string>;
  /**
Optional custom url query parameters to include in request urls.
*/
  queryParams?: Record<string, string>;
  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
*/
  fetch?: FetchFunction;

  sambaOptions: {
    enableLazyEdits?: boolean;
    enableSmartFilesContext?: boolean;
    enableWebSearch?: boolean;
  };
  settings: UserSettings;
  modelSelection?: ModelSelection;
}

export interface SambaEngineProvider {
  /**
Creates a model for text generation.
*/
  (modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;

  /**
Creates a chat model for text generation.
*/
  chatModel(modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;

  freeChatModel(
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
  ): LanguageModel;

  responses(modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;

  anthropic(modelId: ExampleChatModelId, chatParams: ChatParams): LanguageModel;
}

export function createSambaEngine(
  options: ExampleProviderSettings,
): SambaEngineProvider {
  const modelSelection =
    options.modelSelection ??
    ({
      ...options.settings.selectedModel,
      effortLevel: "medium",
    } satisfies ModelSelection);
  const baseURL = withoutTrailingSlash(options.baseURL);
  logger.debug("creating samba engine with baseURL", baseURL);

  // Track request ID attempts
  const requestIdAttempts = new Map<string, number>();

  const getHeaders = () => ({
    Authorization: `Bearer ${getSambaEngineApiKey(options.apiKey)}`,
    ...options.headers,
  });

  interface CommonModelConfig {
    provider: string;
    url: ({ path }: { path: string }) => string;
    headers: () => Record<string, string>;
    fetch?: FetchFunction;
  }

  const getCommonModelConfig = (pathPrefix = ""): CommonModelConfig => ({
    provider: `samba-engine`,
    url: ({ path }) => {
      const url = new URL(`${baseURL}${pathPrefix}${path}`);
      if (options.queryParams) {
        url.search = new URLSearchParams(options.queryParams).toString();
      }
      return url.toString();
    },
    headers: getHeaders,
    fetch: options.fetch,
  });

  const appendQueryParams = (input: RequestInfo | URL): RequestInfo | URL => {
    if (!options.queryParams) {
      return input;
    }

    const appendToUrl = (urlValue: string) => {
      const url = new URL(urlValue);
      for (const [key, value] of Object.entries(options.queryParams ?? {})) {
        url.searchParams.set(key, value);
      }
      return url.toString();
    };

    if (typeof input === "string") {
      return appendToUrl(input);
    }
    if (input instanceof URL) {
      return new URL(appendToUrl(input.toString()));
    }
    if (input instanceof Request) {
      return new Request(appendToUrl(input.url), input);
    }
    return input;
  };

  // Custom fetch implementation that adds samba-specific options to the request
  const createSambaFetch = ({
    providerId,
    sambaProviderOptions,
    disableSambaOptions = false,
    includeFreeQuotaKey = false,
  }: {
    providerId: string;
    sambaProviderOptions?: SambaEngineProviderOptions;
    disableSambaOptions?: boolean;
    includeFreeQuotaKey?: boolean;
  }): FetchFunction => {
    return (input: RequestInfo | URL, init?: RequestInit) => {
      const requestInput = appendQueryParams(input);

      // Use default fetch if no init or body
      if (!init || !init.body || typeof init.body !== "string") {
        return (options.fetch || fetch)(requestInput, init);
      }

      try {
        // Parse the request body to manipulate it
        const parsedBody = {
          ...JSON.parse(init.body),
          ...getExtraProviderOptionsForEngine(
            providerId,
            options.settings,
            modelSelection,
          ),
        };

        const getSambaOption = (key: string) =>
          key in parsedBody ? parsedBody[key] : sambaProviderOptions?.[key];

        const sambaVersionedFiles = getSambaOption("sambaVersionedFiles");
        if ("sambaVersionedFiles" in parsedBody) {
          delete parsedBody.sambaVersionedFiles;
        }
        const sambaFiles = getSambaOption("sambaFiles");
        if ("sambaFiles" in parsedBody) {
          delete parsedBody.sambaFiles;
        }
        // Read from body (OpenAICompatible models spread providerOptions into
        // the body) with a fallback to an internal header (OpenAIResponses
        // models don't forward providerOptions, so we pass it via header).
        const requestId =
          getSambaOption("sambaRequestId") ??
          (init.headers as Record<string, string> | undefined)?.[
            SAMBA_INTERNAL_REQUEST_ID_HEADER
          ];
        if ("sambaRequestId" in parsedBody) {
          delete parsedBody.sambaRequestId;
        }
        const sambaAppId = getSambaOption("sambaAppId");
        if ("sambaAppId" in parsedBody) {
          delete parsedBody.sambaAppId;
        }
        const sambaDisableFiles =
          disableSambaOptions || getSambaOption("sambaDisableFiles");
        if ("sambaDisableFiles" in parsedBody) {
          delete parsedBody.sambaDisableFiles;
        }
        const sambaMentionedApps = getSambaOption("sambaMentionedApps");
        if ("sambaMentionedApps" in parsedBody) {
          delete parsedBody.sambaMentionedApps;
        }
        const sambaSmartContextMode = getSambaOption("sambaSmartContextMode");
        if ("sambaSmartContextMode" in parsedBody) {
          delete parsedBody.sambaSmartContextMode;
        }

        // Track and modify requestId with attempt number
        let modifiedRequestId = requestId;
        if (requestId) {
          const currentAttempt = (requestIdAttempts.get(requestId) || 0) + 1;
          requestIdAttempts.set(requestId, currentAttempt);
          modifiedRequestId = `${requestId}:attempt-${currentAttempt}`;
        }

        // Add files to the request if they exist
        if (!sambaDisableFiles) {
          parsedBody.samba_options = {
            files: sambaFiles,
            versioned_files: sambaVersionedFiles,
            enable_lazy_edits: options.sambaOptions.enableLazyEdits,
            enable_smart_files_context:
              options.sambaOptions.enableSmartFilesContext,
            smart_context_mode: sambaSmartContextMode,
            enable_web_search: options.sambaOptions.enableWebSearch,
            app_id: sambaAppId,
          };
          if (sambaMentionedApps?.length) {
            parsedBody.samba_options.mentioned_apps = sambaMentionedApps;
          }
        }

        // Return modified request with files included and requestId in headers
        const { [SAMBA_INTERNAL_REQUEST_ID_HEADER]: _, ...outgoingHeaders } =
          (init.headers as Record<string, string>) ?? {};
        const modifiedInit = {
          ...init,
          headers: {
            ...outgoingHeaders,
            ...(modifiedRequestId && {
              "X-Samba-Request-Id": modifiedRequestId,
            }),
            ...(includeFreeQuotaKey &&
              requestId && {
                "X-Samba-Free-Quota-Key": requestId,
              }),
          },
          body: JSON.stringify(parsedBody),
        };

        // Use the provided fetch or default fetch
        return (options.fetch || fetch)(requestInput, modifiedInit);
      } catch (e) {
        logger.error("Error parsing request body", e);
        // If parsing fails, use original request
        return (options.fetch || fetch)(requestInput, init);
      }
    };
  };

  const createChatModel = (
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
    pathPrefix = "",
  ) => {
    const config = {
      ...getCommonModelConfig(pathPrefix),
      fetch: createSambaFetch({
        providerId: chatParams.providerId,
        disableSambaOptions: pathPrefix === "/free",
        includeFreeQuotaKey: pathPrefix === "/free",
      }),
    };

    return new OpenAICompatibleChatLanguageModel(modelId, config);
  };

  const createFreeChatModel = (
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
  ) => createChatModel(modelId, chatParams, "/free");

  const createResponsesModel = (
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
  ) => {
    const config = {
      ...getCommonModelConfig(),
      fetch: createSambaFetch({ providerId: chatParams.providerId }),
    };

    return new OpenAIResponsesLanguageModel(modelId, config);
  };

  const createAnthropicModel = (
    modelId: ExampleChatModelId,
    chatParams: ChatParams,
  ) => {
    const createModel = (sambaProviderOptions?: SambaEngineProviderOptions) => {
      const provider = createAnthropic({
        authToken: getSambaEngineApiKey(options.apiKey),
        baseURL,
        headers: options.headers,
        fetch: createSambaFetch({
          providerId: chatParams.providerId,
          sambaProviderOptions,
        }),
        name: "samba-engine",
      });

      return provider(modelId);
    };
    const model = createModel();
    const getSambaProviderOptions = (callOptions: {
      providerOptions?: Record<string, unknown>;
    }) =>
      callOptions.providerOptions?.["samba-engine"] as
        | SambaEngineProviderOptions
        | undefined;

    const wrappedModel = {
      specificationVersion: model.specificationVersion,
      provider: model.provider,
      modelId: model.modelId,
      supportedUrls: model.supportedUrls,
      doGenerate: (callOptions) =>
        createModel(getSambaProviderOptions(callOptions)).doGenerate(
          callOptions,
        ),
      doStream: (callOptions) =>
        createModel(getSambaProviderOptions(callOptions)).doStream(callOptions),
    } satisfies LanguageModel;

    const defaultObjectGenerationMode = (
      model as LanguageModel & { defaultObjectGenerationMode?: unknown }
    ).defaultObjectGenerationMode;
    if (defaultObjectGenerationMode !== undefined) {
      Object.assign(wrappedModel, { defaultObjectGenerationMode });
    }

    return wrappedModel;
  };

  const provider = (modelId: ExampleChatModelId, chatParams: ChatParams) =>
    createChatModel(modelId, chatParams);

  provider.chatModel = createChatModel;
  provider.freeChatModel = createFreeChatModel;
  provider.responses = createResponsesModel;
  provider.anthropic = createAnthropicModel;

  return provider;
}

export async function transcribeWithSambaEngine(
  audioBuffer: Buffer,
  filename: string,
  requestId: string,
  options: ExampleProviderSettings,
): Promise<string> {
  const baseURL = withoutTrailingSlash(options.baseURL);
  const apiKey = getSambaEngineApiKey(options.apiKey);
  logger.info("transcribing with samba engine with baseURL", baseURL);

  const formData = new FormData();
  const mimeType = filename.endsWith(".webm")
    ? "audio/webm"
    : filename.endsWith(".mp3")
      ? "audio/mpeg"
      : filename.endsWith(".wav")
        ? "audio/wav"
        : filename.endsWith(".m4a")
          ? "audio/mp4"
          : "audio/webm";
  const audioBytes = new Uint8Array(
    audioBuffer.buffer as ArrayBuffer,
    audioBuffer.byteOffset,
    audioBuffer.byteLength,
  );
  const blob = new Blob([audioBytes], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("model", "samba/transcribe");

  const fetchFn = options.fetch || getTestFetchOption().fetch || fetch;
  const response = await fetchFn(`${baseURL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Samba-Request-Id": requestId,
      ...options.headers,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new SambaError(
      `Samba Builder Engine transcription failed: ${response.status} ${response.statusText} - ${errorText}`,
      SambaErrorKind.External,
    );
  }
  const data = (await response.json()) as { text: string };
  return data.text;
}

function getSambaEngineApiKey(apiKey: string | undefined): string {
  const loadedApiKey = loadApiKey({
    apiKey,
    environmentVariableName: "SAMBA_PRO_API_KEY",
    description: "Samba Builder API key",
  });
  const normalizedApiKey = normalizeProviderApiKeyInput(loadedApiKey);
  const invalidCharacter = findInvalidProviderApiKeyCharacter(normalizedApiKey);
  if (invalidCharacter) {
    throw new SambaError(
      formatInvalidProviderApiKeyMessage("Samba Builder", invalidCharacter),
      SambaErrorKind.Validation,
    );
  }
  return normalizedApiKey;
}
