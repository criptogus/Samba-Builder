import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const userData = vi.hoisted(() => ({ directory: "" }));

vi.mock("@/paths/paths", () => ({
  getUserDataPath: () => userData.directory,
}));

import { loadSkillTool } from "./load_skill";
import type { AgentContext } from "./types";

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("loadSkillTool", () => {
  let appDir: string;
  let projectExtensionsRoot: string;
  let userExtensionsRoot: string;
  let mockContext: AgentContext;

  /** Grava uma skill em `<extensionsRoot>/skills/<relativePath>`. */
  async function writeSkill(
    extensionsRoot: string,
    relativePath: string,
    frontmatter: string,
    body: string,
  ) {
    const target = path.join(extensionsRoot, "skills", relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `---\n${frontmatter}\n---\n${body}`, "utf8");
  }

  beforeEach(async () => {
    appDir = await fs.mkdtemp(path.join(os.tmpdir(), "load-skill-app-"));
    projectExtensionsRoot = path.join(appDir, ".samba");
    const userDataDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "load-skill-user-"),
    );
    // `getUserDataPath()` devolve a área de dados; o serviço acrescenta
    // `extensions`, igual ao app real.
    userData.directory = userDataDir;
    userExtensionsRoot = path.join(userDataDir, "extensions");

    mockContext = {
      event: {} as never,
      appId: 1,
      appPath: appDir,
      referencedApps: new Map(),
      chatId: 1,
      supabaseProjectId: null,
      supabaseOrganizationSlug: null,
      neonProjectId: null,
      neonActiveBranchId: null,
      frameworkType: null,
      messageId: 1,
      isSharedModulesChanged: false,
      sharedServerModulePaths: [],
      pendingFunctionDeploys: [],
      isSambaPro: false,
      todos: [],
      sambaRequestId: "test-request",
      fileEditTracker: {},
      testingEnabled: false,
      testRunAttempts: new Map(),
      onXmlStream: vi.fn(),
      onXmlComplete: vi.fn(),
      requireConsent: vi.fn().mockResolvedValue(true),
      appendUserMessage: vi.fn(),
      onUpdateTodos: vi.fn(),
    };
  });

  afterEach(async () => {
    await fs.rm(appDir, { recursive: true, force: true });
    if (userData.directory) {
      await fs.rm(userData.directory, { recursive: true, force: true });
      userData.directory = "";
    }
    vi.clearAllMocks();
  });

  it("lista as skills disponíveis quando nenhum slug é informado", async () => {
    await writeSkill(
      projectExtensionsRoot,
      "revisar-login/SKILL.md",
      "description: Revisa o fluxo de login",
      "Passos da revisão",
    );

    const result = await loadSkillTool.execute({}, mockContext);

    expect(result).toContain("Available skills:");
    expect(result).toContain(
      "revisar-login (project): Revisa o fluxo de login",
    );
  });

  it("avisa quando não há skills em nenhum escopo", async () => {
    await expect(loadSkillTool.execute({}, mockContext)).resolves.toBe(
      "No skills are available in this project or on this machine.",
    );
  });

  it("carrega o corpo sem o frontmatter e informa o escopo", async () => {
    await writeSkill(
      projectExtensionsRoot,
      "revisar-login/SKILL.md",
      "description: Revisa o fluxo de login\nmodes:\n  - plan",
      "Passos da revisão",
    );

    const result = await loadSkillTool.execute(
      { skill: "revisar-login" },
      mockContext,
    );

    expect(result).toContain(
      'Skill "revisar-login" (project · skills/revisar-login/SKILL.md):',
    );
    expect(result).toContain(
      "<instructions>\nPassos da revisão\n</instructions>",
    );
    expect(result).not.toContain("description:");
    expect(result).not.toContain("modes:");
  });

  it("lê skills do escopo do usuário", async () => {
    await writeSkill(
      userExtensionsRoot,
      "preferencias.md",
      "description: Convenções pessoais",
      "Use 2 espaços",
    );

    const result = await loadSkillTool.execute(
      { skill: "preferencias" },
      mockContext,
    );

    expect(result).toContain(
      'Skill "preferencias" (user · skills/preferencias.md):',
    );
    expect(result).toContain("Use 2 espaços");
  });

  it("projeto substitui a skill de mesmo nome do usuário", async () => {
    await writeSkill(
      userExtensionsRoot,
      "revisar-login.md",
      "description: Versão do usuário",
      "Corpo do usuário",
    );
    await writeSkill(
      projectExtensionsRoot,
      "revisar-login.md",
      "description: Versão do projeto",
      "Corpo do projeto",
    );

    const result = await loadSkillTool.execute(
      { skill: "revisar-login" },
      mockContext,
    );

    expect(result).toContain("Corpo do projeto");
    expect(result).not.toContain("Corpo do usuário");
  });

  it("explica o que existe quando o slug não é encontrado", async () => {
    await writeSkill(
      projectExtensionsRoot,
      "revisar-login.md",
      "description: Revisa o fluxo de login",
      "Corpo",
    );

    await expect(
      loadSkillTool.execute({ skill: "nao-existe" }, mockContext),
    ).rejects.toThrow(
      /Skill "nao-existe" not found\. Available skills: revisar-login/,
    );
  });

  it("recusa um nome fora do padrão de slug antes de tocar o disco", async () => {
    await expect(
      loadSkillTool.execute({ skill: "Revisar Login" }, mockContext),
    ).rejects.toThrow(/not a valid skill name/);
  });

  it("ignora skill sem description ao listar", async () => {
    await writeSkill(
      projectExtensionsRoot,
      "sem-descricao.md",
      "modes:\n  - ask",
      "Corpo",
    );

    await expect(loadSkillTool.execute({}, mockContext)).resolves.toBe(
      "No skills are available in this project or on this machine.",
    );
  });
});
