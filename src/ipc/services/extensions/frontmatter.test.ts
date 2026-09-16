import { describe, expect, it } from "vitest";
import { parseExtensionFrontmatter, splitFrontmatter } from "./frontmatter";

describe("splitFrontmatter", () => {
  it("trata arquivo sem frontmatter como corpo puro", () => {
    expect(splitFrontmatter("# Título\n\nCorpo")).toEqual({
      frontmatter: "",
      body: "# Título\n\nCorpo",
    });
  });

  it("remove o BOM antes de procurar o delimitador", () => {
    expect(splitFrontmatter("\uFEFF---\ndescription: ok\n---\nCorpo")).toEqual({
      frontmatter: "description: ok",
      body: "Corpo",
    });
  });

  it("normaliza CRLF para LF, então o mesmo arquivo rende o mesmo corpo", () => {
    expect(
      splitFrontmatter("---\r\ndescription: ok\r\n---\r\nCorpo\r\n"),
    ).toEqual({ frontmatter: "description: ok", body: "Corpo\n" });
  });

  it("frontmatter não fechado é tratado como corpo, não como erro", () => {
    const raw = "---\ndescription: ok\nCorpo";
    expect(splitFrontmatter(raw)).toEqual({ frontmatter: "", body: raw });
  });
});

describe("parseExtensionFrontmatter", () => {
  it("aceita arquivo sem frontmatter", () => {
    const result = parseExtensionFrontmatter("Só o corpo");
    expect(result).toEqual({ ok: true, data: {}, body: "Só o corpo" });
  });

  it("valida os campos declarativos aceitos", () => {
    const result = parseExtensionFrontmatter(
      [
        "---",
        "description: Revisa o login",
        "modes:",
        "  - plan",
        "  - ask",
        "agent: plan",
        "model: gpt-5",
        "subtask: true",
        "---",
        "Corpo da extensão",
      ].join("\n"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      description: "Revisa o login",
      modes: ["plan", "ask"],
      agent: "plan",
      model: "gpt-5",
      subtask: true,
    });
    expect(result.body).toBe("Corpo da extensão");
  });

  it("recusa YAML inválido", () => {
    const result = parseExtensionFrontmatter("---\ndescription: [\n---\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("YAML");
  });

  it("recusa chave desconhecida em vez de ignorar um typo", () => {
    const result = parseExtensionFrontmatter(
      "---\ndescriptoin: Revisa o login\n---\n",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Frontmatter inválido");
  });

  it("recusa modo que não existe", () => {
    const result = parseExtensionFrontmatter("---\nmodes:\n  - turbo\n---\n");
    expect(result.ok).toBe(false);
  });

  it("recusa description vazia", () => {
    const result = parseExtensionFrontmatter("---\ndescription: '   '\n---\n");
    expect(result.ok).toBe(false);
  });
});
