import { describe, expect, it } from "vitest";
import { repoAuditActions } from "@/lib/repo_audit_actions";
import { nativeSkills } from "@/shared/native_skills";
import { parseNativeSkillRequest } from "@/shared/load_native_skill";

describe("repo audit actions — comandos iniciais com skills corretos", () => {
  it("cada ação tem label, descrição e prompt não vazio", () => {
    for (const action of repoAuditActions) {
      expect(action.id.length).toBeGreaterThan(0);
      expect(action.label.trim().length).toBeGreaterThan(2);
      expect(action.description.trim().length).toBeGreaterThan(10);
      expect(action.prompt.trim().length).toBeGreaterThan(20);
    }
  });

  it("todo /samba-* citado no prompt existe no catálogo de native skills", () => {
    const known = new Set(nativeSkills.map((s) => s.slug));
    for (const action of repoAuditActions) {
      const { slugs, prompt } = parseNativeSkillRequest(action.prompt);
      if (slugs.length === 0) {
        // Ação sem skill é válida (análise técnica ampla), mas não pode sobrar
        // um /samba-* não resolvido no corpo do prompt.
        expect(action.prompt).not.toMatch(/\/samba-/);
        continue;
      }
      for (const slug of slugs) {
        expect(
          known.has(slug),
          `${action.id} cita skill inexistente: ${slug}`,
        ).toBe(true);
      }
      expect(prompt.trim().length).toBeGreaterThan(10);
    }
  });

  it("cobre as auditorias principais pedidas (repo, técnica, arquitetura, UX/UI, cybersec)", () => {
    const ids = repoAuditActions.map((a) => a.id);
    for (const expected of [
      "repo-review",
      "technical-analysis",
      "architecture-analysis",
      "ux-ui-audit",
      "cybersec-audit",
    ]) {
      expect(ids).toContain(expected);
    }
    // UX/UI usa design + accessibility; cybersec usa security.
    const ux = repoAuditActions.find((a) => a.id === "ux-ui-audit")!;
    expect(parseNativeSkillRequest(ux.prompt).slugs).toEqual([
      "samba-design",
      "samba-accessibility",
    ]);
    const sec = repoAuditActions.find((a) => a.id === "cybersec-audit")!;
    expect(parseNativeSkillRequest(sec.prompt).slugs).toEqual([
      "samba-security",
    ]);
  });

  it("não repete ids", () => {
    const ids = repoAuditActions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
