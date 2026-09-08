import { eq } from "drizzle-orm";
import { apps } from "@/db/schema";
import { getDyadAppPath } from "@/paths/paths";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { factoryContracts } from "../types/factory";
import { createTypedHandler } from "./base";
import { getHandlerContext } from "./handler_context";
import { appOperationCoordinator } from "../services/app_operation_coordinator";
import {
  getFactoryProject,
  mutateFactoryProject,
  readFactoryStore,
  writeFactoryStore,
} from "../services/factory/store";
import { applyFactoryAction } from "../services/factory/project";
import { runFactoryScan } from "../services/factory/scan";
import { factoryReleaseBlockers } from "../services/factory/guards";
import { writeFactoryArtifact } from "../services/factory/files";
import { factoryArtifacts } from "../../../packages/samba-factory/src/artifacts";
import type { FactoryProject } from "../../../packages/samba-factory/src/schema";

async function appRow(appId: number) {
  const app = await getHandlerContext().db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });
  if (!app)
    throw new DyadError("Aplicativo não encontrado.", DyadErrorKind.NotFound);
  return app;
}

async function withIdleFactoryApp<T>(
  appId: number,
  work: () => Promise<T>,
): Promise<T> {
  const { blockNewStreamsForApp, hasActiveStreamsForApp } =
    await import("./chat_stream_handlers");
  const release = blockNewStreamsForApp(appId);
  try {
    if (await hasActiveStreamsForApp(appId))
      throw new DyadError(
        "Aguarde o agente terminar antes de alterar as decisões da Fábrica.",
        DyadErrorKind.Precondition,
      );
    return await work();
  } finally {
    release();
  }
}

export function registerFactoryHandlers() {
  createTypedHandler(factoryContracts.list, async () => {
    const ids = new Set(
      getHandlerContext()
        .db.select({ id: apps.id })
        .from(apps)
        .all()
        .map((app) => app.id),
    );
    return (await readFactoryStore()).projects.filter((project) =>
      ids.has(project.appId),
    );
  });
  createTypedHandler(factoryContracts.enroll, async (_, { appId, client }) =>
    appOperationCoordinator.run(
      { appId, operation: "factory-enroll", resources: ["metadata"] },
      () =>
        withIdleFactoryApp(appId, async () => {
          const app = await appRow(appId);
          const project: FactoryProject = {
            appId,
            client,
            name: app.name,
            brief: "",
            knowledge: "",
            revision: 0,
            mode: "ask",
            plan: null,
            approval: null,
            brand: null,
            brandApproval: null,
            scan: null,
            changes: [],
            audit: [
              {
                at: new Date().toISOString(),
                actor: "Operador local",
                action: "enroll",
                revision: 0,
              },
            ],
          };
          await writeFactoryStore((store) => {
            if (store.projects.some((entry) => entry.appId === appId))
              throw new DyadError(
                "Aplicativo já cadastrado. Não é possível trocar o cliente e misturar históricos.",
                DyadErrorKind.Conflict,
              );
            return { ...store, projects: [...store.projects, project] };
          });
          return project;
        }),
    ),
  );
  createTypedHandler(
    factoryContracts.update,
    async (_, { appId, revision, action }) =>
      appOperationCoordinator.run(
        { appId, operation: "factory-update", resources: ["metadata"] },
        () =>
          withIdleFactoryApp(appId, async () => {
            await appRow(appId);
            return mutateFactoryProject(appId, revision, (project) =>
              applyFactoryAction(project, action, new Date().toISOString()),
            );
          }),
      ),
  );
  createTypedHandler(factoryContracts.scan, async (_, { appId, revision }) =>
    appOperationCoordinator.run(
      {
        appId,
        operation: "factory-scan",
        resources: [
          "metadata",
          { resource: "app-path", mode: "read" },
          "repository",
          "test-files",
        ],
        refuseWhenRecording: "executar o scan da Fábrica",
      },
      async () => {
        const app = await appRow(appId);
        const project = await getFactoryProject(appId);
        if (!project || project.revision !== revision)
          throw new DyadError(
            "Atualize o projeto antes de verificar.",
            DyadErrorKind.Conflict,
          );
        const scan = await runFactoryScan(getDyadAppPath(app.path));
        return mutateFactoryProject(appId, revision, (current) => ({
          ...current,
          scan,
          revision: current.revision + 1,
          audit: [
            ...current.audit,
            {
              at: scan.at,
              actor: "Scanner local",
              action: "release-scan",
              revision: current.revision + 1,
            },
          ],
        }));
      },
    ),
  );
  createTypedHandler(factoryContracts.gate, async (_, { appId }) =>
    factoryReleaseBlockers(appId),
  );
  createTypedHandler(factoryContracts.export, async (_, { appId, revision }) =>
    appOperationCoordinator.run(
      {
        appId,
        operation: "factory-export",
        resources: [
          "metadata",
          { resource: "app-path", mode: "read" },
          "repository",
        ],
        refuseWhenRecording: "exportar o handoff",
      },
      async () => {
        const app = await appRow(appId);
        const project = await getFactoryProject(appId);
        if (!project || project.revision !== revision)
          throw new DyadError(
            "Atualize o projeto antes de exportar.",
            DyadErrorKind.Conflict,
          );
        const artifacts = factoryArtifacts(project);
        for (const [relative, content] of Object.entries(artifacts))
          await writeFactoryArtifact(
            getDyadAppPath(app.path),
            relative,
            content,
          );
        return Object.keys(artifacts);
      },
    ),
  );
}
