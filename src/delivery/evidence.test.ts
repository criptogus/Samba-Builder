import { describe, expect, it } from "vitest";
import {
  EvidenceItemSchema,
  evidenceBlockers,
  evidenceItemFor,
  requiredGates,
  upsertEvidenceItem,
  type EvidenceItem,
} from "./evidence";

const passed = (gate: EvidenceItem["gate"]): EvidenceItem =>
  EvidenceItemSchema.parse({
    gate,
    status: "passed",
    summary: `Verificação de ${gate} executada com sucesso`,
    command: "npm test",
    by: "agent",
  });

describe("requiredGates — evidência proporcional ao risco", () => {
  it("perfil public exige o mínimo (tests, security, visual)", () => {
    expect(requiredGates("public")).toEqual(["tests", "security", "visual"]);
  });
  it("perfil private soma dependências e acessibilidade", () => {
    const gates = requiredGates("private");
    expect(gates).toContain("tests");
    expect(gates).toContain("security");
    expect(gates).toContain("dependencies");
    expect(gates).toContain("accessibility");
    expect(gates).toContain("visual");
    expect(gates).not.toContain("authorization");
  });
  it("perfil critical exige o conjunto completo (inclui aprovação, arquitetura, performance)", () => {
    const gates = requiredGates("critical");
    for (const g of [
      "tests",
      "security",
      "dependencies",
      "accessibility",
      "visual",
      "authorization",
      "architecture",
      "performance",
    ])
      expect(gates).toContain(g);
  });
  it("sem perfil usa o mínimo (nunca bloqueia sem política)", () => {
    expect(requiredGates(undefined)).toEqual(["tests", "security", "visual"]);
  });
});

describe("evidenceBlockers", () => {
  it("não bloqueia quando todos os gates do perfil passaram", () => {
    const items = requiredGates("private").map((g) => passed(g));
    expect(evidenceBlockers(items, "private")).toEqual([]);
  });
  it("lista cada gate obrigatório sem evidência", () => {
    const blockers = evidenceBlockers([], "critical");
    expect(blockers).toHaveLength(8);
    expect(blockers[0]).toContain('Gate "tests" sem evidência');
  });
  it("bloqueia gate registrado como failed ou blocked mesmo existindo item antigo passed", () => {
    const items = [
      passed("tests"),
      { ...passed("security"), status: "failed" as const },
    ];
    const blockers = evidenceBlockers(items, "public");
    expect(
      blockers.some((b) => b.includes("security") && b.includes("failed")),
    ).toBe(true);
    expect(blockers.some((b) => b.includes("tests"))).toBe(false);
  });
  it("bloqueia gate marcado not_run", () => {
    const items = [{ ...passed("visual"), status: "not_run" as const }];
    const blockers = evidenceBlockers(items, "public");
    expect(
      blockers.some((b) => b.includes("visual") && b.includes("não executado")),
    ).toBe(true);
  });
  it("sem perfil exige o conjunto mínimo (fallback público)", () => {
    expect(evidenceBlockers([], undefined)).toHaveLength(3);
  });
});

describe("upsertEvidenceItem — um item por gate", () => {
  it("adiciona item novo e substitui o do mesmo gate", () => {
    let items = upsertEvidenceItem([], passed("tests"));
    expect(items).toHaveLength(1);
    items = upsertEvidenceItem(items, {
      ...passed("tests"),
      summary: "Reexecutado após correção",
    });
    expect(items).toHaveLength(1);
    expect(evidenceItemFor(items, "tests")?.summary).toBe(
      "Reexecutado após correção",
    );
    items = upsertEvidenceItem(items, passed("visual"));
    expect(items).toHaveLength(2);
  });
});

describe("EvidenceItemSchema", () => {
  it("aceita item completo com artefatos e execução vinculada", () => {
    const item = EvidenceItemSchema.parse({
      gate: "tests",
      status: "passed",
      summary: "23 testes passaram",
      command: "npm run test:unit",
      version: "node 22",
      artifacts: ["screenshots/desktop.png"],
      executionId: "2d108be3-0000-4000-8000-000000000001",
      commit: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      by: "agent",
      executedAt: "2026-09-08T19:00:00.000Z",
    });
    expect(item.status).toBe("passed");
  });
  it("rejeita gate desconhecido", () => {
    expect(() =>
      EvidenceItemSchema.parse({
        gate: "magic",
        status: "passed",
        summary: "x",
        by: "agent",
      }),
    ).toThrow();
  });
});
