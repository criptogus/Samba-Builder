import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const userData = vi.hoisted(() => ({ directory: "" }));
vi.mock("@/paths/paths", () => ({
  getUserDataPath: () => userData.directory,
}));

import { listExtensions } from "@/ipc/services/extensions/load";
import { ensureBundledGameSkills } from "./bundled_skills";
import { inspectGameComputer } from "./computer";
import { importMachineSkill } from "./machine_skills";
import { readGameStudioSnapshot } from "./snapshot";

describe("construtor de jogos", () => {
  const directories: string[] = [];

  async function tempDir(prefix: string): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    directories.push(directory);
    return directory;
  }

  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map((directory) => fs.rm(directory, { recursive: true, force: true })),
    );
    userData.directory = "";
  });

  it("instala as skills de jogo e não sobrescreve uma edição", async () => {
    const home = await tempDir("game-studio-home-");
    userData.directory = home;
    await ensureBundledGameSkills(home);
    const skillFile = path.join(
      home,
      "extensions",
      "skills",
      "construtor-de-jogos",
      "SKILL.md",
    );
    await fs.writeFile(
      skillFile,
      "---\ndescription: Editada\n---\ncorpo\n",
      "utf8",
    );
    await ensureBundledGameSkills(home);
    await expect(fs.readFile(skillFile, "utf8")).resolves.toContain("Editada");

    const installed = await listExtensions(
      [{ scope: "user", directory: path.join(home, "extensions") }],
      "skill",
    );
    expect(installed.map((entry) => entry.slug)).toContain("jogo-cena-web");
    expect(installed.map((entry) => entry.slug)).toContain(
      "computador-do-estudio",
    );
  });

  it("inspeciona sem criar pastas ou instalar skills", async () => {
    const home = await tempDir("game-inspect-home-");
    const data = path.join(home, "missing-user-data");
    const snapshot = await readGameStudioSnapshot({
      home,
      userDataDirectory: data,
      pathEntries: [],
    });
    expect(snapshot.bundled.every((skill) => !skill.installed)).toBe(true);
    await expect(fs.lstat(data)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["extensions", "skills", "slug", "file"])(
    "recusa link no destino: %s",
    async (level) => {
      const home = await tempDir("game-import-home-");
      const data = await tempDir("game-import-data-");
      const outside = await tempDir("game-import-outside-");
      const source = path.join(home, "skills");
      await fs.mkdir(source);
      await fs.writeFile(path.join(source, "pulo.md"), "# Pulo");
      const snapshot = await readGameStudioSnapshot({
        home,
        userDataDirectory: data,
        pathEntries: [],
      });
      const extensions = path.join(data, "extensions");
      const skills = path.join(extensions, "skills");
      const slug = path.join(skills, "pulo");
      const target =
        level === "extensions"
          ? extensions
          : level === "skills"
            ? skills
            : level === "slug"
              ? slug
              : path.join(slug, "SKILL.md");
      await fs.mkdir(path.dirname(target), { recursive: true });
      const outsideFile = path.join(outside, "SKILL.md");
      await fs.writeFile(outsideFile, "preserve");
      await fs.symlink(
        level === "file" ? outsideFile : outside,
        target,
        level === "file" ? "file" : "junction",
      );
      await expect(
        importMachineSkill({
          discoveryId: snapshot.discovered[0].id,
          home,
          userDataDirectory: data,
        }),
      ).rejects.toThrow();
      await expect(fs.readFile(outsideFile, "utf8")).resolves.toBe("preserve");
      expect(await fs.readdir(outside)).toEqual(["SKILL.md"]);
    },
  );

  it("não segue links ao instalar skills incluídas no app", async () => {
    const data = await tempDir("game-bundled-links-");
    const outside = await tempDir("game-bundled-outside-");
    await fs.symlink(outside, path.join(data, "extensions"), "junction");
    await expect(ensureBundledGameSkills(data)).rejects.toThrow();
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it("instala cópias concorrentes sem sobrescrever o conteúdo", async () => {
    const data = await tempDir("game-concurrent-");
    await Promise.all([
      ensureBundledGameSkills(data),
      ensureBundledGameSkills(data),
    ]);
    const files = await fs.readdir(path.join(data, "extensions", "skills"));
    expect(files).toHaveLength(6);
    expect(files.some((name) => name.startsWith(".install-"))).toBe(false);
  });

  it("importa um markdown solto, sem frontmatter, para o catálogo do Samba", async () => {
    const home = await tempDir("game-studio-import-");
    const data = await tempDir("game-studio-data-");
    userData.directory = data;
    const claude = path.join(home, ".claude", "skills");
    await fs.mkdir(claude, { recursive: true });
    await fs.writeFile(
      path.join(claude, "Pulo Extra.md"),
      "# Pulo\n\nUm pulo mais alto depois do coyote time.\n",
      "utf8",
    );

    const snapshot = await readGameStudioSnapshot({
      home,
      userDataDirectory: data,
      pathEntries: [],
    });
    const found = snapshot.discovered.find(
      (skill) => skill.slug === "pulo-extra",
    );
    expect(found?.origin).toBe("Claude");
    expect(found?.installed).toBe(false);
    expect(found?.description).toContain("Pulo");

    const imported = await importMachineSkill({
      discoveryId: found?.id ?? "",
      home,
      userDataDirectory: data,
    });
    expect(imported.status).toBe("installed");

    const again = await importMachineSkill({
      discoveryId: found?.id ?? "",
      home,
      userDataDirectory: data,
    });
    expect(again.status).toBe("already-present");

    const installed = await listExtensions(
      [{ scope: "user", directory: path.join(data, "extensions") }],
      "skill",
    );
    const skill = installed.find((entry) => entry.slug === "pulo-extra");
    expect(skill?.description).toContain("Pulo");
  });

  it("copia a pasta da skill e ignora link simbólico que sai dela", async () => {
    const home = await tempDir("game-studio-dir-");
    const data = await tempDir("game-studio-dir-data-");
    const skillDir = path.join(home, ".cursor", "skills", "mira-firme");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: nao-entra\ndescription: Mira estável\n---\nMire no quadro do clique.\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(skillDir, "notas.md"),
      "detalhe da mira\n",
      "utf8",
    );
    const outside = path.join(home, "segredo.txt");
    await fs.writeFile(outside, "segredo", "utf8");
    await fs.symlink(outside, path.join(skillDir, "vazou.md"));

    const snapshot = await readGameStudioSnapshot({
      home,
      userDataDirectory: data,
      pathEntries: [],
    });
    const found = snapshot.discovered.find(
      (skill) => skill.slug === "mira-firme",
    );
    await importMachineSkill({
      discoveryId: found?.id ?? "",
      home,
      userDataDirectory: data,
    });

    const copied = path.join(data, "extensions", "skills", "mira-firme");
    const skill = await fs.readFile(path.join(copied, "SKILL.md"), "utf8");
    expect(skill).toContain("Mira estável");
    expect(skill).not.toContain("name:");
    await expect(
      fs.readFile(path.join(copied, "notas.md"), "utf8"),
    ).resolves.toContain("detalhe");
    await expect(fs.lstat(path.join(copied, "vazou.md"))).rejects.toThrow();
  });

  it("não segue uma pasta de skill que é só um link", async () => {
    const home = await tempDir("game-studio-link-");
    const data = await tempDir("game-studio-link-data-");
    const real = path.join(home, "fora");
    await fs.mkdir(path.join(real, "escapa"), { recursive: true });
    await fs.writeFile(
      path.join(real, "escapa", "SKILL.md"),
      "---\ndescription: Fora\n---\nnao\n",
      "utf8",
    );
    const cursor = path.join(home, ".cursor", "skills");
    await fs.mkdir(cursor, { recursive: true });
    await fs.symlink(path.join(real, "escapa"), path.join(cursor, "escapa"));

    const snapshot = await readGameStudioSnapshot({
      home,
      userDataDirectory: data,
      pathEntries: [],
    });
    expect(snapshot.discovered.map((skill) => skill.slug)).not.toContain(
      "escapa",
    );
  });

  it("marca o programa quando o executável está no PATH informado", async () => {
    const bin = await tempDir("game-studio-bin-");
    const blender = path.join(bin, "blender");
    await fs.writeFile(blender, "#!/bin/sh\n", "utf8");
    await fs.chmod(blender, 0o755);
    const programs = await inspectGameComputer([bin]);
    expect(
      programs.find((program) => program.id === "blender")?.available,
    ).toBe(true);
    expect(programs.find((program) => program.id === "godot")?.available).toBe(
      false,
    );
  });
  it("reconhece executáveis acessíveis por link no PATH", async () => {
    const bin = await tempDir("game-program-links-");
    const executable = path.join(bin, "runtime");
    await fs.writeFile(executable, "#!/bin/sh\n", { mode: 0o755 });
    await fs.symlink(executable, path.join(bin, "node"));
    expect(
      (await inspectGameComputer([bin])).find(
        (program) => program.id === "node",
      )?.available,
    ).toBe(true);
  });
});
