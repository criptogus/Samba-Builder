import fetch from "node-fetch";
import { z } from "zod";
import log from "electron-log";
import { createTypedHandler } from "./base";
import { freeModelQuotaContracts } from "../types/free_model_quota";
import { readSettings } from "@/main/settings";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { isSambaProEnabled } from "@/lib/schemas";
import { getSambaEngineBaseUrl } from "../utils/samba_engine_url";

const logger = log.scope("free_model_quota_handlers");

const EngineFreeQuotaResponseSchema = z.object({
  used: z.number(),
  limit: z.number(),
  remaining: z.number(),
  resetAt: z.string(),
});

export function registerFreeModelQuotaHandlers() {
  createTypedHandler(
    freeModelQuotaContracts.getFreeModelQuotaStatus,
    async () => getFreeModelQuotaStatus(),
  );
}

export async function getFreeModelQuotaStatus() {
  const settings = readSettings();
  const apiKey = settings.providerSettings?.auto?.apiKey?.value;

  if (!settings.enableSambaPro || !isSambaProEnabled(settings) || !apiKey) {
    throw new SambaError(
      "Samba Builder must be enabled to check free model quota.",
      SambaErrorKind.Auth,
    );
  }

  const baseURL = getSambaEngineBaseUrl().replace(/\/$/, "");
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(`${baseURL}/free/quota`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    logger.warn("Failed to fetch free model quota.", error);
    throw new SambaError(
      "Unable to fetch Samba Builder Free quota.",
      SambaErrorKind.External,
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    // Collapse whitespace and truncate so an HTML error page doesn't flood the log.
    const errorSummary = errorBody.replace(/\s+/g, " ").slice(0, 200);
    logger.warn(
      `Failed to fetch free model quota. Status: ${response.status}. Body: ${errorSummary}`,
    );
    throw new SambaError(
      "Unable to fetch Samba Builder Free quota.",
      response.status === 401 || response.status === 403
        ? SambaErrorKind.Auth
        : SambaErrorKind.External,
    );
  }

  const data = EngineFreeQuotaResponseSchema.parse(await response.json());
  const resetTime = new Date(data.resetAt).getTime();

  return {
    messagesUsed: data.used,
    messagesLimit: data.limit,
    messagesRemaining: data.remaining,
    isQuotaExceeded: data.remaining <= 0,
    resetTime: Number.isNaN(resetTime) ? null : resetTime,
  };
}
