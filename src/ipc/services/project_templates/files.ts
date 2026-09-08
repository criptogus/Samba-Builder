import * as fs from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import ignore, { type Ignore } from "ignore";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { TemplateDraft } from "@/shared/project_templates";

const excluded = new Set([
  ".git",
  ".dyad",
  "node_modules",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  ".netlify",
  ".aws",
  ".ssh",
  ".ds_store",
  ".npmrc",
  ".yarnrc.yml",
  ".netrc",
  ".git-credentials",
  "credentials.json",
  "service-account.json",
]);
export function excludedTemplatePath(name: string) {
  return (
    excluded.has(name.toLowerCase()) ||
    /^\.env(?:\.|$)/i.test(name) ||
    /\.(pem|key|p12|pfx|db|sqlite|sqlite3|log)$/i.test(name)
  );
}
export function safeTemplatePath(value: string) {
  const parts = value.split("/");
  return (
    value.length <= 500 &&
    parts.length <= 40 &&
    parts.every(
      (p) =>
        p &&
        p !== "." &&
        p !== ".." &&
        !/[\\:\x00-\x1f<>"|?*]/.test(p) &&
        !/[. ]$/.test(p) &&
        !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p) &&
        !excludedTemplatePath(p),
    )
  );
}
export const digest = (data: Buffer) =>
  createHash("sha256").update(data).digest("hex");
export async function snapshotTemplateFiles(
  source: string,
  destination: string,
) {
  const root = await fs.realpath(source);
  const files: TemplateDraft["files"] = [];
  const seen = new Set<string>();
  let excludedCount = 0,
    bytes = 0,
    visited = 0;
  async function walk(
    relative: string,
    inherited: { base: string; rules: Ignore }[] = [],
  ) {
    if (++visited > 5000 || relative.split("/").length > 40)
      throw new DyadError(
        "Projeto grande demais para template.",
        DyadErrorKind.Validation,
      );
    const directory = path.join(root, relative);
    if ((await fs.realpath(directory)) !== directory)
      throw new DyadError(
        "A pasta mudou durante o salvamento. Tente novamente.",
        DyadErrorKind.Conflict,
      );
    const rules = [...inherited];
    try {
      const file = await fs.open(
        path.join(directory, ".gitignore"),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        if ((await file.stat()).size > 100_000)
          throw new Error(".gitignore muito grande.");
        rules.push({
          base: relative ? `${relative}/` : "",
          rules: ignore().add(await file.readFile("utf8")),
        });
      } finally {
        await file.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      let ignored = false;
      for (const rule of rules) {
        const result = rule.rules.test(
          name.slice(rule.base.length) + (entry.isDirectory() ? "/" : ""),
        );
        if (result.ignored) ignored = true;
        if (result.unignored) ignored = false;
      }
      if (
        excludedTemplatePath(entry.name) ||
        ignored ||
        entry.isSymbolicLink()
      ) {
        excludedCount++;
        continue;
      }
      if (!safeTemplatePath(name))
        throw new DyadError(
          `Nome incompatível com Mac/Windows: ${name}`,
          DyadErrorKind.Validation,
        );
      const portableName = name.normalize("NFC").toLowerCase();
      if (seen.has(portableName))
        throw new DyadError(
          `Nomes duplicados em Mac/Windows: ${name}`,
          DyadErrorKind.Validation,
        );
      seen.add(portableName);
      if (entry.isDirectory()) {
        await walk(name, rules);
        continue;
      }
      if (!entry.isFile()) {
        excludedCount++;
        continue;
      }
      const file = await fs.open(
        path.join(root, name),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const stat = await file.stat();
        bytes += stat.size;
        if (
          !stat.isFile() ||
          stat.size > 20_000_000 ||
          bytes > 100_000_000 ||
          files.length >= 1000
        )
          throw new DyadError(
            "Limite do template: 1.000 arquivos, 100 MB no total e 20 MB por arquivo.",
            DyadErrorKind.Validation,
          );
        const content = Buffer.alloc(stat.size);
        let offset = 0;
        while (offset < content.length) {
          const { bytesRead } = await file.read(
            content,
            offset,
            content.length - offset,
            offset,
          );
          if (!bytesRead) break;
          offset += bytesRead;
        }
        const after = await file.stat();
        if (
          offset !== stat.size ||
          after.size !== stat.size ||
          after.mtimeMs !== stat.mtimeMs
        )
          throw new DyadError(
            "O projeto mudou durante a cópia. Tente novamente.",
            DyadErrorKind.Conflict,
          );
        const target = path.join(destination, name);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, {
          flag: "wx",
          mode: stat.mode & 0o111 ? 0o755 : 0o644,
        });
        files.push({
          path: name,
          size: stat.size,
          executable: !!(stat.mode & 0o111),
          digest: digest(content),
        });
      } finally {
        await file.close();
      }
    }
  }
  await walk("");
  if (!files.length)
    throw new DyadError(
      "O projeto não contém arquivos reutilizáveis.",
      DyadErrorKind.Validation,
    );
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, excluded: excludedCount };
}
