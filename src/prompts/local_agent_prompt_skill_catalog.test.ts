import { describe, expect, it } from "vitest";
import { constructLocalAgentPrompt } from "./local_agent_prompt";

describe("constructLocalAgentPrompt — catálogo de skills (REQ-03)", () => {
  it("não inclui bloco de skills quando não há catálogo", () => {
    expect(constructLocalAgentPrompt(undefined)).not.toContain(
      "<available_skills>",
    );
  });

  it("publica os metadados e deixa claro que skill não concede capacidade", () => {
    const prompt = constructLocalAgentPrompt(undefined, undefined, {
      skillCatalog:
        "- revisar-login (skill · project): Revisa o fluxo de login",
    });

    expect(prompt).toContain("<available_skills>");
    expect(prompt).toContain(
      "- revisar-login (skill · project): Revisa o fluxo de login",
    );
    expect(prompt).toContain("load_skill");
    expect(prompt).toContain("nunca concedem ferramentas");
  });

  it("trata catálogo em branco como ausência de skills", () => {
    expect(
      constructLocalAgentPrompt(undefined, undefined, { skillCatalog: "   " }),
    ).not.toContain("<available_skills>");
  });
});
