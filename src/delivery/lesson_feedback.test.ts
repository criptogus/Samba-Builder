import { describe, expect, it } from "vitest";
import {
  applyOutcome,
  feedbackAdjustment,
  shouldContradict,
  statusAfterOutcome,
  statusAfterRecovery,
  summarizeUsage,
  type LessonFeedbackState,
} from "./lesson_feedback";

function state(
  overrides: Partial<LessonFeedbackState> = {},
): LessonFeedbackState {
  return { usedCount: 0, workedCount: 0, failedCount: 0, ...overrides };
}

describe("applyOutcome", () => {
  it("counts the injection and the outcome", () => {
    expect(applyOutcome(state(), "worked")).toEqual({
      usedCount: 1,
      workedCount: 1,
      failedCount: 0,
    });
    expect(applyOutcome(state(), "failed")).toEqual({
      usedCount: 1,
      workedCount: 0,
      failedCount: 1,
    });
  });
});

describe("shouldContradict", () => {
  it("does not condemn a lesson over a single bad turn", () => {
    expect(shouldContradict(state({ usedCount: 1, failedCount: 1 }))).toBe(
      false,
    );
  });

  it("condemns only when it failed more than it helped", () => {
    expect(
      shouldContradict(state({ usedCount: 2, workedCount: 0, failedCount: 2 })),
    ).toBe(true);
    // duas falhas e dois acertos: empate não condena
    expect(
      shouldContradict(state({ usedCount: 4, workedCount: 2, failedCount: 2 })),
    ).toBe(false);
  });
});

describe("statusAfterOutcome", () => {
  it("keeps a good lesson active", () => {
    expect(statusAfterOutcome(state({ usedCount: 3, workedCount: 3 }))).toBe(
      "active",
    );
  });

  it("takes a repeatedly harmful lesson out of the rotation", () => {
    expect(
      statusAfterOutcome(
        state({ usedCount: 3, workedCount: 0, failedCount: 3 }),
      ),
    ).toBe("contradito");
  });
});

describe("statusAfterRecovery", () => {
  it("rehabilitates a contradicted lesson when it starts helping again", () => {
    expect(
      statusAfterRecovery(
        state({ usedCount: 4, workedCount: 3, failedCount: 2 }),
      ),
    ).toBe("active");
  });

  it("keeps it contradicted while it keeps failing", () => {
    expect(
      statusAfterRecovery(
        state({ usedCount: 4, workedCount: 0, failedCount: 4 }),
      ),
    ).toBe("contradito");
  });
});

describe("feedbackAdjustment", () => {
  it("is zero for an unused lesson", () => {
    expect(feedbackAdjustment(state())).toBe(0);
  });

  it("rewards what worked and punishes what failed", () => {
    expect(feedbackAdjustment(state({ workedCount: 2 }))).toBeGreaterThan(0);
    expect(feedbackAdjustment(state({ failedCount: 1 }))).toBeLessThan(0);
  });

  it("caps the credit so a popular lesson cannot dominate ranking", () => {
    const many = feedbackAdjustment(state({ workedCount: 50 }));
    const capped = feedbackAdjustment(state({ workedCount: 3 }));
    expect(many).toBe(capped);
  });
});

describe("summarizeUsage", () => {
  it("explains the history in one line", () => {
    expect(summarizeUsage(state())).toBe("ainda não usada");
    expect(summarizeUsage(state({ usedCount: 2 }))).toContain("sem desfecho");
    expect(
      summarizeUsage(state({ usedCount: 4, workedCount: 3, failedCount: 1 })),
    ).toContain("ajudou 3 de 4");
  });
});
