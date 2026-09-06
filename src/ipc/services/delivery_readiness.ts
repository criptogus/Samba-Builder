import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projectDeliveries } from "@/db/schema";
import { DeliveryPlanSchema, deliveryBlockers } from "@/delivery/model";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
const exec = promisify(execFile);
export async function readDeliveryCommit(root: string): Promise<string> {
  const status = await exec("git", ["status", "--porcelain"], {
    cwd: root,
    timeout: 10000,
    maxBuffer: 1000000,
  });
  if (status.stdout.trim())
    throw new DyadError(
      "Salve as alterações do projeto em uma versão Git antes de vincular ou aprovar a revisão.",
      DyadErrorKind.Precondition,
    );
  return (
    await exec("git", ["rev-parse", "HEAD"], { cwd: root, timeout: 10000 })
  ).stdout.trim();
}
/** Caller holds repository/app-path coordination until publishing finishes. */
export async function assertDeliveryReadyForPublish(
  appId: number,
  root: string,
): Promise<string | undefined> {
  const row = db
    .select()
    .from(projectDeliveries)
    .where(eq(projectDeliveries.appId, appId))
    .get();
  if (!row) return undefined;
  const plan = DeliveryPlanSchema.parse(JSON.parse(row.data));
  if (
    !["approved", "delivered"].includes(plan.stage) ||
    deliveryBlockers(plan).length ||
    !plan.reviewer.trim() ||
    !plan.approvalNote.trim()
  )
    throw new DyadError(
      "Esta entrega ainda não está aprovada. Conclua a revisão e registre a aprovação no plano de entrega antes de publicar em produção.",
      DyadErrorKind.Precondition,
    );
  const commit = await readDeliveryCommit(root);
  if (commit !== plan.reviewCommit || commit !== plan.approvalCommit)
    throw new DyadError(
      "O código mudou desde a aprovação. Revise e aprove a nova versão antes de publicar em produção.",
      DyadErrorKind.Precondition,
    );
  return commit;
}
