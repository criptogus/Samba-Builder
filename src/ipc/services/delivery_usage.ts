import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentThreads, chats, projectDeliveries } from "@/db/schema";
import { DeliveryPlanSchema } from "@/delivery/model";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
export function getDeliveryAgentUsage(appId: number) {
  const rows = db
    .select({
      input: agentThreads.inputTokens,
      output: agentThreads.outputTokens,
    })
    .from(agentThreads)
    .innerJoin(chats, eq(chats.id, agentThreads.chatId))
    .where(eq(chats.appId, appId))
    .all();
  return rows.reduce(
    (sum, row) => ({
      inputTokens: sum.inputTokens + row.input,
      outputTokens: sum.outputTokens + row.output,
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
}
export function assertDeliveryAgentBudget(appId: number) {
  const row = db
    .select()
    .from(projectDeliveries)
    .where(eq(projectDeliveries.appId, appId))
    .get();
  if (!row) return;
  const plan = DeliveryPlanSchema.parse(JSON.parse(row.data));
  if (!plan.subagentTokenBudget) return;
  const usage = getDeliveryAgentUsage(appId);
  if (usage.inputTokens + usage.outputTokens >= plan.subagentTokenBudget)
    throw new SambaError(
      "O limite de tokens dos subagentes deste projeto foi atingido. Revise o consumo no plano de entrega antes de continuar.",
      SambaErrorKind.Precondition,
    );
}
