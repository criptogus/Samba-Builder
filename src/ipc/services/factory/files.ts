import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { SourceFile } from "../../../../packages/samba-factory/src/scanner";

const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".dyad",
  "test-results",
  "playwright-report",
]);
const generated = new Set([
  "docs/brief.md",
  "docs/plan.md",
  "docs/scope.md",
  "docs/design-tokens.json",
  "docs/security-report.md",
  "docs/handoff.md",
  "samba/pipeline-status.json",
  "samba/skills.lock",
]);
/** Hash all regular source assets, including binaries; never follow symlinks. */
export async function readFactorySources(root: string) {
  const files: SourceFile[] = [];
  const limitations: string[] = [];
  const hash = createHash("sha256");
  let count = 0;
  let bytes = 0;
  async function walk(directory: string) {
    const entries = (await fs.readdir(directory, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      if (excluded.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      // Evidence includes its own digest, so only non-executable receipts are excluded.
      if (
        [
          "docs/security-report.md",
          "samba/pipeline-status.json",
          "samba/skills.lock",
        ].includes(relative)
      )
        continue;
      if (entry.isSymbolicLink()) {
        limitations.push(`Link simbólico não inspecionado: ${relative}`);
        hash.update(`symlink:${relative}`);
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!entry.isFile()) {
        limitations.push(`Arquivo especial: ${relative}`);
        continue;
      }
      const stat = await fs.lstat(absolute);
      if (
        ++count > 10000 ||
        stat.size > 5_000_000 ||
        (bytes += stat.size) > 100_000_000
      ) {
        throw new Error(
          "Projeto excede o limite do scan local (10 mil arquivos, 5 MB por arquivo, 100 MB total).",
        );
      }
      const buffer = await fs.readFile(absolute);
      hash
        .update(`${relative.length}:${relative}:${buffer.length}:`)
        .update(buffer);
      if (!buffer.includes(0))
        files.push({ path: relative, content: buffer.toString("utf8") });
    }
  }
  await walk(root);
  return {
    files,
    digest: hash.digest("hex"),
    complete: limitations.length === 0,
    limitations,
  };
}

export async function writeFactoryArtifact(
  root: string,
  relative: string,
  content: string,
) {
  if (!generated.has(relative))
    throw new Error("Artifact path is not allowlisted");
  const target = path.join(root, relative);
  const directory = path.dirname(target);
  await fs.mkdir(directory, { recursive: true });
  const rootReal = await fs.realpath(root);
  const directoryReal = await fs.realpath(directory);
  if (directoryReal !== path.join(rootReal, path.dirname(relative)))
    throw new Error("Pasta de artefatos não pode ser link simbólico.");
  const existing = await fs
    .lstat(target)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
  if (existing && (!existing.isFile() || existing.isSymbolicLink()))
    throw new Error("Artefato não pode ser link ou arquivo especial.");
  const temporary = path.join(directory, ".samba-" + randomUUID() + ".tmp");
  try {
    await fs.writeFile(temporary, content, { mode: 0o600, flag: "wx" });
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
