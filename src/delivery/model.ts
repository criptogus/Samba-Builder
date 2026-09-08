import { EngineeringPolicySchema } from "./quality";
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
