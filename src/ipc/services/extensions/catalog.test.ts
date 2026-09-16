import { describe, expect, it } from "vitest";
import { extensionEntryId, type ExtensionEntry } from "@/shared/extensions";
import {
  buildExtensionCatalog,
  formatExtensionBody,
  formatExtensionSummary,
} from "./catalog";

function entry(overrides: Partial<ExtensionEntry>): ExtensionEntry {
  const kind = overrides.kind ?? "skill";
  const scope = overrides.scope ?? "project";
  const slug = overrides.slug ?? "revisar-login";
  return {
    id: extensionEntryId(kind, scope, slug),
    kind,
    scope,
    slug,
    description: "Revisa o fluxo de login",
    modes: [],
    agent: null,
    model: null,
    subtask: false,
    relativePath: `skills/${slug}.md`,
    bytes: 120,
    ...overrides,
  };
}

describe("formatExtensionSummary", () => {
  it("usa um formato só, com tipo, escopo e descrição", () => {
    expect(formatExtensionSummary(entry({}))).toBe(
      "- revisar-login (skill · project): Revisa o fluxo de login",
    );
  });

  it("mostra os modos quando a extensão é limitada a eles", () => {
    expect(formatExtensionSummary(entry({ modes: ["plan", "ask"] }))).toContain(
      "[modes: plan, ask]",
    );
  });

  it("não deixa a linha ambígua quando falta descrição", () => {
    expect(formatExtensionSummary(entry({ description: "" }))).toContain(
      "(no description)",
    );
  });
});

describe("buildExtensionCatalog", () => {
  it("ordena por nome e ignora outros tipos", () => {
    const catalog = buildExtensionCatalog(
      [
        entry({ slug: "zebra" }),
        entry({ slug: "alpha" }),
        entry({ kind: "command", slug: "enviar-pr" }),
      ],
      "skill",
    );

    expect(catalog.split("\n")).toEqual([
      "Available skills:",
      expect.stringContaining("- alpha "),
      expect.stringContaining("- zebra "),
    ]);
  });

  it("devolve vazio quando não há nada do tipo pedido", () => {
    expect(buildExtensionCatalog([], "skill")).toBe("");
    expect(buildExtensionCatalog([entry({ kind: "agent" })], "skill")).toBe("");
  });

  it("respeita um cabeçalho próprio", () => {
    expect(
      buildExtensionCatalog([entry({})], "skill", {
        header: "Skills neste projeto:",
      }),
    ).toContain("Skills neste projeto:");
  });
});

describe("formatExtensionBody", () => {
  it("identifica tipo, nome, escopo e caminho e isola as instruções", () => {
    expect(formatExtensionBody(entry({}), "Passos da revisão")).toBe(
      [
        'skill "revisar-login" (project · skills/revisar-login.md):',
        "<instructions>",
        "Passos da revisão",
        "</instructions>",
      ].join("\n"),
    );
  });
});
