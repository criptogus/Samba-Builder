import { EngineeringPolicySchema } from "./quality";
import { evidenceBlockers, EvidenceItemSchema } from "./evidence";
import { z } from "zod";
export const deliveryStages = [
  "briefing",
  "development",
  "review",
  "approved",
  "delivered",
] as const;
export const DeliveryTaskSchema = z.object({
  requirementIds: z.array(z.string()).max(150).optional(),
  kind: z.enum(["task", "feature", "bug"]).optional(),
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  owner: z.string().max(150),
  acceptance: z.string().max(3000),
  status: z.enum(["todo", "doing", "blocked", "done"]),
  evidence: z.string().max(5000),
});
export const qualityAreas = [
  "flows",
  "security",
  "accessibility",
  "responsive",
] as const;
export const DeliveryPlanSchema = z.object({
  engineeringPolicy: EngineeringPolicySchema.optional(),
  engineeringRequired: z.boolean().optional(),
  foundationRequired: z.boolean().optional(),
  foundationReviews: z
    .array(
      z.object({
        file: z.enum([
          "PRD.md",
          "ARCHITECTURE.md",
          "TECH_STACK.md",
          "DESIGN_SYSTEM.md",
          "TESTING.md",
          "OPERATIONS.md",
        ]),
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        reviewer: z.string().trim().min(1).max(150),
        note: z.string().trim().min(1).max(3000),
      }),
    )
    .max(6)
    .optional(),
  subagentTokenBudget: z.number().int().min(0).max(1000000000).default(0),
  client: z.string().max(200),
  owner: z.string().max(150),
  dueDate: z
    .string()
    .refine(
      (s) =>
        !s ||
        (/^\d{4}-\d{2}-\d{2}$/.test(s) &&
          !Number.isNaN(Date.parse(s)) &&
          new Date(s).toISOString().slice(0, 10) === s),
    ),
  brief: z.string().max(15000),
  scope: z.string().max(15000),
  acceptance: z.string().max(15000),
  decisions: z.string().max(15000),
  stage: z.enum(deliveryStages),
  tasks: z
    .array(DeliveryTaskSchema)
    .max(150)
    .refine(
      (a) => new Set(a.map((t) => t.id)).size === a.length,
      "IDs de tarefas duplicados",
    ),
  checks: z.object({
    flows: z.string().max(5000),
    security: z.string().max(5000),
    accessibility: z.string().max(5000),
    responsive: z.string().max(5000),
  }),
  /** Samba Delivery Standard — evidência estruturada por gate (ver evidence.ts). */
  evidenceItems: z.array(EvidenceItemSchema).max(60).default([]),
  reviewCommit: z.string().max(64),
  reviewer: z.string().max(150),
  approvalNote: z.string().max(5000),
  approvalCommit: z.string().max(64),
});
export type DeliveryPlan = z.infer<typeof DeliveryPlanSchema>;
export const emptyDeliveryPlan = (): DeliveryPlan => ({
  subagentTokenBudget: 0,
  client: "",
  owner: "",
  dueDate: "",
  brief: "",
  scope: "",
  acceptance: "",
  decisions: "",
  stage: "briefing",
  tasks: [],
  checks: { flows: "", security: "", accessibility: "", responsive: "" },
  evidenceItems: [],
  reviewCommit: "",
  reviewer: "",
  approvalNote: "",
  approvalCommit: "",
});
export function deliveryBlockers(plan: DeliveryPlan): string[] {
  const result: string[] = [];
  if (!plan.client.trim()) result.push("Informe o cliente.");
  if (!plan.owner.trim()) result.push("Defina o responsável pela entrega.");
  if (!plan.scope.trim() || !plan.acceptance.trim())
    result.push("Defina escopo e critérios de aceite.");
  if (!plan.tasks.length) result.push("Defina as tarefas da entrega.");
  if (
    plan.tasks.some(
      (t) => t.status !== "done" || !t.acceptance.trim() || !t.evidence.trim(),
    )
  )
    result.push("Conclua as tarefas com critérios de aceite e evidências.");
  if (qualityAreas.some((area) => !plan.checks[area].trim()))
    result.push("Registre as evidências das quatro verificações de qualidade.");
  if (!plan.reviewCommit)
    result.push("Vincule a revisão a uma versão salva no Git.");
  // Samba Delivery Standard: quando a política de engenharia define o perfil de
  // risco, os gates obrigatórios do perfil precisam de evidência estruturada
  // com status "passed" — "parece pronto" nunca é critério de conclusão.
  const profile = plan.engineeringPolicy?.profile;
  if (profile) {
    for (const blocker of evidenceBlockers(plan.evidenceItems, profile))
      result.push(`Evidência (perfil ${profile}): ${blocker}`);
  }
  // Gate de produto (PM): perfis private/critical exigem rastreabilidade
  // requisito → tarefa → evidência. Cada tarefa precisa estar vinculada a um
  // requisito existente na política (REQ-xx do PRODUCT_MEMORY.md).
  const policy = plan.engineeringPolicy;
  if (policy && policy.profile !== "public") {
    // Política parcial (plano antigo/importado) não pode derrubar os bloqueios.
    const requirements = policy.requirements ?? [];
    if (!requirements.length)
      result.push(
        "Defina os requisitos do produto na política de engenharia (REQ-xx com aceite) e vincule cada tarefa.",
      );
    const known = new Set(requirements.map((r) => r.id));
    const unlinked = plan.tasks.filter(
      (t) => !(t.requirementIds ?? []).length,
    ).length;
    if (unlinked)
      result.push(
        `Vincule cada tarefa a um requisito (REQ-xx): ${unlinked} tarefa(s) sem requisito.`,
      );
    const broken = [
      ...new Set(
        plan.tasks.flatMap((t) =>
          (t.requirementIds ?? []).filter((id) => !known.has(id)),
        ),
      ),
    ];
    if (broken.length)
      result.push(
        `Tarefa(s) referenciam requisito(s) inexistente(s) na política: ${broken.join(", ")}.`,
      );
  }
  return result;
}
export function deliveryAttention(
  plan: Pick<DeliveryPlan, "owner" | "dueDate" | "stage"> & {
    tasks: Pick<DeliveryPlan["tasks"][number], "status">[];
  },
  today: string,
): string[] {
  const reasons: string[] = [];
  if (plan.stage === "delivered") return reasons;
  if (!plan.owner.trim()) reasons.push("Sem responsável");
  if (plan.dueDate && plan.dueDate < today) reasons.push("Prazo vencido");
  const blocked = plan.tasks.filter((t) => t.status === "blocked").length;
  if (blocked) reasons.push(`${blocked} tarefa(s) bloqueada(s)`);
  if (plan.stage === "review") reasons.push("Aguardando revisão/aprovação");
  return reasons;
}
export function taskHandoff(plan: DeliveryPlan, taskId: string): string {
  const task = plan.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Tarefa não encontrada");
  return [
    "# Tarefa de entrega — Samba",
    `Cliente: ${plan.client}`,
    `Responsável: ${task.owner || plan.owner}`,
    `Briefing: ${plan.brief}`,
    `Escopo aprovado: ${plan.scope}`,
    `Critérios da entrega: ${plan.acceptance}`,
    `Decisões: ${plan.decisions}`,
    `## Objetivo\n${task.title}`,
    `## Pronto quando\n${task.acceptance}`,
    "Trabalhe somente neste escopo. Preserve alterações existentes. Verifique os critérios e registre testes executados, evidências e bloqueios. Nunca declare testes ou aprovação que não ocorreram. Acione especialistas apenas para subtarefas independentes que tragam benefício; mantenha um único escritor por conjunto de arquivos e integre os resultados antes de concluir. Não publique automaticamente.",
  ].join("\n\n");
}
