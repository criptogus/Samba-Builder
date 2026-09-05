import ignore, { type Ignore } from "ignore";
import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".aws",
  ".ssh",
  ".vercel",
  "coverage",
  ".DS_Store",
  ".npmrc",
  ".netrc",
  ".git-credentials",
  ".yarnrc.yml",
]);
export function excludedFromCloud(name: string): boolean {
  return (
    excluded.has(name) ||
    /^\.env(?:\.|$)/i.test(name) ||
    /\.(pem|key|p12|pfx)$/i.test(name)
  );
}
// Hash one file at a time; never retain the full source tree in RAM.
// The same traversal creates the isolated Docker context, without credentials,
// symlinks, build caches, or dependencies from the developer's machine.
export async function prepareAwsSource(root: string, destination?: string) {
  const hash = createHash("sha256");
  let visited = 0;
  let files = 0;
  let bytes = 0;
  let dockerfile = false;
  async function walk(
    relative: string,
    inherited: { base: string; rules: Ignore }[] = [],
  ) {
    if (++visited > 10000 || relative.split("/").length > 40)
      throw new DyadError(
        "Muitas pastas no contexto Docker.",
        DyadErrorKind.Precondition,
      );
    const rules = [...inherited];
    const ignoreFile = path.join(root, relative, ".gitignore");
    try {
      const stat = await fs.lstat(ignoreFile);
      if (stat.isSymbolicLink() || stat.size > 100_000)
        throw new DyadError(
          "Arquivo .gitignore inválido para publicação.",
          DyadErrorKind.Precondition,
        );
      rules.push({
        base: relative ? `${relative}/` : "",
        rules: ignore().add(await fs.readFile(ignoreFile, "utf8")),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const entries = await fs.readdir(path.join(root, relative), {
      withFileTypes: true,
    });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      if (excludedFromCloud(entry.name)) continue;
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        rules.some((matcher) =>
          matcher.rules.ignores(
            name.slice(matcher.base.length) + (entry.isDirectory() ? "/" : ""),
          ),
        )
      )
        continue;
      if (entry.isSymbolicLink())
        throw new DyadError(
          `Remova o link simbólico do contexto Docker: ${name}`,
          DyadErrorKind.Precondition,
        );
      if (entry.isDirectory()) {
        await walk(name, rules);
        continue;
      }
      if (!entry.isFile()) continue;
      const source = path.join(root, name);
      const stat = await fs.stat(source);
      files++;
      bytes += stat.size;
      if (
        files > 10000 ||
        bytes > 200 * 1024 * 1024 ||
        stat.size > 20 * 1024 * 1024
      )
        throw new DyadError(
          "Contexto Docker excede o limite: 10 mil arquivos, 200 MB no total ou 20 MB por arquivo.",
          DyadErrorKind.Precondition,
        );
      const content = await fs.readFile(source);
      if (content.length !== stat.size)
        throw new DyadError(
          "O projeto mudou durante a leitura. Revise novamente.",
          DyadErrorKind.Precondition,
        );
      hash.update(`${name}\0${stat.mode & 0o777}\0${content.length}\0`);
      hash.update(content);
      if (name === "Dockerfile") dockerfile = true;
      if (destination) {
        const target = path.join(destination, name);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, { mode: stat.mode & 0o777 });
      }
    }
  }
  await walk("");
  if (!dockerfile)
    throw new DyadError(
      "Adicione um Dockerfile na raiz que compile o frontend e inicie o backend na porta configurada.",
      DyadErrorKind.Precondition,
    );
  return {
    sourceFiles: files,
    sourceBytes: bytes,
    sourceDigest: hash.digest("hex"),
  };
}
