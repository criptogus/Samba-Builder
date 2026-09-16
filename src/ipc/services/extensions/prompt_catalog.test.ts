import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const userData = vi.hoisted(() => ({ directory: "" }));
vi.mock("@/paths/paths", () => ({
  getUserDataPath: () => userData.directory,
}));

import { buildSkillCatalogBlock, MAX_SKILLS_IN_PROMPT } from "./prompt_catalog";

describe("buildSkillCatalogBlock", () => {
  let appDir: string;
  let userDataDir: string;

  async function writeSkill(slug: string, description: string, body: string) {
    const target = path.join(appDir, ".samba", "skills", `${slug}.md`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(
      target,
      `---\ndescription: ${description}\n---\n${body}`,
      "utf8",
    );
  }

  beforeEach(async () => {
    appDir = await fs.mkdtemp(path.join(os.tmpdir(), "skill-catalog-app-"));
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "skill-catalog-u-"));
    userData.directory = userDataDir;
  });

  afterEach(async () => {
    await fs.rm(appDir, { recursive: true, force: true });
    await fs.rm(userDataDir, { recursive: true, force: true });
    userData.directory = "";
  });

  it("devolve vazio quando o app não tem skills", async () => {
    await expect(buildSkillCatalogBlock(appDir)).resolves.toBe("");
  });

  it("publica só metadados, nunca o corpo da skill", async () => {
    await writeSkill("revisar-login", "Revisa o fluxo de login", "SEGREDO");

    const block = await buildSkillCatalogBlock(appDir);

    expect(block).toContain("Skills available for this app");
    expect(block).toContain(
      "- revisar-login (skill · project): Revisa o fluxo de login",
    );
    expect(block).not.toContain("SEGREDO");
  });

  it("junta escopo do usuário e do projeto", async () => {
    await writeSkill("revisar-login", "Revisa o fluxo de login", "corpo");
    const userSkill = path.join(
      userDataDir,
      "extensions",
      "skills",
      "preferencias.md",
    );
    await fs.mkdir(path.dirname(userSkill), { recursive: true });
    await fs.writeFile(
      userSkill,
      "---\ndescription: Convenções pessoais\n---\ncorpo",
      "utf8",
    );

    const block = await buildSkillCatalogBlock(appDir);

    expect(block).toContain("revisar-login");
    expect(block).toContain("preferencias");
  });

  it("limita o tamanho do prompt e avisa que existem mais", async () => {
    for (let index = 0; index <= MAX_SKILLS_IN_PROMPT; index += 1) {
      await writeSkill(`skill-${index}`, `Descrição ${index}`, "corpo");
    }

    const block = await buildSkillCatalogBlock(appDir);

    expect(block).toContain("…and 1 more");
    expect(block.match(/^- /gm)?.length).toBe(MAX_SKILLS_IN_PROMPT);
  });
});
