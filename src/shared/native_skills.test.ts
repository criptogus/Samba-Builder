import { describe, expect, it, vi } from "vitest";
import { nativeSkills } from "./native_skills";
import {
  loadNativeSkill,
  MAX_NATIVE_SKILL_CHARS,
  MAX_NATIVE_CONTEXT_CHARS,
  nativeSkillContext,
  parseNativeSkillRequest,
} from "./load_native_skill";

describe("native skill activation", () => {
  it.each([
    "Explique /samba-debug",
    "`/samba-debug`",
    "```\n/samba-debug\n```",
    "> /samba-debug",
    "@prompt:1",
    "https://example.com/samba-debug",
    "/custom /samba-debug",
  ])("does not activate implicit references: %s", (prompt) => {
    expect(parseNativeSkillRequest(prompt)).toEqual({ prompt, slugs: [] });
  });
  it("consumes explicit leading commands, deduplicates, and preserves the task", () => {
    expect(
      parseNativeSkillRequest(
        " /samba-debug\r\n/samba-tdd /samba-debug Corrija o login",
      ),
    ).toEqual({
      slugs: ["samba-debug", "samba-tdd"],
      prompt: "Corrija o login",
    });
  });
  it("preserves unknown custom commands", () => {
    expect(parseNativeSkillRequest("/samba-personal task").slugs).toEqual([]);
  });
  it("rejects excessive context rather than silently truncating", () => {
    expect(() =>
      parseNativeSkillRequest(
        "/samba-debug /samba-tdd /samba-design /samba-spec task",
      ),
    ).toThrow("no máximo 3");
  });
  it("does not load anything without explicit selection", async () => {
    const load = vi.fn();
    expect(await nativeSkillContext([], load)).toBe("");
    expect(load).not.toHaveBeenCalled();
  });
  it("loads only selected bodies once and retains the mode guard", async () => {
    const load = vi
      .fn()
      .mockResolvedValue("Guidance including /samba-security as data");
    const context = await nativeSkillContext(
      ["samba-debug", "samba-debug"],
      load,
    );
    expect(load.mock.calls).toEqual([["samba-debug"]]);
    expect(context).toContain("Em Ask/Plan, não realize alterações");
    expect(context).toContain("/samba-security as data");
  });
  it("fails closed on invalid or oversized resources", async () => {
    await expect(loadNativeSkill("../../outside")).rejects.toThrow(
      "desconhecida",
    );
    await expect(
      nativeSkillContext(["samba-debug"], async () =>
        "x".repeat(MAX_NATIVE_SKILL_CHARS + 1),
      ),
    ).rejects.toThrow("inválida");
    await expect(
      nativeSkillContext(["samba-debug"], async () => ""),
    ).rejects.toThrow("inválida");
  });
  it("ships a bounded, complete catalog with provenance", async () => {
    expect(new Set(nativeSkills.map((skill) => skill.slug)).size).toBe(
      nativeSkills.length,
    );
    for (const skill of nativeSkills) {
      expect(skill.sources.length).toBeGreaterThan(0);
      const body = await loadNativeSkill(skill.slug);
      expect(body.length).toBeGreaterThan(500);
      expect(body.length).toBeLessThanOrEqual(MAX_NATIVE_SKILL_CHARS);
    }
  });
});

it("loads the portable PM Samba skill through the real command resolver", async () => {
  const request = parseNativeSkillRequest(
    "/samba-pm Quero reduzir retrabalho em uma clínica",
  );
  expect(request).toEqual({
    slugs: ["samba-pm"],
    prompt: "Quero reduzir retrabalho em uma clínica",
  });
  const body = await loadNativeSkill(request.slugs[0]);
  expect(body.startsWith("---\nname: samba-pm")).toBe(true);
  const context = await nativeSkillContext(request.slugs);
  expect(context).toContain(body);
  expect(context).toContain("Em Ask/Plan, não realize alterações");
  expect(parseNativeSkillRequest("Explique /samba-pm").slugs).toEqual([]);
});

it("rejects combined instruction bloat without silently truncating any skill", async () => {
  const body = "x".repeat(Math.floor(MAX_NATIVE_CONTEXT_CHARS / 3));
  await expect(
    nativeSkillContext(
      ["samba-design", "samba-security", "samba-performance"],
      async () => body,
    ),
  ).rejects.toThrow("limite de contexto");
});
it("fits the actual PM, design and security workflow within the aggregate budget", async () => {
  const context = await nativeSkillContext([
    "samba-pm",
    "samba-design",
    "samba-security",
  ]);
  expect(context).toContain("# PM Samba");
  expect(context).toContain("# Design de interfaces");
  expect(context).toContain("# Segurança de aplicações");
});

it("resolves the motion workflow without exceeding the shared budget", async () => {
  const request = parseNativeSkillRequest(
    "/samba-design /samba-motion /samba-security Crie um portal",
  );
  const context = await nativeSkillContext(request.slugs);
  expect(context).toContain("prefers-reduced-motion");
  expect(context).toContain("autorização");
  expect(request.prompt).toBe("Crie um portal");
});
