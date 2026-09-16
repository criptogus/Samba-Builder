import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { getSambaAppPath } from "@/paths/paths";
import { createTypedHandler } from "./base";
import { extensionContracts } from "../types/extensions";
import { discoverExtensions } from "../services/extensions/discovery";
import { resolveExtensionRoots } from "../services/extensions/roots";

export function registerExtensionHandlers(): void {
  createTypedHandler(extensionContracts.list, async (_event, { appId }) => {
    let projectDirectory: string | null = null;
    if (appId !== undefined) {
      const project = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });
      if (!project) {
        throw new SambaError(
          "Projeto não encontrado.",
          SambaErrorKind.NotFound,
        );
      }
      projectDirectory = getSambaAppPath(project.path);
    }
    return discoverExtensions(resolveExtensionRoots(projectDirectory));
  });
}
