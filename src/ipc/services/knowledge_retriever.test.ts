import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as unknown[],
  shouldThrow: false,
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => {
            if (state.shouldThrow) throw new Error("db indisponivel");
            return state.rows;
          },
        }),
      }),
    }),
  },
}));

import {
  projectLessonsPromptBlock,
  toLessonUnits,
} from "./knowledge_retriever";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "ku_1",
    kind: "erro_evitar",
    title: "Não rodar npm com Node antigo",
    body: "O projeto exige Node >=24; v22 falha com EBADENGINE.",
    context: JSON.stringify({ area: "tests" }),
    force: 2,
    createdAt: Date.now(),
    status: "active",
    expiresAt: null,
    ...overrides,
  };
}

afterEach(() => {
  state.rows = [];
  state.shouldThrow = false;
});

describe("toLessonUnits", () => {
  it("keeps valid kinds and parses the context JSON", () => {
    const units = toLessonUnits([row()] as never);
    expect(units).toHaveLength(1);
    expect(units[0].context).toEqual({ area: "tests" });
    expect(units[0].kind).toBe("erro_evitar");
  });

  it("drops rows with an unknown kind", () => {
    expect(toLessonUnits([row({ kind: "inventado" })] as never)).toHaveLength(
      0,
    );
  });

  it("survives a corrupt context payload", () => {
    const units = toLessonUnits([row({ context: "{ nao json" })] as never);
    expect(units[0].context).toEqual({});
  });
});

describe("projectLessonsPromptBlock", () => {
  it("returns the prompt block when there are lessons", async () => {
    state.rows = [row()];
    const block = await projectLessonsPromptBlock({ signals: ["npm"] });
    expect(block).toContain("<project_lessons>");
    expect(block).toContain("Não rodar npm com Node antigo");
  });

  it("returns an empty string when there is nothing to teach", async () => {
    state.rows = [];
    expect(await projectLessonsPromptBlock()).toBe("");
  });

  it("never breaks a turn when the database is unavailable", async () => {
    state.shouldThrow = true;
    await expect(projectLessonsPromptBlock()).resolves.toBe("");
  });

  it("leaves out lessons the project should not see", async () => {
    state.rows = [
      row({ id: "ok" }),
      row({ id: "vencido", expiresAt: Date.now() - 1000 }),
      row({ id: "inativo", status: "contradito" }),
    ];
    const block = await projectLessonsPromptBlock();
    expect(block).toContain("Não rodar npm com Node antigo");
    // só uma lição válida: um único bullet no bloco
    expect(block.match(/^- \[/gm)?.length).toBe(1);
  });
});
