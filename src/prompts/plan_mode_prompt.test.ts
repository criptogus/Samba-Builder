import { describe, expect, it } from "vitest";
import { constructPlanModePrompt } from "./plan_mode_prompt";

describe("constructPlanModePrompt", () => {
  it("keeps clarification aligned with the shared PM guidance", () => {
    const prompt = constructPlanModePrompt(undefined);

    expect(prompt).toContain("Ask ONE focused question at a time");
    expect(prompt).toContain(
      "only ask what is needed to resolve meaningful ambiguity",
    );
    expect(prompt).not.toContain("Ask up to 5 focused questions");
  });
});
