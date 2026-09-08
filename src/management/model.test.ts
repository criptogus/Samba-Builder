import { expect, it } from "vitest";
import { priceTokens, summarizeTime, TimeEntrySchema } from "./model";
it("does not infer prices, treats zero rates explicitly, and preserves partial unknown usage", () => {
  const group = {
    provider: "p",
    model: "m",
    source: "agent",
    inputTokens: 1000000,
    outputTokens: 500000,
    calls: 1,
    unknownCalls: 0,
  };
  expect(priceTokens([group], [])[0].estimatedCost).toBeNull();
  expect(
    priceTokens(
      [group],
      [{ provider: "p", model: "m", inputPerMillion: 2, outputPerMillion: 4 }],
    )[0].estimatedCost,
  ).toBe(4);
  expect(
    priceTokens(
      [{ ...group, unknownCalls: 1 }],
      [{ provider: "p", model: "m", inputPerMillion: 0, outputPerMillion: 0 }],
    )[0].estimatedCost,
  ).toBeNull();
  expect(
    priceTokens(
      [group],
      [{ provider: "p", model: "m", inputPerMillion: 0, outputPerMillion: 0 }],
    )[0].estimatedCost,
  ).toBe(0);
});
it("adds actual minutes without counting idle app time and retains unpriced work", () => {
  const t = {
    id: crypto.randomUUID(),
    sprintId: null,
    date: "2026-09-06",
    person: "A",
    description: "Task",
    minutes: 90,
    hourlyRate: 40,
  };
  expect(
    summarizeTime([
      t,
      { ...t, id: crypto.randomUUID(), minutes: 30, hourlyRate: null },
    ]),
  ).toEqual({ minutes: 120, laborCost: 60, unpricedMinutes: 30 });
  expect(TimeEntrySchema.safeParse({ ...t, date: "2026-02-30" }).success).toBe(
    false,
  );
  expect(TimeEntrySchema.safeParse({ ...t, minutes: -1 }).success).toBe(false);
});
