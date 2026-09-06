import { readDeliveryCommit } from "../services/delivery_readiness";
import { getDeliveryAgentUsage } from "../services/delivery_usage";
import { eq, desc } from "drizzle-orm";
import { apps, projectDeliveries, projectDeliveryApprovals } from "@/db/schema";
import { getHandlerContext } from "./handler_context";
import { createTypedHandler } from "./base";
import { deliveryContracts } from "../types/delivery";
import {
  DeliveryPlanSchema,
  deliveryBlockers,
  emptyDeliveryPlan,
} from "@/delivery/model";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import {
  appOperationCoordinator,
  readAppResource,
} from "../services/app_operation_coordinator";
import { getDyadAppPath } from "@/paths/paths";
const fail = (message: string, kind = DyadErrorKind.Validation): never => {
  throw new DyadError(message, kind);
};
function appRow(appId: number) {
  const row = getHandlerContext()
    .db.select()
    .from(apps)
    .where(eq(apps.id, appId))
    .get();
  if (!row) return fail("Projeto não encontrado.", DyadErrorKind.NotFound);
  return row;
}
async function currentCommit(appId: number) {
  return readDeliveryCommit(getDyadAppPath(appRow(appId).path));
}

export function registerDeliveryHandlers() {
  createTypedHandler(deliveryContracts.approvals, async (_, { appId }) => {
    appRow(appId);
    return getHandlerContext()
      .db.select({
        id: projectDeliveryApprovals.id,
        revision: projectDeliveryApprovals.revision,
        commit: projectDeliveryApprovals.commit,
        reviewer: projectDeliveryApprovals.reviewer,
        note: projectDeliveryApprovals.note,
        createdAt: projectDeliveryApprovals.createdAt,
      })
      .from(projectDeliveryApprovals)
      .where(eq(projectDeliveryApprovals.appId, appId))
      .orderBy(desc(projectDeliveryApprovals.id))
      .limit(20)
      .all();
  });
  createTypedHandler(deliveryContracts.usage, async (_, { appId }) => {
    appRow(appId);
    return getDeliveryAgentUsage(appId);
  });
  createTypedHandler(deliveryContracts.get, async (_, { appId }) => {
    appRow(appId);
    const row = getHandlerContext()
      .db.select()
      .from(projectDeliveries)
      .where(eq(projectDeliveries.appId, appId))
      .get();
    return {
      appId,
      revision: row?.revision ?? 0,
      plan: row
        ? DeliveryPlanSchema.parse(JSON.parse(row.data))
        : emptyDeliveryPlan(),
    };
  });
  createTypedHandler(deliveryContracts.list, async () =>
    getHandlerContext()
      .db.select()
      .from(projectDeliveries)
      .all()
      .map((row) => {
        const plan = DeliveryPlanSchema.parse(JSON.parse(row.data));
        return {
          appId: row.appId,
          revision: row.revision,
          plan: {
            owner: plan.owner,
            dueDate: plan.dueDate,
            stage: plan.stage,
            tasks: plan.tasks.map((t) => ({ status: t.status })),
          },
        };
      }),
  );
  createTypedHandler(deliveryContracts.snapshot, async (_, { appId }) =>
    appOperationCoordinator.run(
      {
        appId,
        operation: "delivery-version",
        resources: [readAppResource("app-path"), readAppResource("repository")],
        refuseWhenRecording: "vincular uma revisão",
      },
      () => currentCommit(appId),
    ),
  );
  createTypedHandler(
    deliveryContracts.save,
    async (_, { appId, revision, plan }) =>
      appOperationCoordinator.run(
        {
          appId,
          operation: "save-delivery",
          resources: [
            readAppResource("app-path"),
            readAppResource("repository"),
          ],
          refuseWhenRecording: "salvar a entrega",
        },
        async () => {
          appRow(appId);
          if (plan.stage === "approved" || plan.stage === "delivered") {
            const blockers = deliveryBlockers(plan);
            if (blockers.length)
              return fail(blockers.join("\n"), DyadErrorKind.Precondition);
            if (!plan.reviewer.trim() || !plan.approvalNote.trim())
              return fail(
                "Registre quem aprovou e a evidência da aprovação recebida.",
              );
            const head = await currentCommit(appId);
            if (head !== plan.reviewCommit || head !== plan.approvalCommit)
              return fail(
                "A aprovação não corresponde à versão atual. Faça uma nova revisão.",
                DyadErrorKind.Precondition,
              );
          }
          const { db } = getHandlerContext();
          return db.transaction((tx) => {
            const previous = tx
              .select()
              .from(projectDeliveries)
              .where(eq(projectDeliveries.appId, appId))
              .get();
            if ((previous?.revision ?? 0) !== revision)
              return fail(
                "A entrega foi alterada em outra janela. Recarregue antes de salvar; seu rascunho permanece na tela.",
                DyadErrorKind.Conflict,
              );
            const previousPlan = previous
              ? DeliveryPlanSchema.parse(JSON.parse(previous.data))
              : undefined;
            if (
              plan.approvalCommit &&
              (plan.stage === "approved" || plan.stage === "delivered") &&
              (!previousPlan ||
                !["approved", "delivered"].includes(previousPlan.stage) ||
                JSON.stringify({ ...previousPlan, stage: plan.stage }) !==
                  JSON.stringify(plan))
            ) {
              tx.insert(projectDeliveryApprovals)
                .values({
                  appId,
                  revision: revision + 1,
                  commit: plan.approvalCommit,
                  reviewer: plan.reviewer,
                  note: plan.approvalNote,
                  snapshot: JSON.stringify(plan),
                })
                .run();
            }
            const next = {
              appId,
              revision: revision + 1,
              data: JSON.stringify(plan),
              updatedAt: new Date(),
            };
            tx.insert(projectDeliveries)
              .values(next)
              .onConflictDoUpdate({
                target: projectDeliveries.appId,
                set: next,
              })
              .run();
            return { appId, revision: next.revision, plan };
          });
        },
      ),
  );
}
