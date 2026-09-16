import path from "node:path";
import { getUserDataPath } from "@/paths/paths";
import type { ExtensionRoot } from "./discovery";

/** Pasta de extensões dentro do projeto e dentro da área de dados do usuário. */
export const PROJECT_EXTENSIONS_DIRECTORY = ".samba";
export const USER_EXTENSIONS_DIRECTORY = "extensions";

/**
 * Raízes de descoberta, na ordem em que a precedência é resolvida: o escopo do
 * usuário vem primeiro e o do projeto depois, para que uma extensão de projeto
 * substitua a do usuário **registrando um aviso** em vez de sumir em silêncio.
 *
 * Vive no serviço (e não no handler) porque o agente local também precisa
 * resolver os mesmos caminhos ao carregar uma skill.
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
