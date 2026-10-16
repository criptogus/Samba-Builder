import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { getSambaAppPath } from "@/paths/paths";
import { createTypedHandler } from "./base";
import { extensionContracts } from "../types/extensions";
import { discoverExtensions } from "../services/extensions/discovery";
import { resolveExtensionRoots } from "../services/extensions/roots";
import { installBundledGameSkill } from "../services/game_studio/bundled_skills";
import { importMachineSkill } from "../services/game_studio/machine_skills";
import { readGameStudioSnapshot } from "../services/game_studio/snapshot";

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

  createTypedHandler(extensionContracts.gameStudio, async () =>
    readGameStudioSnapshot(),
  );

  createTypedHandler(
    extensionContracts.importMachineSkill,
    async (_event, { discoveryId }) => importMachineSkill({ discoveryId }),
  );

  createTypedHandler(
    extensionContracts.installGameSkill,
    async (_event, { slug }) => installBundledGameSkill(slug),
  );
}
