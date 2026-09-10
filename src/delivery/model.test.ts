import { describe, it, expect } from "vitest";
import {
  DeliveryPlanSchema,
  emptyDeliveryPlan,
  deliveryBlockers,
  deliveryAttention,
  taskHandoff,
  type DeliveryPlan,
} from "./model";
import { EngineeringPolicySchema } from "./quality";
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

describe("product gate (PM) — requisito por tarefa", () => {
  const policy = (
    profile: "public" | "private" | "critical",
    reqIds: string[],
  ) =>
    EngineeringPolicySchema.parse({
      version: 1,
      profile,
      requirements: reqIds.map((id) => ({
        id,
        title: `Requisito ${id}`,
        acceptance: "Critério observável",
      })),
      peakUsers: 100,
      availabilityPercent: 99,
      recoveryMinutes: 60,
      dataLossMinutes: 1440,
      monthlyBudgetUSD: 100,
      maxLcpMs: 2500,
      maxCls: 0.1,
      architectureEvidence: "",
      usabilityEvidence: "",
    });

  const readyPlan = () => {
    const plan = emptyDeliveryPlan();
    plan.client = "Acme";
    plan.owner = "Ana";
    plan.scope = "Booking";
    plan.acceptance = "Sem duplicidade";
    plan.reviewCommit = "abc";
    plan.checks = {
      flows: "ok",
      security: "ok",
      accessibility: "ok",
      responsive: "ok",
    };
    plan.tasks = [
      {
        id: crypto.randomUUID(),
        title: "Booking",
        owner: "Ana",
        acceptance: "Um horário por paciente",
        evidence: "teste passou",
        status: "done",
      },
    ];
    return plan;
  };

  const passAllGates = (plan: DeliveryPlan) => {
    plan.evidenceItems = (
      ["tests", "security", "dependencies", "accessibility", "visual"] as const
    ).map((gate) => ({
      gate,
      status: "passed" as const,
      summary: `Verificação de ${gate}`,
      by: "agent" as const,
    }));
  };

  it("perfil private: tarefa sem requisito bloqueia a entrega", () => {
    const plan = readyPlan();
    plan.engineeringPolicy = policy("private", ["REQ-01"]);
    passAllGates(plan);
    expect(deliveryBlockers(plan)).toEqual([
      "Vincule cada tarefa a um requisito (REQ-xx): 1 tarefa(s) sem requisito.",
    ]);
    plan.tasks[0].requirementIds = ["REQ-01"];
    expect(deliveryBlockers(plan)).toEqual([]);
  });

  it("perfil private: requisito inexistente na política bloqueia", () => {
    const plan = readyPlan();
    plan.engineeringPolicy = policy("private", ["REQ-01"]);
    passAllGates(plan);
    plan.tasks[0].requirementIds = ["REQ-99"];
    expect(deliveryBlockers(plan)).toEqual([
      "Tarefa(s) referenciam requisito(s) inexistente(s) na política: REQ-99.",
    ]);
  });

  it("perfil private sem requisitos definidos orienta a definir e vincular", () => {
    const plan = readyPlan();
    plan.engineeringPolicy = policy("private", []);
    passAllGates(plan);
    const blockers = deliveryBlockers(plan);
    expect(
      blockers.some((b) => b.includes("Defina os requisitos do produto")),
    ).toBe(true);
    expect(blockers.some((b) => b.includes("sem requisito"))).toBe(true);
  });

  it("perfil public: não exige vínculo de requisito (proporcional ao risco)", () => {
    const plan = readyPlan();
    plan.engineeringPolicy = policy("public", ["REQ-01"]);
    plan.evidenceItems = (["tests", "security", "visual"] as const).map(
      (gate) => ({
        gate,
        status: "passed" as const,
        summary: `Verificação de ${gate}`,
        by: "agent" as const,
      }),
    );
    expect(deliveryBlockers(plan)).toEqual([]);
  });

  it("sem política de engenharia o gate de produto não roda (retrocompatível)", () => {
    const plan = readyPlan();
    expect(deliveryBlockers(plan)).toEqual([]);
  });
});
