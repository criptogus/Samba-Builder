import { describe, expect, it } from "vitest";
import { specialistAgents } from "./specialist_agents";
import { nativeSkills } from "@/shared/native_skills";
import { parseNativeSkillRequest } from "@/shared/load_native_skill";

describe("specialist agents — skills transformados em agentes", () => {
  it("ids únicos e cada agente tem avatar, descrição e tarefas", () => {
    const ids = specialistAgents.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const agent of specialistAgents) {
      expect(agent.emoji.trim()).not.toBe("");
      expect(agent.tagline.trim().length).toBeGreaterThan(5);
      expect(agent.description.trim().length).toBeGreaterThan(20);
      expect(agent.tasks.length).toBeGreaterThanOrEqual(2);
      const taskIds = agent.tasks.map((t) => t.id);
      expect(new Set(taskIds).size).toBe(taskIds.length);
    }
  });

  it("todo skill declarado no agente existe no catálogo nativo", () => {
    const known = new Set(nativeSkills.map((s) => s.slug));
    for (const agent of specialistAgents) {
      for (const slug of agent.skills) {
        expect(
          known.has(slug),
          `${agent.id} cita skill inexistente: ${slug}`,
        ).toBe(true);
      }
    }
  });

  it("todo /samba-* citado nos prompts existe; prompts sem skill não citam /samba-*", () => {
    const known = new Set(nativeSkills.map((s) => s.slug));
    for (const agent of specialistAgents) {
      for (const task of agent.tasks) {
        const { slugs, prompt } = parseNativeSkillRequest(task.prompt);
        for (const slug of slugs)
          expect(
            known.has(slug),
            `${agent.id}/${task.id}: skill ${slug} não existe`,
          ).toBe(true);
        if (agent.skills.length === 0) {
          expect(slugs.length).toBe(0);
          expect(task.prompt).not.toMatch(/\/samba-/);
          expect(prompt.trim().length).toBeGreaterThan(30);
        } else {
          expect(task.prompt.trim().length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("agentes-chave do pedido existem (arquitetura, cybersec, UX/UI, mobile, devops)", () => {
    const ids = specialistAgents.map((a) => a.id);
    for (const expected of [
      "architect",
      "cybersec",
      "ux-ui",
      "mobile",
      "devops",
    ])
      expect(ids).toContain(expected);
  });

  it("agente de cybersec oferece auditoria completa; UX/UI oferece responsividade", () => {
    const sec = specialistAgents.find((a) => a.id === "cybersec")!;
    expect(sec.tasks.some((t) => t.label.includes("Auditoria completa"))).toBe(
      true,
    );
    const ux = specialistAgents.find((a) => a.id === "ux-ui")!;
    expect(ux.tasks.some((t) => t.label.includes("responsividade"))).toBe(true);
  });
});
