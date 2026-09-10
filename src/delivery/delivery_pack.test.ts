import { describe, expect, it } from "vitest";
import {
  buildDeliveryPack,
  deliveryPackFileName,
  renderDeliveryPackMarkdown,
} from "./delivery_pack";
import { emptyDeliveryPlan, type DeliveryPlan } from "./model";

function planWith(overrides: Partial<DeliveryPlan>): DeliveryPlan {
  return { ...emptyDeliveryPlan(), ...overrides };
}

function engineeringPolicy(
  profile: "public" | "private" | "critical",
  overrides: Partial<NonNullable<DeliveryPlan["engineeringPolicy"]>> = {},
): NonNullable<DeliveryPlan["engineeringPolicy"]> {
  return {
    version: 1,
    profile,
    requirements: [
      {
        id: "REQ-01",
        title: "Criar pedido",
        acceptance: "Pedido salvo e listado",
      },
    ],
    peakUsers: 100,
    availabilityPercent: 99.5,
    recoveryMinutes: 60,
    dataLossMinutes: 60,
    monthlyBudgetUSD: 100,
    maxLcpMs: 2500,
    maxCls: 0.1,
    architectureEvidence: "",
    usabilityEvidence: "",
    ...overrides,
  };
}

const basePlan = planWith({
  client: "Cliente Aurora",
  owner: "Ana",
  dueDate: "2026-10-01",
  stage: "review",
  brief: "Portal de pedidos para o time comercial.",
  scope: "Cadastro de pedidos e acompanhamento de status.",
  acceptance: "Login funciona\nPedido é criado e listado\n",
  decisions: "Usamos Postgres gerenciado.",
  engineeringPolicy: undefined,
  checks: {
    flows: "Fluxo de pedido coberto por testes.",
    security: "Permissões validadas.",
    accessibility: "",
    responsive: "",
  },
});

describe("buildDeliveryPack", () => {
  it("summarises the requirement, tasks and evidence", () => {
    const plan = planWith({
      ...basePlan,
      tasks: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Criar pedido",
          owner: "Ana",
          acceptance: "Pedido salvo no banco",
          status: "done",
          evidence: "teste e2e pedido.spec.ts passou",
          kind: "feature",
          requirementIds: ["REQ-01"],
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Listar pedidos",
          owner: "Bia",
          acceptance: "",
          status: "blocked",
          evidence: "",
        },
      ],
      evidenceItems: [
        {
          gate: "tests",
          status: "passed",
          summary: "12 testes passaram",
          command: "npm test",
          by: "human",
          executedAt: "2026-09-09T10:00:00.000Z",
        },
        {
          gate: "security",
          status: "failed",
          summary: "Falha de autorização no endpoint de pedidos",
          by: "human",
        },
      ],
    });

    const pack = buildDeliveryPack({ app: "Aurora", plan });

    expect(pack.app).toBe("Aurora");
    expect(pack.stage.label).toBe("Em revisão");
    expect(pack.requirement.acceptanceLines).toEqual([
      "Login funciona",
      "Pedido é criado e listado",
    ]);
    expect(pack.tasks.total).toBe(2);
    expect(pack.tasks.byStatus).toEqual({
      todo: 0,
      doing: 0,
      blocked: 1,
      done: 1,
    });
    expect(pack.tasks.verifiedCount).toBe(1);
    expect(pack.tasks.items[0].kindLabel).toBe("Funcionalidade");
    expect(pack.tasks.items[0].requirements).toEqual(["REQ-01"]);
    expect(pack.evidence.items).toHaveLength(2);
    expect(pack.evidence.items[1].statusLabel).toBe("Falhou");
    // a tarefa bloqueada sem critério/evidência aparece como bloqueio real
    expect(pack.blockers.delivery.length).toBeGreaterThan(0);
    expect(pack.blockers.delivery.join(" ")).toContain(
      "Conclua as tarefas com critérios de aceite e evidências.",
    );
  });

  it("reports missing gates for the risk profile instead of pretending", () => {
    const plan = planWith({
      ...basePlan,
      engineeringPolicy: engineeringPolicy("private"),
      evidenceItems: [
        { gate: "tests", status: "passed", summary: "ok", by: "human" },
      ],
    });

    const pack = buildDeliveryPack({ app: "Aurora", plan });

    expect(pack.risk.profile).toBe("private");
    expect(pack.risk.requiredGates.length).toBeGreaterThan(1);
    expect(pack.evidence.passedCount).toBe(1);
    expect(pack.evidence.missingGates.length).toBe(
      pack.risk.requiredGates.length - 1,
    );
    expect(pack.evidence.items[0].required).toBe(true);
    expect(pack.blockers.evidence.length).toBeGreaterThan(0);
  });

  it("keeps the approval history, newest first", () => {
    const plan = planWith(basePlan);
    const pack = buildDeliveryPack({
      app: "Aurora",
      plan,
      approvals: [
        {
          revision: 1,
          commit: "aaa111",
          reviewer: "Ana",
          note: "primeira revisão",
          createdAt: new Date("2026-09-01T10:00:00.000Z"),
        },
        {
          revision: 2,
          commit: "bbb222",
          reviewer: "Carlos",
          note: "segunda revisão",
          createdAt: new Date("2026-09-08T10:00:00.000Z"),
        },
      ],
    });

    expect(pack.history.map((entry) => entry.revision)).toEqual([2, 1]);
    expect(pack.approval).toMatchObject({
      revision: 2,
      reviewer: "Carlos",
      commit: "bbb222",
    });
  });

  it("falls back to the plan's inline approval when there is no history", () => {
    const plan = planWith({
      ...basePlan,
      reviewer: "Ana",
      approvalNote: "cliente validou em reunião",
      approvalCommit: "ccc333",
    });

    const pack = buildDeliveryPack({ app: "Aurora", plan });

    expect(pack.approval).toMatchObject({
      revision: 0,
      reviewer: "Ana",
      note: "cliente validou em reunião",
      commit: "ccc333",
    });
  });

  it("has no approval when nothing was approved", () => {
    const pack = buildDeliveryPack({ app: "Aurora", plan: planWith(basePlan) });
    expect(pack.approval).toBeNull();
  });
});

describe("renderDeliveryPackMarkdown", () => {
  it("answers what was agreed, what was verified and what is missing", () => {
    const plan = planWith({
      ...basePlan,
      tasks: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Criar pedido",
          owner: "Ana",
          acceptance: "Pedido salvo",
          status: "done",
          evidence: "teste passou",
        },
      ],
    });
    const pack = buildDeliveryPack({
      app: "Aurora",
      plan,
      approvals: [
        {
          revision: 3,
          commit: "ddd444",
          reviewer: "Carlos",
          note: "validado",
          createdAt: new Date("2026-09-09T12:00:00.000Z"),
        },
      ],
    });

    const md = renderDeliveryPackMarkdown(pack);

    expect(md).toContain("# Pacote de entrega — Aurora");
    expect(md).toContain("## 1. O que foi combinado");
    expect(md).toContain("## 2. Tarefas (1/1 verificadas)");
    expect(md).toContain("## 3. O que foi verificado");
    expect(md).toContain("## 4. Verificações registradas");
    expect(md).toContain("## 5. Aprovação");
    expect(md).toContain("## 6. O que falta");
    expect(md).toContain("Carlos");
    expect(md).toContain("| Criar pedido |");
  });

  it("declares the gaps instead of hiding them", () => {
    const pack = buildDeliveryPack({ app: "Aurora", plan: planWith(basePlan) });
    const md = renderDeliveryPackMarkdown(pack);

    // sem tarefas, sem evidência e sem aprovação
    expect(md).toContain("_Nenhuma tarefa registrada._");
    expect(md).toContain("_Nenhuma evidência registrada._");
    expect(md).toContain(
      "_Nenhuma aprovação registrada — a entrega não foi aprovada._",
    );
    expect(md).toContain("[entrega]");
    expect(md).toMatch(/não foi verificado|está declarado/);
  });

  it("escapes pipes so the table never breaks", () => {
    const plan = planWith({
      ...basePlan,
      tasks: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Suportar coluna | pipe",
          owner: "Ana",
          acceptance: "ok",
          status: "todo",
          evidence: "",
        },
      ],
    });
    const md = renderDeliveryPackMarkdown(
      buildDeliveryPack({ app: "Aurora", plan }),
    );
    expect(md).toContain("Suportar coluna \\| pipe");
  });
});

describe("deliveryPackFileName", () => {
  it("builds a safe file name from the app and date", () => {
    expect(
      deliveryPackFileName("Aurora Açaí Ltda.", "2026-09-09T12:00:00.000Z"),
    ).toBe("pacote-de-entrega-aurora-acai-ltda-2026-09-09.md");
  });

  it("falls back when the app slug is empty", () => {
    expect(deliveryPackFileName("!!!", "2026-09-09T00:00:00.000Z")).toBe(
      "pacote-de-entrega-projeto-2026-09-09.md",
    );
  });
});
