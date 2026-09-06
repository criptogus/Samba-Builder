import { describe, expect, it } from "vitest";
import {
  UNKNOWN,
  emptyDraft,
  productQuestions,
  pendingQuestions,
  buildProductBrief,
  productReviewPrompt,
  appendProductBrief,
  loadProductDraft,
  saveProductDraft,
} from "./model";
describe("senior PM discovery", () => {
  it("asks about the problem before features and adds only relevant follow-ups", () => {
    const publicDraft = {
      ...emptyDraft(),
      capabilities: ["public" as const],
      capabilitiesAnswered: true,
    };
    expect(productQuestions(publicDraft.capabilities)[0].id).toBe("problem");
    expect(
      productQuestions(publicDraft.capabilities).map((q) => q.id),
    ).not.toContain("billing");
    const complex = productQuestions(["accounts", "payments", "integrations"]);
    expect(complex.map((q) => q.id)).toEqual(
      expect.arrayContaining(["access", "billing", "connections"]),
    );
    const changed = {
      ...publicDraft,
      answers: { billing: "Old payment requirement" },
    };
    expect(buildProductBrief(changed)).not.toContain("Old payment requirement");
  });
  it("keeps uncertainty explicit and requests review rather than construction", () => {
    const draft = {
      ...emptyDraft("Agendamento para clínicas"),
      answers: { problem: "Agendamento para clínicas", success: UNKNOWN },
    };
    expect(pendingQuestions(draft).map((q) => q.id)).toContain("success");
    const prompt = productReviewPrompt(draft);
    expect(prompt).toContain("Dado/Quando/Então");
    expect(prompt).toContain("não implemente código nem publique");
    expect(prompt).toContain(UNKNOWN);
    expect(appendProductBrief("Transcrição existente", prompt)).toBe(
      `Transcrição existente\n\n${prompt}`,
    );
  });
  it("persists separate project drafts and rejects malformed or oversized responses", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    saveProductDraft("chat:1", emptyDraft("Projeto A"), storage);
    saveProductDraft("chat:2", emptyDraft("Projeto B"), storage);
    expect(loadProductDraft("chat:1", "", storage).answers.problem).toBe(
      "Projeto A",
    );
    expect(loadProductDraft("chat:2", "", storage).answers.problem).toBe(
      "Projeto B",
    );
    expect(() =>
      loadProductDraft("x", "", { getItem: () => '{"version":1}' }),
    ).toThrow();
    expect(() =>
      loadProductDraft("x", "", {
        getItem: () =>
          JSON.stringify({
            ...emptyDraft(),
            answers: { problem: "x".repeat(4001) },
          }),
      }),
    ).toThrow();
    expect(
      loadProductDraft("new", "Ideia inicial", storage).answers.problem,
    ).toBe("Ideia inicial");
  });
});
