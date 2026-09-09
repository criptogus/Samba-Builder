import type { DeliveryPlan } from "./model";
import type { EvidenceItem } from "./evidence";

/**
 * RAG de aprendizado contínuo — extração estruturada (F1, sem LLM).
 *
 * Cada evento real de entrega gera uma knowledge unit com fonte verificável:
 * - Entrega aprovada (approved/delivered com approvalCommit novo) → padrão
 *   validado: o que passou nos gates e foi aceito pelo cliente.
 * - Gate de qualidade registrado como failed/blocked/not_run → erro_evitar:
 *   o que foi verificado e não passou (com a descrição da evidência).
 *
 * O LLM entra depois (F2/F3) para síntese entre projetos; aqui a extração é
 * determinística e fiel à fonte — nunca inventa conteúdo.
 */

export const knowledgeKinds = [
  "episodio",
  "erro_evitar",
  "padrao_validado",
  "skill_delta",
] as const;
export type KnowledgeKind = (typeof knowledgeKinds)[number];

export type KnowledgeUnitDraft = {
  kind: KnowledgeKind;
  title: string;
  body: string;
  /** Contexto de aplicação (perfil de risco, gates, revisão). */
  context: Record<string, unknown>;
  /** Fonte verificável para auditoria. */
  source: Record<string, unknown>;
  force: number;
};

/** Id determinístico do evento → re-processar o mesmo evento nunca duplica. */
export function eventId(prefix: string, appId: number, anchor: string): string {
  // FNV-1a 32-bit — suficiente para idempotência local (não é criptográfico).
  let h = 0x811c9dc5;
  const s = `${prefix}:${appId}:${anchor}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `ku_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

const passedGates = (plan: DeliveryPlan) =>
  plan.evidenceItems.filter((i) => i.status === "passed").map((i) => i.gate);

/** Entrega passou a ser aprovada/entregue com versão nova → padrão validado. */
export function unitFromApproval(
  appId: number,
  plan: DeliveryPlan,
  previous?: DeliveryPlan,
): { id: string; draft: KnowledgeUnitDraft } | null {
  const isApproving =
    (plan.stage === "approved" || plan.stage === "delivered") &&
    plan.approvalCommit &&
    (!previous ||
      !previous.approvalCommit ||
      previous.approvalCommit !== plan.approvalCommit);
  if (!isApproving) return null;
  const gates = passedGates(plan);
  const profile = plan.engineeringPolicy?.profile ?? "sem perfil definido";
  const checks = plan.checks;
  return {
    id: eventId("approval", appId, plan.approvalCommit),
    draft: {
      kind: "padrao_validado",
      title: `Entrega aprovada (${profile}): ${plan.client || "projeto"}`,
      body: [
        `Perfil de risco: ${profile}.`,
        gates.length
          ? `Gates com evidência passed: ${gates.join(", ")}.`
          : "Sem gates estruturados registrados.",
        checks.flows.trim() ? `Fluxos: ${checks.flows.slice(0, 400)}` : null,
        checks.security.trim()
          ? `Segurança: ${checks.security.slice(0, 400)}`
          : null,
        checks.accessibility.trim()
          ? `Acessibilidade: ${checks.accessibility.slice(0, 400)}`
          : null,
        checks.responsive.trim()
          ? `Responsividade: ${checks.responsive.slice(0, 400)}`
          : null,
        plan.approvalNote.trim()
          ? `Aprovação: ${plan.approvalNote.slice(0, 400)}`
          : null,
      ]
        .filter((l): l is string => Boolean(l))
        .join("\n"),
      context: { profile, stage: plan.stage, scope: plan.scope.slice(0, 200) },
      source: {
        kind: "delivery_approval",
        commit: plan.approvalCommit,
        reviewCommit: plan.reviewCommit,
        reviewer: plan.reviewer,
        appId,
      },
      force: 1,
    },
  };
}

/** Item de evidência registrado como falha/blocked/not_run (novo) → erro_evitar. */
export function unitFromFailedGate(
  appId: number,
  plan: DeliveryPlan,
  previous: DeliveryPlan | undefined,
  item: EvidenceItem,
): { id: string; draft: KnowledgeUnitDraft } | null {
  if (item.status === "passed") return null;
  const wasAlready =
    previous?.evidenceItems.some(
      (i) => i.gate === item.gate && i.status === item.status,
    ) ?? false;
  if (wasAlready) return null;
  const profile = plan.engineeringPolicy?.profile ?? "sem perfil definido";
  return {
    id: eventId(
      "gate",
      appId,
      `${item.gate}:${item.status}:${item.summary.slice(0, 80)}`,
    ),
    draft: {
      kind: "erro_evitar",
      title: `Gate "${item.gate}" ${item.status} (${profile})`,
      body: item.summary.slice(0, 2000),
      context: {
        profile,
        gate: item.gate,
        status: item.status,
        command: item.command ?? undefined,
      },
      source: {
        kind: "evidence_gate",
        appId,
        commit: item.commit ?? plan.reviewCommit ?? undefined,
        by: item.by,
      },
      force: 1,
    },
  };
}
