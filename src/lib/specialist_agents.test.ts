import { describe, expect, it } from "vitest";
import {
  composeSpecialistTaskPrompt,
  getSpecialistAgent,
  specialistAgents,
  specialistNextStepGuideline,
} from "./specialist_agents";
import { nativeSkills } from "@/shared/native_skills";
import { parseNativeSkillRequest } from "@/shared/load_native_skill";

describe("specialist agents — skills transformados em agentes", () => {
  it("ids únicos e cada agente tem avatar, persona, descrição e tarefas", () => {
    const ids = specialistAgents.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const personas = specialistAgents.map((a) => a.persona);
    expect(new Set(personas).size).toBe(personas.length);
    for (const agent of specialistAgents) {
      expect(agent.icon.trim()).not.toBe("");
      expect(agent.portrait.trim()).not.toBe("");
      expect(agent.persona.trim().length).toBeGreaterThan(1);
      expect(agent.tagline.trim().length).toBeGreaterThan(5);
      expect(agent.description.trim().length).toBeGreaterThan(20);
      expect(agent.recommendWhen.trim().length).toBeGreaterThan(10);
      expect(agent.skipWhen.trim().length).toBeGreaterThan(10);
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

  it("designer não recomenda em backend; cybersec e arquitetura podem", () => {
    const ux = getSpecialistAgent("ux-ui")!;
    expect(ux.skipWhen).toMatch(/backend/i);
    const sec = getSpecialistAgent("cybersec")!;
    expect(sec.recommendWhen).toMatch(/auth|endpoint|secret/i);
    const arch = getSpecialistAgent("architect")!;
    expect(arch.recommendWhen).toMatch(/module|structur|coupling/i);
  });

  it("composeSpecialistTaskPrompt ativa skills ou o papel do especialista", () => {
    const sec = getSpecialistAgent("cybersec")!;
    expect(composeSpecialistTaskPrompt(sec, "Audite o login")).toBe(
      "/samba-security Audite o login",
    );
    expect(
      composeSpecialistTaskPrompt(
        sec,
        "Audite autorização do endpoint",
        "endpoint novo sem checagem de papel",
      ),
    ).toBe(
      "/samba-security Kai notou: endpoint novo sem checagem de papel. Audite autorização do endpoint",
    );
    const mobile = getSpecialistAgent("mobile")!;
    expect(
      composeSpecialistTaskPrompt(mobile, "Adapte o onboarding"),
    ).toContain("Atue como especialista em Apps Nativos / Mobile");
  });

  it("guideline de next-step lista todos os ids e a regra de domínio", () => {
    const guideline = specialistNextStepGuideline();
    expect(guideline).toContain('specialist="<id>"');
    expect(guideline).toContain("cybersec SHOULD speak");
    expect(guideline).toContain("ux-ui SHOULD speak");
    expect(guideline).toContain("NEVER emit ux-ui or mobile");
    for (const agent of specialistAgents) {
      expect(guideline).toContain(`- ${agent.id} (`);
    }
  });
});
