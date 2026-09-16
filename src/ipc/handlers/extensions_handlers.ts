import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { getSambaAppPath, getUserDataPath } from "@/paths/paths";
import { createTypedHandler } from "./base";
import { extensionContracts } from "../types/extensions";
import {
  discoverExtensions,
  type ExtensionRoot,
} from "../services/extensions/discovery";

/** Pasta de extensões dentro do projeto e dentro da pasta de dados do usuário. */
export const PROJECT_EXTENSIONS_DIRECTORY = ".samba";
export const USER_EXTENSIONS_DIRECTORY = "extensions";

/**
 * Monta as raízes de descoberta. O escopo do usuário vem primeiro para que a
 * precedência do projeto (que substitui a versão do usuário) seja registrada
 * como aviso em vez de perder a extensão silenciosamente.
 */
export function resolveExtensionRoots(
  projectDirectory: string | null,
): ExtensionRoot[] {
  const roots: ExtensionRoot[] = [
    {
      scope: "user",
      directory: path.join(getUserDataPath(), USER_EXTENSIONS_DIRECTORY),
    },
  ];
  if (projectDirectory) {
    roots.push({
      scope: "project",
      directory: path.join(projectDirectory, PROJECT_EXTENSIONS_DIRECTORY),
    });
  }
  return roots;
}

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
