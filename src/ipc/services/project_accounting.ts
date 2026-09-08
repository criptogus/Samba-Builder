import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import log from "electron-log";
import { db } from "@/db";
import { chats, projectTokenEvents } from "@/db/schema";
/** Called inside the active chat/subagent lifecycle, before its admission is released.
 * Records usage only, never prompts, secrets or customer content. */
export function recordProjectTokenUsage(
  chatId: number,
  provider: string,
  model: string,
  source: string,
  usage: { inputTokens?: number; outputTokens?: number },
) {
  try {
    const chat = db
      .select({ appId: chats.appId })
      .from(chats)
      .where(eq(chats.id, chatId))
      .get();
    if (!chat) return;
    const valid = (n: number | undefined) =>
      typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
    db.insert(projectTokenEvents)
      .values({
        id: crypto.randomUUID(),
        appId: chat.appId,
        occurredAt: Date.now(),
        provider,
        model,
        source,
        inputTokens: valid(usage.inputTokens),
        outputTokens: valid(usage.outputTokens),
      })
      .run();
  } catch (error) {
    log.warn("Could not persist project token accounting", error);
  }
}
