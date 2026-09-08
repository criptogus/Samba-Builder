import { describe, expect, it } from "vitest";
import { looksLikeAnApiKey } from "./language_model_handlers";

describe("looksLikeAnApiKey", () => {
  it("detects real API key shapes (short prefix + dash + long token)", () => {
    expect(looksLikeAnApiKey("sk-49c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c")).toBe(
      true,
    );
    expect(looksLikeAnApiKey("AKIAIOSFODNN7EXAMPLE")).toBe(true);
    expect(looksLikeAnApiKey("xoxb-123456789012-abcdefghijklmnop")).toBe(true);
    expect(
      looksLikeAnApiKey("ghp_1234567890123456789012345678901234567890"),
    ).toBe(true);
  });

  it("accepts legitimate env var NAMES (UPPER_SNAKE, no dashes)", () => {
    expect(looksLikeAnApiKey("DEEPSEEK_API_KEY")).toBe(false);
    expect(looksLikeAnApiKey("MY_PROVIDER_API_KEY")).toBe(false);
    expect(looksLikeAnApiKey("OPENAI_KEY")).toBe(false);
  });

  it("handles edge cases safely", () => {
    expect(looksLikeAnApiKey("")).toBe(false);
    expect(looksLikeAnApiKey("sk-short")).toBe(false); // token too short
    expect(looksLikeAnApiKey("SK")).toBe(false); // no token at all
  });
});
