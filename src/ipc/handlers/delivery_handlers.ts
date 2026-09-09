import { assertEngineeringReady } from "../services/engineering_readiness";
import {
  installQualityTools,
  cancelQuality,
  listQualityRuns,
  runQuality,
  qualityArtifacts,
} from "../services/project_quality";
import { projectTestExecutions } from "@/db/schema";
import { collectFromDeliverySave } from "../services/knowledge_collector";
import {
  inspectFoundation,
  assertFoundationReviewed,
} from "../services/foundation_review";
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
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import {
  appOperationCoordinator,
  readAppResource,
} from "../services/app_operation_coordinator";
import { getSambaAppPath } from "@/paths/paths";
const fail = (message: string, kind = SambaErrorKind.Validation): never => {
  throw new SambaError(message, kind);
};
function appRow(appId: number) {
  const row = getHandlerContext()
    .db.select()
    .from(apps)
    .where(eq(apps.id, appId))
    .get();
  if (!row) return fail("Projeto não encontrado.", SambaErrorKind.NotFound);
  return row;
}
async function currentCommit(appId: number) {
  return readDeliveryCommit(getSambaAppPath(appRow(appId).path));
}

export function registerDeliveryHandlers() {
  createTypedHandler(deliveryContracts.installQuality, async () =>
    installQualityTools(),
  );
  createTypedHandler(deliveryContracts.cancelQuality, async () =>
    cancelQuality(),
  );
  createTypedHandler(deliveryContracts.qualityRuns, async (_, { appId }) => {
    appRow(appId);
    return listQualityRuns(appId);
  });
  createTypedHandler(deliveryContracts.runQuality, async (_, input) =>
    appOperationCoordinator.run(
      {
        appId: input.appId,
        operation: "quality-check",
        resources: [
          readAppResource("app-path"),
          readAppResource("repository"),
          readAppResource("runtime"),
          "metadata",
        ],
        refuseWhenRecording: "verificar qualidade",
      },
      () => runQuality(input.appId, input.kind, input),
    ),
  );
  createTypedHandler(deliveryContracts.qualityArtifacts, async (_, input) =>
    appOperationCoordinator.run(
      {
        appId: input.appId,
        operation: "quality-artifacts",
        resources: [
          readAppResource("app-path"),
          readAppResource("repository"),
          "metadata",
        ],
      },
      () => qualityArtifacts(input.appId, input.id, input.approve),
    ),
  );

  createTypedHandler(deliveryContracts.testEvidence, async (_, { appId }) => {
    appRow(appId);
    return getHandlerContext()
      .db.select({
        id: projectTestExecutions.id,
        startedAt: projectTestExecutions.startedAt,
        finishedAt: projectTestExecutions.finishedAt,
        commit: projectTestExecutions.commit,
        source: projectTestExecutions.source,
        status: projectTestExecutions.status,
        passed: projectTestExecutions.passed,
        failed: projectTestExecutions.failed,
        inconclusive: projectTestExecutions.inconclusive,
        files: projectTestExecutions.files,
      })
      .from(projectTestExecutions)
      .where(eq(projectTestExecutions.appId, appId))
      .orderBy(desc(projectTestExecutions.startedAt))
      .limit(30)
      .all();
  });
  createTypedHandler(deliveryContracts.foundation, async (_, { appId }) =>
    appOperationCoordinator.run(
      {
        appId,
        operation: "inspect-foundation",
        resources: [readAppResource("app-path"), readAppResource("repository")],
      },
      () => inspectFoundation(getSambaAppPath(appRow(appId).path)),
    ),
  );
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
            "metadata",
          ],
          refuseWhenRecording: "salvar a entrega",
        },
        async () => {
          appRow(appId);
          const saved = getHandlerContext()
            .db.select()
            .from(projectDeliveries)
            .where(eq(projectDeliveries.appId, appId))
            .get();
          if (
            saved &&
            JSON.parse(saved.data).foundationRequired &&
            !plan.foundationRequired
          )
            return fail(
              "A revisão da base é obrigatória para este projeto.",
              SambaErrorKind.Precondition,
            );
          if (
            saved &&
            JSON.parse(saved.data).engineeringRequired &&
            !plan.engineeringRequired
          )
            return fail(
              "A política de engenharia é obrigatória para este projeto.",
              SambaErrorKind.Precondition,
            );
          if (plan.stage === "approved" || plan.stage === "delivered") {
            const blockers = deliveryBlockers(plan);
            if (blockers.length)
              return fail(blockers.join("\n"), SambaErrorKind.Precondition);
            if (!plan.reviewer.trim() || !plan.approvalNote.trim())
              return fail(
                "Registre quem aprovou e a evidência da aprovação recebida.",
              );
            await assertFoundationReviewed(
              getSambaAppPath(appRow(appId).path),
              plan,
            );
            const head = await currentCommit(appId);
            await assertEngineeringReady(
              appId,
              plan,
              head,
              getSambaAppPath(appRow(appId).path),
            );
            if (head !== plan.reviewCommit || head !== plan.approvalCommit)
              return fail(
                "A aprovação não corresponde à versão atual. Faça uma nova revisão.",
                SambaErrorKind.Precondition,
              );
          }
          const { db } = getHandlerContext();
          const savedOutcome = db.transaction((tx) => {
            const previous = tx
              .select()
              .from(projectDeliveries)
              .where(eq(projectDeliveries.appId, appId))
              .get();
            if ((previous?.revision ?? 0) !== revision)
              return fail(
                "A entrega foi alterada em outra janela. Recarregue antes de salvar; seu rascunho permanece na tela.",
                SambaErrorKind.Conflict,
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
            return { appId, revision: next.revision, plan, previousPlan };
          });
          // RAG de aprendizado (F1): após o commit, coleta knowledge units dos
          // eventos reais deste save (aprovação nova, gate falho novo).
          // Best-effort e idempotente — nunca quebra o fluxo de entrega.
          try {
            const { previousPlan } = savedOutcome;
            collectFromDeliverySave(appId, plan, previousPlan);
          } catch {
            // coletor já trata os próprios erros; aqui é rede de segurança.
          }
          return {
            appId: savedOutcome.appId,
            revision: savedOutcome.revision,
            plan: savedOutcome.plan,
          };
        },
      ),
  );
}
