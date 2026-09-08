import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getDyadAppPath } from "@/paths/paths";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { awsContracts } from "../types/aws";
import { createTypedHandler } from "./base";
import { appOperationCoordinator } from "../services/app_operation_coordinator";
import {
  awsIdentity,
  deployAws,
  readAwsState,
  refreshAws,
} from "../services/cloud/aws_deploy";
import { prepareAwsSource } from "../services/cloud/aws_source";
import { cloudCommand } from "../services/cloud/aws_cli";
async function rootFor(appId: number) {
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app)
    throw new DyadError("Projeto não encontrado.", DyadErrorKind.NotFound);
  return getDyadAppPath(app.path);
}
export function registerAwsHandlers() {
  createTypedHandler(awsContracts.status, async (_, { appId }) => {
    await rootFor(appId);
    return readAwsState(appId);
  });
  createTypedHandler(awsContracts.review, async (_, { appId, config }) =>
    appOperationCoordinator.run(
      {
        appId,
        operation: "aws-review",
        resources: ["app-path", "repository", "provider"],
      },
      async () => {
        const root = await rootFor(appId);
        const identity = await awsIdentity(config, root);
        await cloudCommand(
          "docker",
          ["info", "--format", "{{.ServerVersion}}"],
          root,
        );
        return { ...identity, ...(await prepareAwsSource(root)) };
      },
    ),
  );
  createTypedHandler(
    awsContracts.deploy,
    async (_, { appId, config, accountId, sourceDigest }) =>
      appOperationCoordinator.run(
        {
          appId,
          operation: "aws-deploy",
          resources: ["app-path", "repository", "provider"],
        },
        async () =>
          deployAws(
            appId,
            config,
            await rootFor(appId),
            accountId,
            sourceDigest,
          ),
      ),
  );
  createTypedHandler(awsContracts.refresh, async (_, { appId }) =>
    appOperationCoordinator.run(
      { appId, operation: "aws-refresh", resources: ["app-path", "provider"] },
      async () => refreshAws(appId, await rootFor(appId)),
    ),
  );
}
