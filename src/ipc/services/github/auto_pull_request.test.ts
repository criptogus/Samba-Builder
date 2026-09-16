import { describe, expect, it } from "vitest";
import {
  autoPullRequestTitle,
  shouldOpenPullRequestAfterPush,
} from "./auto_pull_request";

describe("shouldOpenPullRequestAfterPush", () => {
  const base = {
    enabled: true,
    pushedBranch: "feature/login",
    defaultBranch: "main",
  };

  it("abre quando a opção está ligada e a branch é diferente da padrão", () => {
    expect(shouldOpenPullRequestAfterPush(base)).toBe(true);
  });

  it("não faz nada com a opção desligada (padrão de fábrica)", () => {
    expect(shouldOpenPullRequestAfterPush({ ...base, enabled: false })).toBe(
      false,
    );
  });

  it("nunca abre PR da branch padrão para ela mesma", () => {
    expect(
      shouldOpenPullRequestAfterPush({
        ...base,
        pushedBranch: "main",
        defaultBranch: "main",
      }),
    ).toBe(false);
  });

  it("não tenta quando falta branch enviada ou destino conhecido", () => {
    expect(
      shouldOpenPullRequestAfterPush({ ...base, pushedBranch: null }),
    ).toBe(false);
    expect(shouldOpenPullRequestAfterPush({ ...base, pushedBranch: "" })).toBe(
      false,
    );
    expect(
      shouldOpenPullRequestAfterPush({ ...base, defaultBranch: null }),
    ).toBe(false);
  });
});

describe("autoPullRequestTitle", () => {
  it("nomeia o PR pela branch, que é o que a pessoa reconhece", () => {
    expect(autoPullRequestTitle("feature/login")).toBe(
      "Samba Builder: feature/login",
    );
  });
});
