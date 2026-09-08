import { describe, it, expect } from "vitest";
import {
  DeliveryPlanSchema,
  emptyDeliveryPlan,
  deliveryBlockers,
  deliveryAttention,
  taskHandoff,
} from "./model";
describe("delivery workflow", () => {
  it("does not approve an empty or unverified delivery", () => {
    const plan = emptyDeliveryPlan();
    expect(deliveryBlockers(plan).length).toBeGreaterThan(0);
    plan.client = "Acme";
    plan.owner = "Ana";
    plan.scope = "Booking";
    plan.acceptance = "No duplicate booking";
    plan.reviewCommit = "abc";
    plan.tasks = [
      {
        id: crypto.randomUUID(),
        title: "Booking",
        owner: "Ana",
        acceptance: "One slot per patient",
        evidence: "",
        status: "done",
      },
    ];
    plan.checks = {
      flows: "test passed",
      security: "roles verified",
      accessibility: "keyboard checked",
      responsive: "mobile checked",
    };
    expect(deliveryBlockers(plan)).toContain(
      "Conclua as tarefas com critérios de aceite e evidências.",
    );
    plan.tasks[0].evidence = "Booking test passes";
    expect(deliveryBlockers(plan)).toEqual([]);
  });
  it("shows actionable overdue, blocked and approval items without marking delivered projects late", () => {
    const plan = emptyDeliveryPlan();
    plan.dueDate = "2026-09-01";
    plan.stage = "review";
    expect(deliveryAttention(plan, "2026-09-06")).toEqual([
      "Sem responsável",
      "Prazo vencido",
      "Aguardando revisão/aprovação",
    ]);
    plan.stage = "delivered";
    expect(deliveryAttention(plan, "2026-09-06")).toEqual([]);
  });
  it("carries client scope and acceptance into a task without automatic publication", () => {
    const plan = emptyDeliveryPlan();
    plan.client = "Acme";
    plan.decisions = "Reuse existing auth";
    const id = crypto.randomUUID();
    plan.tasks = [
      {
        id,
        title: "Build booking",
        owner: "João",
        acceptance: "Reject duplicates",
        status: "todo",
        evidence: "",
      },
    ];
    const prompt = taskHandoff(plan, id);
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("Reject duplicates");
    expect(prompt).toContain("Reuse existing auth");
    expect(prompt).toContain("Não publique automaticamente");
    expect(() => taskHandoff(plan, "missing")).toThrow();
  });
  it("rejects duplicate tasks and invalid budgets", () => {
    const plan = emptyDeliveryPlan();
    const task = {
      id: crypto.randomUUID(),
      title: "Task",
      owner: "",
      acceptance: "",
      status: "todo" as const,
      evidence: "",
    };
    plan.tasks = [task, task];
    expect(DeliveryPlanSchema.safeParse(plan).success).toBe(false);
    plan.tasks = [];
    plan.subagentTokenBudget = -1;
    expect(DeliveryPlanSchema.safeParse(plan).success).toBe(false);
  });
});

it("rejects calendar dates that roll into a different month", () => {
  expect(
    DeliveryPlanSchema.safeParse({
      ...emptyDeliveryPlan(),
      dueDate: "2026-02-31",
    }).success,
  ).toBe(false);
});
