import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  MAX_EXTENSIONS_PER_ROOT,
  MAX_EXTENSION_FILE_BYTES,
} from "@/shared/extensions";
import { discoverExtensions } from "./discovery";

const tempDirs: string[] = [];

async function makeRoot(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "samba-extensions-"));
  tempDirs.push(dir);
  return dir;
}

async function writeFile(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("discoverExtensions", () => {
  it("não falha quando as pastas não existem", async () => {
    const root = await makeRoot();
    await expect(
      discoverExtensions([{ scope: "project", directory: root }]),
    ).resolves.toEqual({ entries: [], warnings: [] });
  });

  it("descobre skills (arquivo e pasta), comandos e agentes em ordem estável", async () => {
    const root = await makeRoot();
    await writeFile(
      root,
      "skills/revisar-login.md",
      "---\ndescription: Revisa o fluxo de login\nmodes: [plan]\n---\nCorpo",
    );
    await writeFile(
      root,
      "skills/relatorio/SKILL.md",
      "---\ndescription: Gera relatório\n---\nCorpo",
    );
    await writeFile(root, "commands/enviar-pr.md", "Corpo do comando");
    await writeFile(
      root,
      "agents/revisor.md",
      "---\ndescription: Revisa código\nagent: plan\n---\nCorpo",
    );

    const { entries, warnings } = await discoverExtensions([
      { scope: "project", directory: root },
    ]);

    expect(warnings).toEqual([]);
    expect(entries.map((entry) => entry.id)).toEqual([
      "skill:project:relatorio",
      "skill:project:revisar-login",
      "command:project:enviar-pr",
      "agent:project:revisor",
    ]);
    expect(
      entries.find((entry) => entry.slug === "revisar-login"),
    ).toMatchObject({
      kind: "skill",
      scope: "project",
      description: "Revisa o fluxo de login",
      modes: ["plan"],
      agent: null,
      subtask: false,
      relativePath: "skills/revisar-login.md",
    });
    expect(entries.find((entry) => entry.slug === "relatorio")).toMatchObject({
      kind: "skill",
      relativePath: "skills/relatorio/SKILL.md",
    });
    expect(entries.find((entry) => entry.slug === "enviar-pr")).toMatchObject({
      kind: "command",
      description: "",
      relativePath: "commands/enviar-pr.md",
    });
    expect(entries.find((entry) => entry.slug === "revisor")?.agent).toBe(
      "plan",
    );
  });

  it("ignora skill sem description, com aviso", async () => {
    const root = await makeRoot();
    await writeFile(
      root,
      "skills/sem-descricao.md",
      "---\nmodes: [ask]\n---\n",
    );

    const { entries, warnings } = await discoverExtensions([
      { scope: "project", directory: root },
    ]);

    expect(entries).toEqual([]);
    expect(warnings).toEqual([
      {
        code: "invalid-frontmatter",
        relativePath: "skills/sem-descricao.md",
        message: expect.stringContaining("description"),
      },
    ]);
  });

  it("recusa nome de arquivo fora do padrão de slug", async () => {
    const root = await makeRoot();
    await writeFile(
      root,
      "commands/Enviar PR.md",
      "---\ndescription: ok\n---\n",
    );

    const { entries, warnings } = await discoverExtensions([
      { scope: "user", directory: root },
    ]);

    expect(entries).toEqual([]);
    expect(warnings.map((warning) => warning.code)).toEqual(["invalid-slug"]);
  });

  it("recusa frontmatter inválido e chave desconhecida", async () => {
    const root = await makeRoot();
    await writeFile(
      root,
      "agents/typo.md",
      "---\ndescriptoin: Revisa\n---\nCorpo",
    );
    await writeFile(
      root,
      "agents/yaml-quebrado.md",
      "---\ndescription: [\n---\n",
    );

    const { entries, warnings } = await discoverExtensions([
      { scope: "project", directory: root },
    ]);

    expect(entries).toEqual([]);
    expect(warnings.map((warning) => warning.code)).toEqual([
      "invalid-frontmatter",
      "invalid-frontmatter",
    ]);
  });

  it("ignora arquivo acima do limite sem lê-lo por inteiro", async () => {
    const root = await makeRoot();
    await writeFile(
      root,
      "commands/gigante.md",
      `---\ndescription: ok\n---\n${"x".repeat(MAX_EXTENSION_FILE_BYTES + 1)}`,
    );

    const { entries, warnings } = await discoverExtensions([
      { scope: "project", directory: root },
    ]);

    expect(entries).toEqual([]);
    expect(warnings.map((warning) => warning.code)).toEqual(["oversize"]);
  });

  it("limita a quantidade de extensões por pasta", async () => {
    const root = await makeRoot();
    for (let index = 0; index <= MAX_EXTENSIONS_PER_ROOT; index += 1) {
      await writeFile(
        root,
        `commands/comando-${index}.md`,
        "---\ndescription: ok\n---\n",
      );
    }

    const { entries, warnings } = await discoverExtensions([
      { scope: "project", directory: root },
    ]);

    expect(entries).toHaveLength(MAX_EXTENSIONS_PER_ROOT);
    expect(warnings.map((warning) => warning.code)).toEqual(["too-many"]);
  });

  it("projeto substitui o usuário e registra o aviso", async () => {
    const userRoot = await makeRoot();
    const projectRoot = await makeRoot();
    await writeFile(
      userRoot,
      "skills/revisar.md",
      "---\ndescription: Versão do usuário\n---\n",
    );
    await writeFile(
      projectRoot,
      "skills/revisar.md",
      "---\ndescription: Versão do projeto\n---\n",
    );

    const { entries, warnings } = await discoverExtensions([
      { scope: "user", directory: userRoot },
      { scope: "project", directory: projectRoot },
    ]);

    expect(entries).toEqual([
      expect.objectContaining({
        slug: "revisar",
        scope: "project",
        description: "Versão do projeto",
      }),
    ]);
    expect(warnings.map((warning) => warning.code)).toEqual(["shadowed"]);
  });

  it("ignora links simbólicos", async () => {
    const root = await makeRoot();
    const outside = await makeRoot();
    await writeFile(
      outside,
      "skills/externa.md",
      "---\ndescription: Fora do projeto\n---\n",
    );
    await fs.mkdir(path.join(root, "skills"), { recursive: true });
    try {
      await fs.symlink(
        path.join(outside, "skills", "externa.md"),
        path.join(root, "skills", "externa.md"),
      );
    } catch {
      // Windows sem privilégio de symlink: o comportamento já é coberto pelo
      // filtro de Dirent, então este caso não invalida a suíte.
      return;
    }

    const { entries, warnings } = await discoverExtensions([
      { scope: "project", directory: root },
    ]);

    expect(entries).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
