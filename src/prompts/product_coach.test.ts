import { expect, it } from "vitest";
import { PRODUCT_COACH_GUIDANCE } from "@/shared/product_coach_guidance";
import {
  constructLocalAgentPrompt,
  constructBuildAgentPrompt,
} from "./local_agent_prompt";
import { constructPlanModePrompt } from "./plan_mode_prompt";
import { getSystemPromptForChatMode } from "./system_prompt";
it("guides discovery in all supported chat prompt paths without overriding mode constraints", () => {
  const prompts = [
    constructLocalAgentPrompt(undefined),
    constructLocalAgentPrompt(undefined, undefined, { basicAgentMode: true }),
    constructLocalAgentPrompt(undefined, undefined, { readOnly: true }),
    constructBuildAgentPrompt(undefined),
    constructPlanModePrompt(undefined),
    getSystemPromptForChatMode({ chatMode: "ask", enableTurboEditsV2: false }),
    getSystemPromptForChatMode({
      chatMode: "build",
      enableTurboEditsV2: false,
    }),
  ];
  for (const prompt of prompts) {
    expect(prompt.split(PRODUCT_COACH_GUIDANCE)).toHaveLength(2);
    expect(prompt).toContain("already approved scope");
    expect(prompt).toContain("never repeat a question already answered");
    expect(prompt).toContain("do not invent research");
  }
  expect(prompts[2]).toContain("READ-ONLY");
});
