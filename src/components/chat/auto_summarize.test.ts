import { describe, expect, it } from "vitest";
import {
  shouldAutoSummarize,
  shouldShowContextLimitBanner,
} from "@/components/chat/ContextLimitBanner";

describe("decisao do resumo automatico", () => {
  it("dispara quando resta menos de 20k de janela", () => {
    expect(
      shouldAutoSummarize({ totalTokens: 125_000, contextWindow: 128_000 }),
    ).toBe(true);
    expect(
      shouldAutoSummarize({ totalTokens: 100_000, contextWindow: 128_000 }),
    ).toBe(false);
  });
  it("nao dispara sem numeros", () => {
    expect(
      shouldAutoSummarize({ totalTokens: null, contextWindow: 128_000 }),
    ).toBe(false);
    expect(
      shouldAutoSummarize({ totalTokens: 10, contextWindow: undefined }),
    ).toBe(false);
  });
  it("o aviso continua disparando antes do resumo (40k)", () => {
    expect(
      shouldShowContextLimitBanner({
        totalTokens: 100_000,
        contextWindow: 128_000,
      }),
    ).toBe(true);
    expect(
      shouldAutoSummarize({ totalTokens: 100_000, contextWindow: 128_000 }),
    ).toBe(false);
  });
});
