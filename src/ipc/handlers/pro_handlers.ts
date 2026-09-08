import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { createLoggedTypedHandler } from "./base";
import { readSettings } from "../../main/settings"; // Assuming settings are read this way
import { UserBudgetInfo } from "@/ipc/types";
import { IS_TEST_BUILD } from "../utils/test_utils";
import { z } from "zod";
import {
  AUDIO_REQUEST_ID_PATTERN,
  audioContracts,
  MAX_AUDIO_FILENAME_LENGTH,
  MAX_AUDIO_RECORDING_BYTES,
  MAX_AUDIO_REQUEST_ID_LENGTH,
} from "../types/audio";
import type { TranscribeAudioParams } from "../types/audio";
import { transcribeWithSambaEngine } from "../utils/llm_engine_provider";
import { getSambaEngineBaseUrl } from "../utils/samba_engine_url";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";

export const UserInfoResponseSchema = z.object({
  usedCredits: z.number(),
  totalCredits: z.number(),
  budgetResetDate: z.string(), // ISO date string from API
  userId: z.string(),
  isTrial: z.boolean().optional().default(false),
});
export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;

const logger = log.scope("pro_handlers");
const handle = createLoggedHandler(logger);
const typedHandle = createLoggedTypedHandler(logger);

function validateAudioTranscriptionRequest(input: TranscribeAudioParams) {
  if (
    input.audioData.byteLength === 0 ||
    input.audioData.byteLength > MAX_AUDIO_RECORDING_BYTES
  ) {
    throw new SambaError(
      `Audio data must be between 1 and ${MAX_AUDIO_RECORDING_BYTES} bytes`,
      SambaErrorKind.Validation,
    );
  }

  const trimmedFilename = input.filename.trim();
  if (
    trimmedFilename.length === 0 ||
    trimmedFilename.length > MAX_AUDIO_FILENAME_LENGTH ||
    trimmedFilename.includes("/") ||
    trimmedFilename.includes("\\") ||
    trimmedFilename === "." ||
    trimmedFilename === ".."
  ) {
    throw new SambaError("Invalid audio filename", SambaErrorKind.Validation);
  }

  if (
    input.requestId.trim().length === 0 ||
    input.requestId.length > MAX_AUDIO_REQUEST_ID_LENGTH ||
    !AUDIO_REQUEST_ID_PATTERN.test(input.requestId)
  ) {
    throw new SambaError(
      "Invalid transcription request ID",
      SambaErrorKind.Validation,
    );
  }
}

export function registerProHandlers() {
  // This method should try to avoid throwing errors because this is auxiliary
  // information and isn't critical to using the app
  handle("get-user-budget", async (): Promise<UserBudgetInfo | null> => {
    if (IS_TEST_BUILD) {
      // Return mock budget data for E2E tests instead of spamming the API
      const resetDate = new Date();
      resetDate.setDate(resetDate.getDate() + 30); // Reset in 30 days
      return {
        usedCredits: 100,
        totalCredits: 1000,
        budgetResetDate: resetDate,
        redactedUserId: "<redacted-user-id-testing>",
        isTrial: false,
      };
    }
    logger.debug("Attempting to fetch user budget information.");

    const settings = readSettings();

    const apiKey = settings.providerSettings?.auto?.apiKey?.value;

    if (!apiKey) {
      // Expected state for non-Pro users; not an error.
      logger.debug("LLM Gateway API key (Samba Builder) is not configured.");
      return null;
    }

    // Samba Builder: zero backend — o user/budget não é consultado. Sem assinatura/backend, não há budget a buscar.
    return null;
  });

  typedHandle(
    audioContracts.transcribeAudio,
    async (_event, input: TranscribeAudioParams) => {
      const settings = readSettings();
      const apiKey = settings.providerSettings?.auto?.apiKey?.value;

      if (!apiKey) {
        throw new SambaError(
          "Voice-to-text requires a configured provider API key.",
          SambaErrorKind.Auth,
        );
      }

      validateAudioTranscriptionRequest(input);

      const audioBuffer = Buffer.from(
        input.audioData.buffer,
        input.audioData.byteOffset,
        input.audioData.byteLength,
      );

      const text = await transcribeWithSambaEngine(
        audioBuffer,
        input.filename,
        input.requestId,
        {
          apiKey,
          baseURL: getSambaEngineBaseUrl(),
          sambaOptions: {},
          settings,
        },
      );

      return { text };
    },
  );
}
