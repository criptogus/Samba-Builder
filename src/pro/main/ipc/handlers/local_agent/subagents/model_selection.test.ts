import { expect, it } from "vitest";
import { selectSubagentModel } from "./model_selection";

const fallback = { provider: "openai", name: "default", effortLevel: "high" };
it("preserves the explicit provider, custom model and effort from the chat", () => {
  const selected = {
    provider: "custom",
    name: "team-model",
    customModelId: 42,
    effortLevel: "medium",
  };
  expect(selectSubagentModel(selected, fallback)).toEqual(selected);
});
it("retains persona defaults for Auto and absent or invalid selections", () => {
  for (const value of [
    null,
    undefined,
    {},
    { provider: "auto", name: "auto", effortLevel: "high" },
  ]) {
    expect(selectSubagentModel(value, fallback)).toEqual(fallback);
  }
});
