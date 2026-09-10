/**
 * Pacote de entrega — a prova exportável de uma versão.
 *
 * O Samba Builder não vende "código gerado": vende uma entrega que passa por
 * gates. Esse módulo transforma o plano de entrega + a evidência registrada +
 * o histórico de aprovações em um documento único, legível por um cliente ou
 * auditor, com três perguntas respondidas de forma explícita:
 *
 *   1. O que foi combinado?         (requisito, escopo, critérios de aceite)
 *   2. O que foi verificado?        (evidência por gate, com comando e versão)
 *   3. O que ficou faltando?        (bloqueios atuais — nunca escondidos)
 *
 * O que não foi verificado aparece como não verificado. Um pacote incompleto
 * que diz o que falta vale mais do que um pacote "verde" sem lastro.
 */

import type { DeliveryPlan } from "./model";
import { deliveryBlockers } from "./model";
import {
  evidenceBlockers,
  gateLabels,
  requiredGates,
  riskProfileLabels,
  type EvidenceGateId,
  type RiskProfile,
} from "./evidence";

const stageLabels: Record<DeliveryPlan["stage"], string> = {
  briefing: "Briefing",
  development: "Desenvolvimento",
  review: "Em revisão",
  approved: "Aprovado",
  delivered: "Entregue",
};

const taskStatusLabels = {
  todo: "A fazer",
  doing: "Em andamento",
  blocked: "Bloqueada",
  done: "Concluída",
} as const;

const taskKindLabels = {
  task: "Tarefa",
  feature: "Funcionalidade",
  bug: "Correção",
} as const;

const evidenceStatusLabels: Record<string, string> = {
  passed: "Verificado",
  failed: "Falhou",
  not_run: "Não executado",
  blocked: "Bloqueado",
};

export interface DeliveryPackEvidence {
  gateId: EvidenceGateId;
  gate: string;
  status: string;
  statusLabel: string;
  summary: string;
  command?: string;
  version?: string;
  artifacts?: string[];
  commit?: string;
  by: "human" | "agent";
  executedAt?: string;
  required: boolean;
}

export interface DeliveryPackApproval {
  revision: number;
  commit: string;
  reviewer: string;
  note: string;
  createdAt: string | null;
}

export interface DeliveryPackTask {
  id: string;
  title: string;
  kind: keyof typeof taskKindLabels;
  kindLabel: string;
  status: keyof typeof taskStatusLabels;
  statusLabel: string;
  owner: string;
  acceptance: string;
  evidence: string;
  requirements: string[];
  /** Tarefa só conta como verificada com critério de aceite E evidência. */
  verified: boolean;
}

export interface DeliveryPack {
  app: string;
  generatedAt: string;
  stage: { id: DeliveryPlan["stage"]; label: string };
  client: string;
  owner: string;
  dueDate: string;
  risk: {
    profile: RiskProfile | null;
    label: string;
    requiredGates: { id: EvidenceGateId; label: string }[];
  };
  requirement: {
    brief: string;
    scope: string;
    acceptanceLines: string[];
    decisions: string;
  };
  tasks: {
    total: number;
    byStatus: Record<keyof typeof taskStatusLabels, number>;
    verifiedCount: number;
    items: DeliveryPackTask[];
  };
  evidence: {
    items: DeliveryPackEvidence[];
    requiredCount: number;
    passedCount: number;
    missingGates: string[];
  };
  checks: {
    flows: string;
    security: string;
    accessibility: string;
    responsive: string;
  };
  approval: DeliveryPackApproval | null;
  history: DeliveryPackApproval[];
  blockers: { delivery: string[]; evidence: string[] };
}

interface RawApproval {
  revision: number;
  commit: string;
  reviewer: string;
  note: string;
  createdAt: Date | string;
}

export interface BuildDeliveryPackInput {
  app: string;
  plan: DeliveryPlan;
  approvals?: RawApproval[];
  generatedAt?: string;
}

function toIso(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Critérios de aceite digitados como uma linha por critério. */
function acceptanceLines(acceptance: string): string[] {
  return acceptance
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

export function buildDeliveryPack({
  app,
  plan,
  approvals = [],
  generatedAt,
}: BuildDeliveryPackInput): DeliveryPack {
  const profile = plan.engineeringPolicy?.profile ?? undefined;
  const gates = requiredGates(profile);
  const required = new Set<EvidenceGateId>(gates);

  // Um item por gate; o mais recente é a verdade atual.
  const latest = new Map<
    EvidenceGateId,
    DeliveryPlan["evidenceItems"][number]
  >();
  for (const item of plan.evidenceItems) latest.set(item.gate, item);

  const evidenceItems: DeliveryPackEvidence[] = plan.evidenceItems.map(
    (item) => ({
      gateId: item.gate,
      gate: gateLabels[item.gate],
      status: item.status,
      statusLabel: evidenceStatusLabels[item.status] ?? item.status,
      summary: item.summary,
      command: item.command,
      version: item.version,
      artifacts: item.artifacts,
      commit: item.commit,
      by: item.by,
      executedAt: item.executedAt,
      required: required.has(item.gate),
    }),
  );

  const missingGates = gates
    .filter((gate) => {
      const item = latest.get(gate);
      return !item || item.status !== "passed";
    })
    .map((gate) => gateLabels[gate]);

  const byStatus: Record<keyof typeof taskStatusLabels, number> = {
    todo: 0,
    doing: 0,
    blocked: 0,
    done: 0,
  };
  for (const task of plan.tasks) byStatus[task.status] += 1;

  const taskItems: DeliveryPackTask[] = plan.tasks.map((task) => {
    const kind = task.kind ?? "task";
    return {
      id: task.id,
      title: task.title,
      kind,
      kindLabel: taskKindLabels[kind],
      status: task.status,
      statusLabel: taskStatusLabels[task.status],
      owner: task.owner,
      acceptance: task.acceptance,
      evidence: task.evidence,
      requirements: task.requirementIds ?? [],
      verified:
        task.status === "done" &&
        Boolean(task.acceptance.trim()) &&
        Boolean(task.evidence.trim()),
    };
  });

  const history: DeliveryPackApproval[] = approvals
    .map((approval) => ({
      revision: approval.revision,
      commit: approval.commit,
      reviewer: approval.reviewer,
      note: approval.note,
      createdAt: toIso(approval.createdAt),
    }))
    .sort((a, b) => b.revision - a.revision);

  const approval =
    history[0] ??
    (plan.reviewer.trim() || plan.approvalCommit.trim()
      ? {
          revision: 0,
          commit: plan.approvalCommit,
          reviewer: plan.reviewer,
          note: plan.approvalNote,
          createdAt: null,
        }
      : null);

  return {
    app,
    generatedAt: generatedAt ?? new Date().toISOString(),
    stage: { id: plan.stage, label: stageLabels[plan.stage] },
    client: plan.client,
    owner: plan.owner,
    dueDate: plan.dueDate,
    risk: {
      profile: profile ?? null,
      label: profile ? riskProfileLabels[profile] : "Não definido",
      requiredGates: gates.map((gate) => ({
        id: gate,
        label: gateLabels[gate],
      })),
    },
    requirement: {
      brief: plan.brief,
      scope: plan.scope,
      acceptanceLines: acceptanceLines(plan.acceptance),
      decisions: plan.decisions,
    },
    tasks: {
      total: taskItems.length,
      byStatus,
      verifiedCount: taskItems.filter((task) => task.verified).length,
      items: taskItems,
    },
    evidence: {
      items: evidenceItems,
      requiredCount: gates.length,
      passedCount: gates.filter((gate) => latest.get(gate)?.status === "passed")
        .length,
      missingGates,
    },
    checks: { ...plan.checks },
    approval,
    history,
    blockers: {
      delivery: deliveryBlockers(plan),
      evidence: evidenceBlockers(plan.evidenceItems, profile),
    },
  };
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`);
  return [head, divider, ...body].join("\n");
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim() || "—";
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}

/** Markdown legível por cliente/auditor — pronto para exportar ou colar. */
export function renderDeliveryPackMarkdown(pack: DeliveryPack): string {
  const parts: string[] = [];

  parts.push(`# Pacote de entrega — ${pack.app}`);
  parts.push(
    [
      `**Gerado em:** ${pack.generatedAt}`,
      `**Estágio:** ${pack.stage.label}`,
      `**Perfil de risco:** ${pack.risk.label}`,
      pack.client ? `**Cliente:** ${pack.client}` : null,
      pack.owner ? `**Responsável:** ${pack.owner}` : null,
      pack.dueDate ? `**Prazo:** ${pack.dueDate}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  // 1. O que foi combinado
  const requirement: string[] = [];
  if (pack.requirement.brief.trim())
    requirement.push(`### Briefing\n${pack.requirement.brief.trim()}`);
  if (pack.requirement.scope.trim())
    requirement.push(`### Escopo\n${pack.requirement.scope.trim()}`);
  requirement.push(
    pack.requirement.acceptanceLines.length
      ? `### Critérios de aceite\n${pack.requirement.acceptanceLines
          .map((line) => `- ${line}`)
          .join("\n")}`
      : "### Critérios de aceite\n_Nenhum critério registrado._",
  );
  parts.push(section("1. O que foi combinado", requirement.join("\n\n")));

  // 2. Tarefas
  const taskRows = pack.tasks.items.map((task) => [
    cell(task.title),
    cell(task.kindLabel),
    cell(task.statusLabel),
    cell(task.owner),
    task.verified ? "Sim" : "Não",
  ]);
  parts.push(
    section(
      `2. Tarefas (${pack.tasks.verifiedCount}/${pack.tasks.total} verificadas)`,
      [
        [
          `${pack.tasks.byStatus.todo} a fazer`,
          `${pack.tasks.byStatus.doing} em andamento`,
          `${pack.tasks.byStatus.blocked} bloqueadas`,
          `${pack.tasks.byStatus.done} concluídas`,
        ].join(" · "),
        "",
        taskRows.length
          ? table(
              ["Tarefa", "Tipo", "Status", "Responsável", "Verificada"],
              taskRows,
            )
          : "_Nenhuma tarefa registrada._",
      ].join("\n"),
    ),
  );

  // 3. Evidência por gate
  const evidenceRows = pack.evidence.items.map((item) => [
    cell(item.gate),
    cell(item.statusLabel),
    cell(item.summary),
    cell(item.command ?? ""),
    cell(
      [item.by === "agent" ? "agente" : "humano", item.executedAt ?? ""]
        .filter(Boolean)
        .join(" · "),
    ),
  ]);
  parts.push(
    section(
      `3. O que foi verificado (${pack.evidence.passedCount}/${pack.evidence.requiredCount} gates obrigatórios)`,
      [
        `Gates exigidos pelo perfil **${pack.risk.label}**: ${pack.risk.requiredGates
          .map((gate) => gate.label)
          .join(", ")}.`,
        "",
        evidenceRows.length
          ? table(
              [
                "Gate",
                "Resultado",
                "O que foi verificado",
                "Comando",
                "Registrado por",
              ],
              evidenceRows,
            )
          : "_Nenhuma evidência registrada._",
        "",
        pack.evidence.missingGates.length
          ? `**Sem evidência suficiente:** ${pack.evidence.missingGates.join(", ")}.`
          : "**Todos os gates obrigatórios foram verificados.**",
      ].join("\n"),
    ),
  );

  // 4. Verificações registradas (checklist do plano)
  const checkEntries: [string, string][] = [
    ["Fluxos essenciais e testes", pack.checks.flows],
    ["Segurança e permissões", pack.checks.security],
    ["Acessibilidade", pack.checks.accessibility],
    ["Responsividade", pack.checks.responsive],
  ];
  parts.push(
    section(
      "4. Verificações registradas",
      checkEntries
        .map(
          ([label, value]) =>
            `**${label}:** ${value.trim() || "_não registrado_"}`,
        )
        .join("\n\n"),
    ),
  );

  // 5. Aprovação
  const approvalLines: string[] = [];
  if (pack.approval) {
    approvalLines.push(
      [
        `**Aprovado por:** ${pack.approval.reviewer || "—"}`,
        `**Versão:** ${pack.approval.commit || "—"}`,
        pack.approval.createdAt ? `**Data:** ${pack.approval.createdAt}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (pack.approval.note.trim())
      approvalLines.push(
        `**Evidência da aprovação:**\n${pack.approval.note.trim()}`,
      );
  } else {
    approvalLines.push(
      "_Nenhuma aprovação registrada — a entrega não foi aprovada._",
    );
  }
  if (pack.history.length > 1) {
    approvalLines.push(
      `**Histórico:**\n${pack.history
        .map(
          (entry) =>
            `- revisão ${entry.revision} · ${entry.reviewer || "—"} · ${entry.commit || "—"}`,
        )
        .join("\n")}`,
    );
  }
  parts.push(section("5. Aprovação", approvalLines.join("\n\n")));

  // 6. Bloqueios
  const blockers = [
    ...pack.blockers.delivery.map((item) => `- [entrega] ${item}`),
    ...pack.blockers.evidence.map((item) => `- [evidência] ${item}`),
  ];
  parts.push(
    section(
      "6. O que falta",
      blockers.length
        ? `${blockers.join("\n")}`
        : "Nenhum bloqueio: a entrega está completa pelos critérios do plano.",
    ),
  );

  // 7. Decisões
  if (pack.requirement.decisions.trim()) {
    parts.push(
      section(
        "7. Decisões e memória do projeto",
        pack.requirement.decisions.trim(),
      ),
    );
  }

  parts.push(
    "---\n_Gerado pelo Samba Builder. O que não foi verificado está declarado como tal: um pacote honesto vale mais do que um pacote verde._",
  );

  return parts.join("\n\n");
}

/** Nome de arquivo seguro para exportar o pacote. */
export function deliveryPackFileName(app: string, generatedAt: string): string {
  const slug = app
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const date = generatedAt.slice(0, 10);
  return `pacote-de-entrega-${slug || "projeto"}-${date}.md`;
}
