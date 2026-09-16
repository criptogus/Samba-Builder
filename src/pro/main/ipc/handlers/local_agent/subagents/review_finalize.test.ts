import { describe, expect, it } from "vitest";
import { finalizeReview, parseExclusion } from "./review_finalize";
import type { ReviewTarget } from "./review_target";

function target(overrides: Partial<ReviewTarget> = {}): ReviewTarget {
  return {
    baseCommit: "base",
    targetCommit: "target",
    diff: "",
    files: [],
    exclusions: [],
    hash: "hash",
    ...overrides,
  };
}

function diffFor(path: string, addedLines: string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,1 +1,${addedLines.length + 1} @@`,
    " const keep = 1;",
    ...addedLines.map((line) => `+${line}`),
  ].join("\n");
}

function modelJson(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

describe("parseExclusion", () => {
  it("separa caminho e motivo", () => {
    expect(
      parseExclusion("src/big.ts (aggregate review limit reached)"),
    ).toEqual({
      path: "src/big.ts",
      reason: "aggregate review limit reached",
    });
  });

  it("não perde a exclusão quando não há motivo entre parênteses", () => {
    expect(parseExclusion("src/odd.ts")).toEqual({
      path: "src/odd.ts",
      reason: "excluído",
    });
  });
});

describe("finalizeReview", () => {
  it("entrega achados de regra mesmo quando o modelo devolve lixo", () => {
    const finalized = finalizeReview({
      target: target({
        diff: diffFor("src/App.tsx", [
          "dangerouslySetInnerHTML={{ __html: userInput }}",
        ]),
        files: ["src/App.tsx"],
      }),
      rawOutput: "isso não é JSON",
    });

    expect(finalized.status).toBe("partial");
    expect(finalized.parseError).toBeTruthy();
    expect(finalized.ruleFindings.map((finding) => finding.ruleId)).toEqual([
      "xss-unsafe-html",
    ]);
    expect(finalized.report).toContain("Achados de verificação automática");
    expect(finalized.report).toContain("regra xss-unsafe-html");
  });

  it("rebaixa para partial quando o revisor declara menos arquivos do que recebeu", () => {
    const finalized = finalizeReview({
      target: target({
        diff: "",
        files: ["src/a.ts", "src/b.ts"],
      }),
      rawOutput: modelJson({
        status: "no_findings",
        findings: [],
        reviewed_files: ["src/a.ts"],
        summary: "sem defeitos",
      }),
    });

    expect(finalized.status).toBe("partial");
    expect(finalized.coverage).toEqual({
      sent: 2,
      declaredReviewed: 1,
      uncovered: ["src/b.ts"],
      excluded: [],
    });
    expect(finalized.report).toContain("arquivos revisados: 1 de 2");
    expect(finalized.report).toContain(
      "enviados sem revisão declarada: src/b.ts",
    );
  });

  it("não inventa cobertura quando o revisor não declara nada", () => {
    const finalized = finalizeReview({
      target: target({ files: ["src/a.ts"] }),
      rawOutput: modelJson({
        status: "no_findings",
        findings: [],
        summary: "sem defeitos",
      }),
    });

    expect(finalized.status).toBe("no_findings");
    expect(finalized.coverage.declaredReviewed).toBeNull();
    expect(finalized.coverage.uncovered).toEqual([]);
    expect(finalized.report).toContain("não declarado pelo revisor");
  });

  it("reporta cada exclusão com o motivo", () => {
    const finalized = finalizeReview({
      target: target({
        files: ["src/a.ts"],
        exclusions: ["src/big.ts (binary)", "out/x.ts (outside app root)"],
      }),
      rawOutput: modelJson({
        status: "no_findings",
        findings: [],
        reviewed_files: ["src/a.ts"],
        summary: "sem defeitos",
      }),
    });

    expect(finalized.coverage.excluded).toEqual([
      { path: "src/big.ts", reason: "binary" },
      { path: "out/x.ts", reason: "outside app root" },
    ]);
    expect(finalized.report).toContain("- src/big.ts (binary)");
  });

  it("marca como não ancorado o achado cuja linha não está no diff", () => {
    const diff = diffFor("src/a.ts", [
      "const added1 = 1;",
      "const added2 = 2;",
    ]);
    const finalized = finalizeReview({
      target: target({ diff, files: ["src/a.ts"] }),
      rawOutput: modelJson({
        status: "findings",
        findings: [
          {
            severity: "high",
            path: "src/a.ts",
            line: 2,
            title: "Ancorado",
            impact: "x",
            remediation: "y",
          },
          {
            severity: "low",
            path: "src/a.ts",
            line: 999,
            title: "Desancorado",
            impact: "x",
            remediation: "y",
          },
        ],
        reviewed_files: ["src/a.ts"],
        summary: "dois achados",
      }),
    });

    expect(finalized.unanchoredFindings).toBe(1);
    expect(finalized.findings[0].unanchored).toBeUndefined();
    expect(finalized.findings[1].unanchored).toBe(true);
    expect(finalized.report).toContain(
      "achados sem posição confirmada no diff: 1",
    );
    expect(finalized.report).toContain(
      "2. [LOW] Desancorado (src/a.ts:999) — posição não confirmada no diff",
    );
    expect(finalized.report).not.toContain(
      "1. [HIGH] Ancorado (src/a.ts:2) — posição não confirmada",
    );
  });

  it("junta no relatório os achados do modelo e das regras", () => {
    const finalized = finalizeReview({
      target: target({
        diff: diffFor("src/cfg.ts", [
          'const password = "sup3rs3cretvalue123";',
        ]),
        files: ["src/cfg.ts"],
      }),
      rawOutput: modelJson({
        // O modelo não achou nada; a regra determinística achou. O relatório
        // precisa mostrar as duas camadas no mesmo lugar.
        status: "no_findings",
        findings: [],
        reviewed_files: ["src/cfg.ts"],
        summary: "resumo do revisor",
      }),
    });

    expect(finalized.report).toContain("resumo do revisor");
    expect(finalized.report).toContain("Achados de verificação automática");
    expect(finalized.report).toContain("regra secret-committed");
    expect(finalized.report).toContain("Cobertura:");
  });
});
