import crypto from "node:crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  apps,
  projectDeliveries,
  projectManagement,
  projectTokenEvents,
} from "@/db/schema";
import { getHandlerContext } from "./handler_context";
import { createTypedHandler } from "./base";
import { managementContracts } from "../types/management";
import {
  emptyManagement,
  ManagementSchema,
  priceTokens,
  summarizeTime,
  type Management,
  type Metrics,
} from "@/management/model";
import { DeliveryPlanSchema, emptyDeliveryPlan } from "@/delivery/model";
import { getSambaAppPath } from "@/paths/paths";
import {
  appOperationCoordinator,
  readAppResource,
} from "../services/app_operation_coordinator";
import {
  readCodeMetrics,
  assertCodeCommitted,
} from "../services/project_code_metrics";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
const fail = (message: string): never => {
  throw new SambaError(message, SambaErrorKind.Precondition);
};
function project(appId: number) {
  const row = getHandlerContext()
    .db.select()
    .from(apps)
    .where(eq(apps.id, appId))
    .get();
  if (!row)
    throw new SambaError("Projeto não encontrado", SambaErrorKind.NotFound);
  return row;
}
function record(appId: number) {
  project(appId);
  const row = getHandlerContext()
    .db.select()
    .from(projectManagement)
    .where(eq(projectManagement.appId, appId))
    .get();
  return {
    revision: row?.revision ?? 0,
    data: row
      ? ManagementSchema.parse(JSON.parse(row.data))
      : emptyManagement(),
  };
}
function delivery(appId: number) {
  const row = getHandlerContext()
    .db.select()
    .from(projectDeliveries)
    .where(eq(projectDeliveries.appId, appId))
    .get();
  return row
    ? DeliveryPlanSchema.parse(JSON.parse(row.data))
    : emptyDeliveryPlan();
}
function persist(appId: number, revision: number, data: Management) {
  return getHandlerContext().db.transaction((tx) => {
    const row = tx
      .select()
      .from(projectManagement)
      .where(eq(projectManagement.appId, appId))
      .get();
    if ((row?.revision ?? 0) !== revision)
      throw new SambaError(
        "A gestão mudou em outra janela. Recarregue antes de salvar; copie seu rascunho se necessário.",
        SambaErrorKind.Conflict,
      );
    const valid = ManagementSchema.parse(data);
    const next = { appId, revision: revision + 1, data: JSON.stringify(valid) };
    tx.insert(projectManagement)
      .values(next)
      .onConflictDoUpdate({ target: projectManagement.appId, set: next })
      .run();
    return { revision: next.revision, data: valid };
  });
}
async function metrics(
  appId: number,
  data: Management,
  sprintId?: string,
  end = Date.now(),
): Promise<Metrics> {
  const sprint = sprintId
    ? data.sprints.find((s) => s.id === sprintId)
    : undefined;
  if (sprintId && !sprint) return fail("Sprint não encontrada");
  if (sprint?.report) return sprint.report;
  const code = await readCodeMetrics(
    getSambaAppPath(project(appId).path),
    sprint?.baseCommit,
  );
  const groups = getHandlerContext()
    .db.select({
      provider: projectTokenEvents.provider,
      model: projectTokenEvents.model,
      source: projectTokenEvents.source,
      inputTokens: sql<number>`coalesce(sum(${projectTokenEvents.inputTokens}),0)`,
      outputTokens: sql<number>`coalesce(sum(${projectTokenEvents.outputTokens}),0)`,
      calls: sql<number>`count(*)`,
      unknownCalls: sql<number>`sum(case when ${projectTokenEvents.inputTokens} is null or ${projectTokenEvents.outputTokens} is null then 1 else 0 end)`,
    })
    .from(projectTokenEvents)
    .where(
      and(
        eq(projectTokenEvents.appId, appId),
        gte(projectTokenEvents.occurredAt, sprint?.startedAt ?? 0),
        lt(projectTokenEvents.occurredAt, end),
      ),
    )
    .groupBy(
      projectTokenEvents.provider,
      projectTokenEvents.model,
      projectTokenEvents.source,
    )
    .all();
  const plan = delivery(appId);
  const done = plan.tasks.filter(
    (t) => t.status === "done" && !sprint?.baselineDoneIds.includes(t.id),
  );
  return {
    ...code,
    rates: data.rates,
    deliveryStage: plan.stage,
    approvalCommit: plan.approvalCommit,
    capturedAt: end,
    ...summarizeTime(
      data.timeEntries.filter((t) => !sprint || t.sprintId === sprint.id),
    ),
    tokens: priceTokens(groups, data.rates),
    completedTasks: done.length,
    features: done
      .filter((t) => t.kind === "feature")
      .map((t) => ({ id: t.id, title: t.title, evidence: t.evidence })),
  };
}
const run = <T>(appId: number, fn: () => Promise<T> | T) =>
  appOperationCoordinator.run(
    {
      appId,
      operation: "project-management",
      resources: [
        readAppResource("app-path"),
        readAppResource("repository"),
        "metadata",
      ],
      refuseWhenRecording: "atualizar os indicadores",
    },
    async () => fn(),
  );
export function registerManagementHandlers() {
  createTypedHandler(managementContracts.get, async (_, { appId }) =>
    record(appId),
  );
  createTypedHandler(
    managementContracts.metrics,
    async (_, { appId, sprintId }) =>
      run(appId, () => metrics(appId, record(appId).data, sprintId)),
  );
  createTypedHandler(
    managementContracts.save,
    async (_, { appId, revision, rates, timeEntries }) =>
      run(appId, () => {
        const { data } = record(appId);
        const closed = new Set(
          data.sprints.filter((s) => s.endedAt !== null).map((s) => s.id),
        );
        const frozen = (entries: Management["timeEntries"]) =>
          entries.filter((t) => t.sprintId && closed.has(t.sprintId));
        if (
          JSON.stringify(frozen(data.timeEntries)) !==
          JSON.stringify(frozen(timeEntries))
        )
          return fail("Apontamentos de sprint encerrada são imutáveis.");
        if (
          timeEntries.some(
            (t) => t.sprintId && !data.sprints.some((s) => s.id === t.sprintId),
          )
        )
          return fail("Sprint inválida no apontamento");
        return persist(appId, revision, { ...data, rates, timeEntries });
      }),
  );
  createTypedHandler(
    managementContracts.start,
    async (_, { appId, revision, name }) =>
      run(appId, async () => {
        const { data } = record(appId);
        if (data.sprints.some((s) => s.endedAt === null))
          return fail("Encerre a sprint atual antes de iniciar outra.");
        await assertCodeCommitted(getSambaAppPath(project(appId).path));
        const code = await readCodeMetrics(
          getSambaAppPath(project(appId).path),
        );
        data.sprints.push({
          id: crypto.randomUUID(),
          name,
          startedAt: Date.now(),
          endedAt: null,
          baseCommit: code.commit,
          baselineDoneIds: delivery(appId)
            .tasks.filter((t) => t.status === "done")
            .map((t) => t.id),
          report: null,
        });
        return persist(appId, revision, data);
      }),
  );
  createTypedHandler(
    managementContracts.close,
    async (_, { appId, revision, sprintId }) =>
      run(appId, async () => {
        const { data } = record(appId);
        const sprint = data.sprints.find((s) => s.id === sprintId);
        if (!sprint || sprint.endedAt !== null)
          return fail("Sprint não está aberta.");
        await assertCodeCommitted(getSambaAppPath(project(appId).path));
        const end = Date.now();
        sprint.report = await metrics(appId, data, sprintId, end);
        sprint.endedAt = end;
        return persist(appId, revision, data);
      }),
  );
}
