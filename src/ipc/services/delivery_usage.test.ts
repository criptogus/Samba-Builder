import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  row: undefined as { data: string } | undefined,
  usage: [] as { input: number; output: number }[],
}));
vi.mock("@/db", () => ({
  db: {
    select: () => {
      const query: any = {
        from: () => query,
        where: () => query,
        innerJoin: () => query,
        get: () => state.row,
        all: () => state.usage,
      };
      return query;
    },
  },
}));
import {
  assertDeliveryAgentBudget,
  getDeliveryAgentUsage,
} from "./delivery_usage";
import { emptyDeliveryPlan } from "@/delivery/model";
beforeEach(() => {
  state.row = undefined;
  state.usage = [];
});
it("does not invent a zero-dollar cost from absent usage", () => {
  expect(getDeliveryAgentUsage(1)).toEqual({ inputTokens: 0, outputTokens: 0 });
  expect(() => assertDeliveryAgentBudget(1)).not.toThrow();
});
it("blocks new model steps when recorded input and output reach the project limit", () => {
  state.row = {
    data: JSON.stringify({ ...emptyDeliveryPlan(), subagentTokenBudget: 100 }),
  };
  state.usage = [
    { input: 60, output: 30 },
    { input: 5, output: 5 },
  ];
  expect(() => assertDeliveryAgentBudget(1)).toThrow("limite de tokens");
  state.usage = [{ input: 20, output: 10 }];
  expect(() => assertDeliveryAgentBudget(1)).not.toThrow();
});
it("allows an explicitly unlimited budget", () => {
  state.row = { data: JSON.stringify(emptyDeliveryPlan()) };
  state.usage = [{ input: 10000000, output: 100000 }];
  expect(() => assertDeliveryAgentBudget(1)).not.toThrow();
});
