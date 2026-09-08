import { assertEngineeringReady } from "./engineering_readiness";
import { assertFoundationReviewed } from "./foundation_review";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projectDeliveries } from "@/db/schema";
import { DeliveryPlanSchema, deliveryBlockers } from "@/delivery/model";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { execGit } from "../utils/git_utils";
export async function readDeliveryCommit(root: string): Promise<string> {
  const status = await execGit(["status", "--porcelain"], root, {
    signal: AbortSignal.timeout(10000),
    maxBuffer: 1000000,
  });
  if (status.exitCode !== 0)
    throw new Error("Não foi possível verificar o estado Git do projeto.");
  if (status.stdout.trim())
    throw new SambaError(
      "Salve as alterações do projeto em uma versão Git antes de vincular ou aprovar a revisão.",
      SambaErrorKind.Precondition,
    );
  const head = await execGit(["rev-parse", "HEAD"], root, {
    signal: AbortSignal.timeout(10000),
    maxBuffer: 1000000,
  });
  if (head.exitCode !== 0)
    throw new Error("Não foi possível identificar a versão Git do projeto.");
  return head.stdout.trim();
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
  if (!row) {
    await assertFoundationReviewed(root);
    return undefined;
  }
  const plan = DeliveryPlanSchema.parse(JSON.parse(row.data));
  if (
    !["approved", "delivered"].includes(plan.stage) ||
    deliveryBlockers(plan).length ||
    !plan.reviewer.trim() ||
    !plan.approvalNote.trim()
  )
    throw new SambaError(
      "Esta entrega ainda não está aprovada. Conclua a revisão e registre a aprovação no plano de entrega antes de publicar em produção.",
      SambaErrorKind.Precondition,
    );
  await assertFoundationReviewed(root, plan);
  const commit = await readDeliveryCommit(root);
  if (commit !== plan.reviewCommit || commit !== plan.approvalCommit)
    throw new SambaError(
      "O código mudou desde a aprovação. Revise e aprove a nova versão antes de publicar em produção.",
      SambaErrorKind.Precondition,
    );
  await assertEngineeringReady(appId, plan, commit, root);
  return commit;
}
