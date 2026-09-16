import { describe, expect, it } from "vitest";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import {
  PullRequestSummarySchema,
  MergePullRequestResultSchema,
} from "@/ipc/types/github";
import {
  assertDistinctBranches,
  buildCreatePullRequestBody,
  isExistingPullRequestError,
  isMergeBlockedStatus,
  normalizeMergeResult,
  normalizePullRequest,
  normalizePullRequestList,
} from "./pull_request";

const githubPayload = {
  number: 42,
  html_url: "https://github.com/acme/app/pull/42",
  title: "Revisa o login",
  state: "open",
  draft: false,
  head: { ref: "feature/login" },
  base: { ref: "main" },
};

describe("assertDistinctBranches", () => {
  it("recusa abrir PR da branch para ela mesma", () => {
    expect(() =>
      assertDistinctBranches({ head: "main", base: "main" }),
    ).toThrow(SambaError);
  });

  it("aceita branches diferentes", () => {
    expect(() =>
      assertDistinctBranches({ head: "feature/x", base: "main" }),
    ).not.toThrow();
  });
});

describe("buildCreatePullRequestBody", () => {
  it("monta o corpo com head, base e título aparado", () => {
    expect(
      buildCreatePullRequestBody({
        title: "  Revisa o login  ",
        body: "Corpo",
        head: "feature/login",
        base: "main",
      }),
    ).toEqual({
      title: "Revisa o login",
      head: "feature/login",
      base: "main",
      body: "Corpo",
    });
  });

  it("omite corpo vazio e inclui draft só quando pedido", () => {
    expect(
      buildCreatePullRequestBody({
        title: "T",
        body: "   ",
        head: "feature/x",
        base: "main",
        draft: true,
      }),
    ).toEqual({
      title: "T",
      head: "feature/x",
      base: "main",
      draft: true,
    });
  });

  it("recusa título vazio", () => {
    expect(() =>
      buildCreatePullRequestBody({
        title: "   ",
        head: "feature/x",
        base: "main",
      }),
    ).toThrow(/needs a title/);
  });
});

describe("normalizePullRequest", () => {
  it("normaliza a resposta da API e satisfaz o contrato do IPC", () => {
    const summary = normalizePullRequest(githubPayload);

    expect(summary).toEqual({
      number: 42,
      url: "https://github.com/acme/app/pull/42",
      title: "Revisa o login",
      state: "open",
      head: "feature/login",
      base: "main",
      draft: false,
    });
    // O contrato é a fonte de verdade da UI: o serviço não pode divergir dele.
    expect(PullRequestSummarySchema.parse(summary)).toEqual(summary);
  });

  it("recusa resposta sem número, URL ou branches", () => {
    expect(() => normalizePullRequest({ number: 1 })).toThrow(SambaError);
    expect(() =>
      normalizePullRequest({ ...githubPayload, number: "42" }),
    ).toThrow(/without a number/);
    try {
      normalizePullRequest({ number: 1 });
    } catch (error) {
      expect((error as SambaError).kind).toBe(SambaErrorKind.External);
    }
  });

  it("usa defaults seguros para campos opcionais", () => {
    const summary = normalizePullRequest({
      number: 7,
      html_url: "https://example.com/pr/7",
      head: { ref: "a" },
      base: { ref: "b" },
    });

    expect(summary).toMatchObject({ title: "", state: "open", draft: false });
  });
});

describe("normalizePullRequestList", () => {
  it("devolve lista vazia quando não há PR aberto", () => {
    expect(normalizePullRequestList([])).toEqual([]);
  });

  it("recusa payload que não é lista", () => {
    expect(() => normalizePullRequestList({ message: "Not Found" })).toThrow(
      /unexpected pull request list/,
    );
  });
});

describe("classificação de erros do GitHub", () => {
  it("reconhece PR já existente (422)", () => {
    expect(
      isExistingPullRequestError(
        422,
        "Validation Failed: A pull request already exists for acme:feature/x.",
      ),
    ).toBe(true);
    expect(isExistingPullRequestError(422, "Validation Failed: bad base")).toBe(
      false,
    );
    expect(isExistingPullRequestError(500, "already exists")).toBe(false);
  });

  it("reconhece merge bloqueado (405 e 409)", () => {
    expect(isMergeBlockedStatus(405)).toBe(true);
    expect(isMergeBlockedStatus(409)).toBe(true);
    expect(isMergeBlockedStatus(200)).toBe(false);
  });

  it("normaliza o resultado do merge e satisfaz o contrato", () => {
    const result = normalizeMergeResult({
      merged: true,
      message: "Pull Request successfully merged",
      sha: "abc123",
    });

    expect(result).toEqual({
      merged: true,
      message: "Pull Request successfully merged",
      sha: "abc123",
    });
    expect(MergePullRequestResultSchema.parse(result)).toEqual(result);
  });

  it("não afirma merge quando o GitHub não confirma", () => {
    expect(normalizeMergeResult(null)).toEqual({
      merged: false,
      message: "",
      sha: null,
    });
  });
});
