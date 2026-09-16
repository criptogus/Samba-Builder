import { SambaError, SambaErrorKind } from "@/errors/samba_error";

/**
 * Regras de pull request do GitHub (REQ-31).
 *
 * Tudo aqui é puro e sem rede: montar o corpo da requisição, normalizar a
 * resposta (que chega como dado externo não confiável) e classificar os erros
 * que o GitHub devolve. O handler fica só com o I/O.
 *
 * Mensagens em inglês para acompanhar o resto de `github_handlers.ts`.
 */

export type PullRequestMergeMethod = "merge" | "squash" | "rebase";

export interface PullRequestSummary {
  number: number;
  url: string;
  title: string;
  state: string;
  head: string;
  base: string;
  draft: boolean;
}

export interface MergePullRequestResult {
  merged: boolean;
  message: string;
  sha: string | null;
}

export function assertDistinctBranches(params: {
  head: string;
  base: string;
}): void {
  if (params.head === params.base) {
    throw new SambaError(
      `The current branch (${params.head}) is also the destination. Create a branch for the work before opening a pull request.`,
      SambaErrorKind.Precondition,
    );
  }
}

export function buildCreatePullRequestBody(params: {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}): Record<string, unknown> {
  const title = params.title.trim();
  if (!title) {
    throw new SambaError(
      "A pull request needs a title.",
      SambaErrorKind.Validation,
    );
  }
  assertDistinctBranches({ head: params.head, base: params.base });
  return {
    title,
    head: params.head,
    base: params.base,
    ...(params.body?.trim() ? { body: params.body } : {}),
    ...(params.draft ? { draft: true } : {}),
  };
}

/** A resposta vem da API: nada entra sem validação de forma. */
export function normalizePullRequest(payload: unknown): PullRequestSummary {
  if (typeof payload !== "object" || payload === null) {
    throw new SambaError(
      "GitHub returned an unexpected pull request response.",
      SambaErrorKind.External,
    );
  }
  const value = payload as Record<string, unknown>;
  const number = value.number;
  const htmlUrl = value.html_url;
  const head = value.head as Record<string, unknown> | undefined;
  const base = value.base as Record<string, unknown> | undefined;

  if (
    typeof number !== "number" ||
    typeof htmlUrl !== "string" ||
    typeof head?.ref !== "string" ||
    typeof base?.ref !== "string"
  ) {
    throw new SambaError(
      "GitHub returned a pull request without a number, URL or branch names.",
      SambaErrorKind.External,
    );
  }

  return {
    number,
    url: htmlUrl,
    title: typeof value.title === "string" ? value.title : "",
    state: typeof value.state === "string" ? value.state : "open",
    head: head.ref,
    base: base.ref,
    draft: value.draft === true,
  };
}

export function normalizePullRequestList(
  payload: unknown,
): PullRequestSummary[] {
  if (!Array.isArray(payload)) {
    throw new SambaError(
      "GitHub returned an unexpected pull request list.",
      SambaErrorKind.External,
    );
  }
  return payload.map(normalizePullRequest);
}

/** 405 = não mesclável agora (conflito, check pendente); 409 = a branch mudou. */
export function isMergeBlockedStatus(status: number): boolean {
  return status === 405 || status === 409;
}

/** 422 com essa mensagem significa que já existe PR para o par de branches. */
export function isExistingPullRequestError(
  status: number,
  message: string,
): boolean {
  return status === 422 && /already exists/i.test(message);
}

export function normalizeMergeResult(payload: unknown): MergePullRequestResult {
  const value =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return {
    merged: value.merged === true,
    message: typeof value.message === "string" ? value.message : "",
    sha: typeof value.sha === "string" ? value.sha : null,
  };
}
