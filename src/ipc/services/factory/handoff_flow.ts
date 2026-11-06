import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getSambaAppPath } from "@/paths/paths";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { factoryArtifacts } from "../../../../packages/samba-factory/src/artifacts";
import { handoffPullRequest } from "../../../../packages/samba-factory/src/handoff";
import { readSettings } from "@/main/settings";
import { execGit, gitCommit, gitPush } from "../../utils/git_utils";
import { upsertPullRequest } from "../../handlers/github_handlers";
import { assertFactoryRelease } from "./guards";
import { getFactoryProject } from "./store";
import { writeFactoryArtifact } from "./files";

export async function generateFactoryHandoff(appId: number, revision: number) {
  const project = await getFactoryProject(appId);
  if (!project || project.revision !== revision) {
    throw new SambaError(
      "Atualize o projeto antes de gerar o handoff.",
      SambaErrorKind.Conflict,
    );
  }
  await assertFactoryRelease(appId);
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) {
    throw new SambaError("Aplicativo não encontrado.", SambaErrorKind.NotFound);
  }
  const root = getSambaAppPath(app.path);
  const artifacts = factoryArtifacts(project);
  const files = Object.keys(artifacts);
  for (const [relative, content] of Object.entries(artifacts)) {
    await writeFactoryArtifact(root, relative, content);
  }
  const status = await execGit(["status", "--porcelain", "--", ...files], root);
  if (status.exitCode !== 0) {
    throw new SambaError(
      "Não foi possível conferir os artefatos no Git.",
      SambaErrorKind.Conflict,
    );
  }
  if (status.stdout.trim()) {
    await execGit(["add", "--", ...files], root);
    await gitCommit({
      path: root,
      message: `docs: handoff de ${project.name}`,
      paths: files,
    });
  }
  const token = readSettings().githubAccessToken?.value;
  if (!token) {
    throw new SambaError(
      "Conecte o GitHub antes de abrir o pull request de handoff.",
      SambaErrorKind.Auth,
    );
  }
  const { gitCurrentBranch } = await import("../../utils/git_utils");
  const branch = (await gitCurrentBranch({ path: root })) || "main";
  await gitPush({ path: root, branch, accessToken: token });
  const document = handoffPullRequest(project);
  const pullRequest = await upsertPullRequest({
    appId,
    title: document.title,
    body: document.body,
  });
  return {
    url: pullRequest.url,
    number: pullRequest.number,
    updated: pullRequest.updated,
    files,
  };
}
