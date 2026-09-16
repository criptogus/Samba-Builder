import { LargeLanguageModel } from "@/lib/schemas";
import { readSettings } from "../../main/settings";
import { Message } from "@/ipc/types";
import { getErrorMessage } from "@ai-sdk/provider";

import { findLanguageModel } from "./findLanguageModel";

// Estimate tokens (4 characters per token)
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

type ToolResultForTokenEstimate = {
  toolCallId: string;
  toolName: string;
  output: unknown;
};

type ToolErrorForTokenEstimate = {
  toolCallId: string;
  toolName: string;
  error: unknown;
};

/**
 * Estimate the tokens that completed tool results will add to the next model
 * request. Tool inputs are intentionally excluded because the engine's usage
 * for the completed step already counted them.
 */
export const estimateToolResultTokens = (
  toolResults: readonly ToolResultForTokenEstimate[],
  toolErrors: readonly ToolErrorForTokenEstimate[] = [],
): number => {
  if (toolResults.length === 0 && toolErrors.length === 0) {
    return 0;
  }

  const serializedResults = JSON.stringify(
    [
      ...toolResults.map(({ toolCallId, toolName, output }) => ({
        type: "tool-result",
        toolCallId,
        toolName,
        output,
      })),
      ...toolErrors.map(({ toolCallId, toolName, error }) => ({
        type: "tool-result",
        toolCallId,
        toolName,
        output: { type: "error-text", value: getErrorMessage(error) },
      })),
    ],
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
  );

  return estimateTokens(serializedResults);
};

export const estimateMessagesTokens = (messages: Message[]): number => {
  return messages.reduce(
    (acc, message) => acc + estimateTokens(message.content),
    0,
  );
};

const DEFAULT_CONTEXT_WINDOW = 128_000;

export async function getContextWindow(model?: LargeLanguageModel) {
  const selectedModel = model ?? readSettings().selectedModel;
  const modelOption = await findLanguageModel(selectedModel);
  return modelOption?.contextWindow || DEFAULT_CONTEXT_WINDOW;
}

export async function getMaxTokens(
  model: LargeLanguageModel,
): Promise<number | undefined> {
  const modelOption = await findLanguageModel(model);
  return modelOption?.maxOutputTokens ?? undefined;
}

export async function getTemperature(
  model: LargeLanguageModel,
): Promise<number | undefined> {
  const modelOption = await findLanguageModel(model);
  return modelOption?.temperature ?? undefined;
}

/**
 * Calculate the token threshold for triggering context compaction.
 *
 * Returns the lower of a per-provider cap or `contextWindow - 25k`. The 25k
 * headroom leaves room for the next user message + tool outputs before we hit
 * the hard context limit.
 *
 * Per-provider caps differ because of input-token pricing tiers and operational
 * headroom. Google compacts before its 200k pricing boundary, while OpenAI
 * compacts at 220k to leave more room for tool-heavy agent steps. Other
 * providers retain the historical 250k cap.
 */
export function getCompactionThreshold(
  contextWindow: number,
  provider: string,
): number {
  const cap =
    provider === "google" ? 190_000 : provider === "openai" ? 220_000 : 250_000;
  return Math.min(cap, Math.max(0, contextWindow - 25_000));
}

/**
 * Check if compaction should be triggered based on total tokens used.
 */
export function shouldTriggerCompaction(
  totalTokens: number,
  contextWindow: number,
  provider: string,
): boolean {
  return totalTokens >= getCompactionThreshold(contextWindow, provider);
}

/** Prefixo do prompt enviado pelo botão "Summarize to new chat". */
export const SUMMARIZE_PROMPT_PREFIX = "Summarize from chat-id=";

interface ContextUsageMessage {
  role: string;
  content: string;
  maxTokensUsed?: number | null;
}

/**
 * Uso real de contexto do último turno representativo da conversa.
 *
 * `maxTokensUsed` é um pico por turno do assistente, não o tamanho atual do
 * contexto: ele continua alto depois de qualquer turno que leu muito de uma só
 * vez. O caso mais visível é o turno de "Summarize to new chat", que lê a
 * conversa anterior inteira para resumi-la — se esse pico contasse, o aviso de
 * contexto reapareceria no chat novo (pequeno) e ficaria preso lá.
 *
 * Por isso o último turno de summarize é ignorado: o aviso volta a refletir o
 * que este chat realmente vai enviar no próximo pedido.
 */
export function resolveActualMaxTokens(
  messages: readonly ContextUsageMessage[],
): number | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const triggeringUserMessage = messages
      .slice(0, index)
      .reverse()
      .find((candidate) => candidate.role === "user");
    if (triggeringUserMessage?.content.startsWith(SUMMARIZE_PROMPT_PREFIX)) {
      continue;
    }
    return message.maxTokensUsed ?? null;
  }
  return null;
}
