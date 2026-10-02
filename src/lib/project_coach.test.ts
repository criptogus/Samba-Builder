import { describe, expect, it } from "vitest";
import { emptyDeliveryPlan, type DeliveryPlan } from "@/delivery/model";
import type { Metrics } from "@/management/model";
import {
  buildProjectCoachBriefing,
  composeProjectCoachPrompt,
  localIsoDate,
} from "./project_coach";

const metrics = (partial: Partial<Metrics> = {}): Metrics => ({
  rates: [],
  deliveryStage: "development",
  approvalCommit: "",
  capturedAt: Date.parse("2026-09-17T12:00:00Z"),
  commit: "abc12345",
  codeLines: 800,
  codeFiles: 20,
  addedLines: 40,
  removedLines: 4,
  commits: 7,
  minutes: 180,
  laborCost: 0,
  unpricedMinutes: 0,
  tokens: [
    {
      provider: "openai",
      model: "gpt-4.1",
      source: "local-agent",
      inputTokens: 80_000,
      outputTokens: 90_000,
      calls: 12,
      unknownCalls: 0,
      estimatedCost: null,
    },
  ],
  features: [],
  completedTasks: 1,
  ...partial,
});

function planWith(overrides: Partial<DeliveryPlan>): DeliveryPlan {
  return {
    ...emptyDeliveryPlan(),
    stage: "development",
    dueDate: "2026-09-20",
    client: "Acme",
    owner: "Gus",
    scope: "App de pedidos",
    acceptance: "Pedido fecha e aparece no painel",
    tasks: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Tela de login",
        owner: "Gus",
        acceptance: "Usuário entra",
        status: "doing",
        evidence: "",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Lista de pedidos",
        owner: "Gus",
        acceptance: "Lista carrega",
        status: "todo",
        evidence: "",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Exportar CSV",
        owner: "Gus",
        acceptance: "Arquivo baixa",
        status: "todo",
        evidence: "",
      },
    ],
    ...overrides,
  };
}

describe("project coach briefing", () => {
  it("coloca trabalho em andamento no hoje e o restante depois", () => {
    const briefing = buildProjectCoachBriefing({
      plan: planWith({}),
      metrics: metrics(),
      today: "2026-09-17",
    });
    expect(briefing.stage).toBe("development");
    expect(briefing.daysUntilDue).toBe(3);
    expect(briefing.tokenTotal).toBe(170_000);
    expect(briefing.commits).toBe(7);
    expect(briefing.hours).toBe(3);
    expect(briefing.today.map((item) => item.title)).toContain("Tela de login");
    expect(briefing.later.map((item) => item.title)).toContain("Exportar CSV");
    expect(briefing.tips).toContain("tokens");
    expect(briefing.tips).toContain("architecture");
    expect(briefing.tips).toContain("timeDue");
  });

  it("marca prazo vencido e pede briefing quando o plano está vazio", () => {
    const briefing = buildProjectCoachBriefing({
      plan: emptyDeliveryPlan(),
      today: "2026-09-17",
    });
    expect(briefing.stage).toBe("briefing");
    expect(briefing.tips).toContain("timeNone");
    expect(briefing.today.some((item) => item.id === "briefing")).toBe(true);
    expect(briefing.lookAt.length).toBeGreaterThan(0);
  });

  it("composeProjectCoachPrompt resume etapa, tokens e o plano do dia", () => {
    const prompt = composeProjectCoachPrompt(
      buildProjectCoachBriefing({
        plan: planWith({}),
        metrics: metrics({ commits: 0 }),
        today: "2026-09-17",
      }),
    );
    expect(prompt).toContain("etapa development");
    expect(prompt).toContain("Tokens registrados: 170000");
    expect(prompt).toContain("Fazer hoje:");
    expect(prompt).toContain("Tela de login");
  });

  it("localIsoDate formata YYYY-MM-DD no fuso local", () => {
    expect(localIsoDate(new Date(2026, 8, 7))).toBe("2026-09-07");
  });
});
