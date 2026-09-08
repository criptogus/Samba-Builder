import { expect, it } from "vitest";
import { importTransition } from "./transition";
it("ignores late completion after cancellation and a newer import", () => {
  const busy = importTransition({ type: "idle" }, { type: "begin", id: "old" });
  const idle = importTransition(busy, { type: "cancel" });
  const newer = importTransition(idle, { type: "begin", id: "new" });
  expect(
    importTransition(newer, {
      type: "success",
      id: "old",
      text: "stale",
      filename: "old.txt",
    }),
  ).toEqual(newer);
  expect(
    importTransition(newer, { type: "failure", id: "old", message: "stale" }),
  ).toEqual(newer);
  expect(
    importTransition(newer, {
      type: "success",
      id: "new",
      text: "fresh",
      filename: "new.txt",
    }),
  ).toEqual({ type: "ready", text: "fresh", filename: "new.txt" });
});
it("does not supersede an active import", () => {
  const current = { type: "loading", id: "a" } as const;
  expect(importTransition(current, { type: "begin", id: "b" })).toBe(current);
});
