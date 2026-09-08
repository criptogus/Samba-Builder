import { createVercelClient } from "@/ipc/utils/vercel_utils";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
export async function submitVercelDeployment(
  token: string,
  project: {
    id: string;
    name: string;
    teamId: string | null;
    org: string;
    repo: string;
    branch: string;
    sha?: string;
  },
  target: "preview" | "production",
) {
  try {
    const result = await createVercelClient(token).deployments.createDeployment(
      {
        teamId: project.teamId ?? undefined,
        requestBody: {
          name: project.name,
          project: project.id,
          ...(target === "production" ? { target: "production" as const } : {}),
          gitSource: {
            type: "github",
            org: project.org,
            repo: project.repo,
            ref: project.branch,
            ...(project.sha ? { sha: project.sha } : {}),
          },
        },
      },
    );
    if (!result.url || !result.id)
      throw new Error("Invalid deployment response");
    const url = new URL(`https://${result.url}`);
    if (
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.endsWith(".vercel.app")
    )
      throw new Error("Invalid deployment URL");
    return {
      id: result.id,
      url: url.href,
      state: result.readyState ?? "QUEUED",
    };
  } catch {
    throw new SambaError(
      "Não foi possível solicitar a publicação. Confira o token, a equipe e a integração GitHub no painel Vercel antes de repetir.",
      SambaErrorKind.External,
    );
  }
}
