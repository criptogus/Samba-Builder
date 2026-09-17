import { describe, expect, it } from "vitest";
import { eventId, unitFromApproval, unitFromFailedGate } from "./knowledge";
import { emptyDeliveryPlan, type DeliveryPlan } from "./model";
import type { EvidenceItem } from "./evidence";
import { EngineeringPolicySchema } from "./quality";

const policy = EngineeringPolicySchema.parse({
  version: 1,
  profile: "private",
  requirements: [],
  peakUsers: 1000,
  availabilityPercent: 99,
  recoveryMinutes: 30,
  dataLossMinutes: 60,
  monthlyBudgetUSD: 500,
  maxLcpMs: 2500,
  maxCls: 0.1,
  architectureEvidence: "ARCHITECTURE.md",
  usabilityEvidence: "screenshots",
});

const evidence = (
  gate: EvidenceItem["gate"],
  status: EvidenceItem["status"] = "passed",
): EvidenceItem => ({
  gate,
  status,
  summary: `Verificação de ${gate}`,
  by: "agent",
});

const planWith = (overrides: Partial<DeliveryPlan> = {}): DeliveryPlan => ({
  ...emptyDeliveryPlan(),
  client: "Cliente X",
  scope: "Escopo aprovado",
  acceptance: "Aceite",
  engineeringPolicy: policy,
  ...overrides,
});

describe("unitFromApproval — padrão validado", () => {
  it("gera unit quando a entrega passa a approved com approvalCommit novo", () => {
    const plan = planWith({
      stage: "approved",
      approvalCommit: "a1b2c3d4",
      reviewer: "Ana",
      approvalNote: "Cliente aprovou após demo",
      evidenceItems: [evidence("tests"), evidence("visual")],
    });
    const unit = unitFromApproval(1, plan, undefined);
    expect(unit).not.toBeNull();
    expect(unit!.draft.kind).toBe("padrao_validado");
    expect(unit!.draft.title).toContain("private");
    expect(unit!.draft.body).toContain("tests, visual");
    expect(unit!.draft.body).toContain("Cliente aprovou após demo");
    expect(unit!.draft.source).toMatchObject({ commit: "a1b2c3d4" });
  });

  it("não gera para estágio development (sem aprovação)", () => {
    const plan = planWith({ stage: "development" });
    expect(unitFromApproval(1, plan, undefined)).toBeNull();
  });

  it("não gera se a aprovação já existia (mesmo commit)", () => {
    const plan = planWith({ stage: "approved", approvalCommit: "abc" });
    const previous = planWith({ stage: "approved", approvalCommit: "abc" });
    expect(unitFromApproval(1, plan, previous)).toBeNull();
  });

  it("mesmo evento → mesmo id (idempotência)", () => {
    const plan = planWith({ stage: "delivered", approvalCommit: "abc123" });
    const a = unitFromApproval(1, plan, undefined)!;
    const b = unitFromApproval(
      1,
      planWith({ stage: "delivered", approvalCommit: "abc123" }),
      undefined,
    )!;
    expect(a.id).toBe(b.id);
  });
});

describe("unitFromFailedGate — erro a evitar", () => {
  it("gera unit para gate failed novo", () => {
    const plan = planWith({
      evidenceItems: [evidence("security", "failed")],
    });
    const unit = unitFromFailedGate(1, plan, undefined, plan.evidenceItems[0]);
    expect(unit).not.toBeNull();
    expect(unit!.draft.kind).toBe("erro_evitar");
    expect(unit!.draft.title).toContain('"security"');
    expect(unit!.draft.title).toContain("failed");
    expect(unit!.draft.body).toBe("Verificação de security");
    expect(unit!.draft.context).toMatchObject({ gate: "security" });
  });

  it("não gera para item passed", () => {
    const item = evidence("tests", "passed");
    expect(unitFromFailedGate(1, planWith(), undefined, item)).toBeNull();
  });

  it("não gera se o mesmo gate+status já existia no plano anterior", () => {
    const item = evidence("visual", "not_run");
    const plan = planWith({ evidenceItems: [item] });
    const previous = planWith({ evidenceItems: [item] });
    expect(unitFromFailedGate(1, plan, previous, item)).toBeNull();
  });
});

describe("eventId", () => {
  it("é determinístico e estável", () => {
    expect(eventId("approval", 7, "abc")).toBe(eventId("approval", 7, "abc"));
    expect(eventId("approval", 7, "abc")).not.toBe(eventId("gate", 7, "abc"));
    expect(eventId("approval", 7, "abc")).not.toBe(
      eventId("approval", 8, "abc"),
    );
    expect(eventId("approval", 7, "abc")).toMatch(/^ku_[0-9a-f]{8}$/);
  });
});
