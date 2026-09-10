import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  /** Fila de resultados para cada select().from().where() em ordem. */
  selectQueue: [] as unknown[][],
  inserted: [] as unknown[],
  updates: [] as Record<string, unknown>[],
  throwOnInsert: false,
  throwOnSelect: false,
}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: async (rows: unknown[]) => {
        if (state.throwOnInsert) throw new Error("insert falhou");
        state.inserted.push(...(rows as unknown[]));
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(values);
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: async () => {
          if (state.throwOnSelect) throw new Error("select falhou");
          return state.selectQueue.shift() ?? [];
        },
      }),
    }),
  },
}));

import { recordLessonOutcome, recordLessonUsage } from "./knowledge_feedback";

function reset() {
  state.selectQueue = [];
  state.inserted = [];
  state.updates = [];
  state.throwOnInsert = false;
  state.throwOnSelect = false;
}

afterEach(reset);

describe("recordLessonUsage", () => {
  it("does nothing without lessons", async () => {
    await recordLessonUsage({ unitIds: [], appId: 1, chatId: 2 });
    expect(state.inserted).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("records each injected lesson and bumps its usage counter", async () => {
    await recordLessonUsage({
      unitIds: ["ku_a", "ku_b", "ku_a"],
      appId: 7,
      chatId: 9,
    });

    // deduplicado: uma linha por lição
    expect(state.inserted).toHaveLength(2);
    expect(state.inserted[0]).toMatchObject({
      unitId: "ku_a",
      appId: 7,
      chatId: 9,
      outcome: null,
    });
    // um único update em lote incrementando used_count
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toHaveProperty("usedCount");
    expect(state.updates[0]).toHaveProperty("lastUsedAt");
  });

  it("never breaks the turn when the database fails", async () => {
    state.throwOnInsert = true;
    await expect(
      recordLessonUsage({ unitIds: ["ku_a"], appId: 1, chatId: 2 }),
    ).resolves.toBeUndefined();
  });
});

describe("recordLessonOutcome", () => {
  it("does nothing when the chat has no pending usage", async () => {
    state.selectQueue = [[]];
    await recordLessonOutcome({ chatId: 3, outcome: "worked" });
    expect(state.updates).toHaveLength(0);
  });

  it("credits a lesson that ended in a good turn", async () => {
    state.selectQueue = [
      [{ id: 1, unitId: "ku_a" }],
      [
        {
          id: "ku_a",
          usedCount: 1,
          workedCount: 0,
          failedCount: 0,
          status: "active",
        },
      ],
    ];

    await recordLessonOutcome({ chatId: 3, outcome: "worked" });

    // um update na lição + um update fechando o uso
    expect(state.updates).toHaveLength(2);
    expect(state.updates[0]).toMatchObject({
      usedCount: 2,
      workedCount: 1,
      failedCount: 0,
    });
    expect(state.updates[1]).toMatchObject({ outcome: "worked" });
  });

  it("takes a lesson out of rotation after it fails more than it helps", async () => {
    state.selectQueue = [
      [
        { id: 1, unitId: "ku_a" },
        { id: 2, unitId: "ku_a" },
      ],
      [
        {
          id: "ku_a",
          usedCount: 2,
          workedCount: 0,
          failedCount: 1,
          status: "active",
        },
      ],
    ];

    await recordLessonOutcome({ chatId: 4, outcome: "failed" });

    expect(state.updates[0]).toMatchObject({
      usedCount: 3,
      workedCount: 0,
      failedCount: 2,
      status: "contradito",
    });
  });

  it("rehabilitates a contradicted lesson when it helps again", async () => {
    state.selectQueue = [
      [{ id: 1, unitId: "ku_a" }],
      [
        {
          id: "ku_a",
          usedCount: 5,
          workedCount: 3,
          failedCount: 2,
          status: "contradito",
        },
      ],
    ];

    await recordLessonOutcome({ chatId: 5, outcome: "worked" });

    expect(state.updates[0]).toMatchObject({
      workedCount: 4,
      failedCount: 2,
      status: "active",
    });
  });

  it("never breaks the turn when the database fails", async () => {
    state.throwOnSelect = true;
    await expect(
      recordLessonOutcome({ chatId: 6, outcome: "failed" }),
    ).resolves.toBeUndefined();
  });
});
