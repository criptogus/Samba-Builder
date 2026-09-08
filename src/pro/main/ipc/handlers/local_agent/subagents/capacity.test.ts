import { it, expect } from "vitest";
import { activeSubagentCount, subagentCapacity } from "./capacity";
it("defaults to two agents and clamps invalid configuration", () => {
  for (const value of [undefined, 0, -1, 4, 1.5, NaN])
    expect(subagentCapacity(value)).toBe(2);
  expect(subagentCapacity(1)).toBe(1);
  expect(subagentCapacity(3)).toBe(3);
});
it("counts active work across chats and projects", () => {
  expect(
    activeSubagentCount(
      new Map([
        [1, new Set(["a"])],
        [2, new Set(["b", "c"])],
      ]),
    ),
  ).toBe(3);
});
