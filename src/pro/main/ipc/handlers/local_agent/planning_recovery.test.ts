import { it, expect } from "vitest";
import { buildPlanningQuestionnaireReflectionMessage } from "./planning_recovery";
it("retries invalid questionnaires in both modes without bypassing blueprint prerequisites", () => {
  for (const mode of [true, false]) {
    const message = buildPlanningQuestionnaireReflectionMessage(
      "Too many options",
      mode,
    );
    expect(message).toContain("re-call planning_questionnaire");
    expect(message).toContain("Too many options");
    expect(message).not.toContain("Skip the questionnaire");
    expect(message).toContain("not a user dismissal");
  }
});
