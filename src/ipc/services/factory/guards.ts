import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSambaAppPath } from "@/paths/paths";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import type { ChatMode } from "@/lib/schemas";
import {
  buildBlockers,
  releaseBlockers,
  engineMode,
} from "../../../../packages/samba-factory/src/policy";
import { factoryPrompt } from "../../../../packages/samba-factory/src/skills";
import { getFactoryProject } from "./store";
import { readFactorySources } from "./files";

export async function assertFactoryChat(
  appId: number,
  mode: ChatMode,
  referencedAppIds: number[] = [],
): Promise<void> {
  const project = await getFactoryProject(appId);
  if (!project) {
    for (const id of referencedAppIds) {
      if (await getFactoryProject(id))
        throw new SambaError(
          "Contexto de cliente da Fábrica não pode ser incluído em outro aplicativo.",
          SambaErrorKind.Precondition,
        );
    }
    return;
  }
  if (referencedAppIds.some((id) => id !== appId))
    throw new SambaError(
      "Projetos da Fábrica não podem incluir contexto de outros aplicativos.",
      SambaErrorKind.Precondition,
    );
  if (mode === "ask" || mode === "plan") return;
  const reasons = buildBlockers(project);
  if (engineMode(project.mode) === "ask")
    reasons.push("Selecione Build ou Fix na Fábrica para modificar o projeto.");
  if (reasons.length)
    throw new SambaError(reasons.join("\n"), SambaErrorKind.Precondition);
}
export async function getFactoryPrompt(appId: number) {
  const project = await getFactoryProject(appId);
  return project ? factoryPrompt(project) : "";
}
export async function factoryReleaseBlockers(appId: number): Promise<string[]> {
  const project = await getFactoryProject(appId);
  if (!project) return [];
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app)
    throw new SambaError("Aplicativo não encontrado.", SambaErrorKind.NotFound);
  const source = await readFactorySources(getSambaAppPath(app.path));
  const reasons = releaseBlockers(project, source.digest);
  const { isGitStatusClean } = await import("../../utils/git_utils");
  if (!(await isGitStatusClean({ path: getSambaAppPath(app.path) }))) {
    reasons.push(
      "Faça commit das alterações antes de publicar: o código verificado precisa corresponder ao Git.",
    );
  }
  return reasons;
}
export async function assertFactoryRelease(appId: number): Promise<void> {
  const reasons = await factoryReleaseBlockers(appId);
  if (reasons.length)
    throw new SambaError(
      `Security Gate bloqueou a publicação:\n${reasons.join("\n")}`,
      SambaErrorKind.Precondition,
    );
}

// Covers native Git pushes, including agent-triggered pushes, before remote hooks can publish.
export async function assertFactoryReleaseForPath(
  appPath: string,
  branch: string,
): Promise<void> {
  const { projects } = await import("./store").then((store) =>
    store.readFactoryStore(),
  );
  if (projects.length === 0) return;
  const candidates = db.select().from(apps).all();
  const { resolve } = await import("node:path");
  const app = candidates.find(
    (entry) => resolve(getSambaAppPath(entry.path)) === resolve(appPath),
  );
  if (app && projects.some((project) => project.appId === app.id)) {
    await assertFactoryRelease(app.id);
    const { gitCurrentBranch } = await import("../../utils/git_utils");
    if ((await gitCurrentBranch({ path: appPath })) !== branch)
      throw new SambaError(
        "Publique a branch atual verificada pela Fábrica.",
        SambaErrorKind.Precondition,
      );
  }
}
