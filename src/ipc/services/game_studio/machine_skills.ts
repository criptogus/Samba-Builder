import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { getUserDataPath } from "@/paths/paths";
import {
  EXTENSION_SLUG_PATTERN,
  MAX_EXTENSION_FILE_BYTES,
  MAX_EXTENSION_SLUG_LENGTH,
} from "@/shared/extensions";
import type { DiscoveredMachineSkill } from "@/shared/game_studio";
import { SKILL_FILE_NAME } from "@/ipc/services/extensions/discovery";
import { splitFrontmatter } from "@/ipc/services/extensions/frontmatter";
import { USER_EXTENSIONS_DIRECTORY } from "@/ipc/services/extensions/roots";

const MAX_SKILL_FILES = 16;
const MAX_WALK_DEPTH = 3;
const TEXT_EXTENSIONS = new Set([".md", ".txt"]);

export interface MachineSkillRoot {
  origin: string;
  directory: string;
}

/** Pastas em que Claude, Codex, Cursor e a pessoa guardam skills. */
export function machineSkillRoots(home = os.homedir()): MachineSkillRoot[] {
  return [
    { origin: "Claude", directory: path.join(home, ".claude", "skills") },
    { origin: "Codex", directory: path.join(home, ".codex", "skills") },
    { origin: "Agentes", directory: path.join(home, ".agents", "skills") },
    { origin: "Cursor", directory: path.join(home, ".cursor", "skills") },
    { origin: "Computador", directory: path.join(home, "skills") },
  ];
}

export function skillSlug(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_EXTENSION_SLUG_LENGTH);
  return EXTENSION_SLUG_PATTERN.test(slug) ? slug : null;
}

function discoveryId(origin: string, realPath: string): string {
  return createHash("sha256")
    .update(`${origin}\0${realPath}`)
    .digest("hex")
    .slice(0, 24);
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function insideRoot(rootReal: string, candidateReal: string): boolean {
  return (
    candidateReal === rootReal || candidateReal.startsWith(rootReal + path.sep)
  );
}

async function realDirectory(directory: string): Promise<string | null> {
  try {
    const stats = await fs.lstat(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return null;
    return await fs.realpath(directory);
  } catch (error) {
    if (isMissing(error)) return null;
    return null;
  }
}

function describeSkill(raw: string, fallback: string): string {
  const { frontmatter, body } = splitFrontmatter(raw);
  const quoted = /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim();
  if (quoted) {
    return quoted.replace(/^["']|["']$/g, "").slice(0, 600);
  }
  const line = body
    .split(/\r?\n/)
    .map((item) => item.replace(/^#+\s*/, "").trim())
    .find((item) => item.length > 0);
  return (line ?? fallback).slice(0, 600);
}

interface SkillSource {
  id: string;
  origin: string;
  slug: string;
  title: string;
  description: string;
  directoryReal: string;
  /** Arquivo único quando a skill é um markdown solto. */
  singleFile: string | null;
}

async function readSource(
  origin: string,
  rootReal: string,
  absolutePath: string,
  slugName: string,
  singleFile: boolean,
): Promise<SkillSource | null> {
  const slug = skillSlug(slugName);
  if (!slug) return null;
  let stats: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stats = await fs.lstat(absolutePath);
  } catch {
    return null;
  }
  if (!stats.isFile() || stats.isSymbolicLink()) return null;
  if (stats.size > MAX_EXTENSION_FILE_BYTES) return null;
  const realFile = await fs.realpath(absolutePath);
  if (!insideRoot(rootReal, realFile)) return null;
  const raw = await fs.readFile(realFile, "utf8");
  const parent = path.dirname(realFile);
  return {
    id: discoveryId(origin, realFile),
    origin,
    slug,
    title: slug,
    description: describeSkill(raw, `Skill ${slug} encontrada em ${origin}.`),
    directoryReal: singleFile ? parent : parent,
    singleFile: singleFile ? realFile : null,
  };
}

async function scanRoot(root: MachineSkillRoot): Promise<SkillSource[]> {
  const rootReal = await realDirectory(root.directory);
  if (!rootReal) return [];
  let dirents: Dirent[];
  try {
    dirents = await fs.readdir(rootReal, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: SkillSource[] = [];
  for (const dirent of dirents) {
    if (dirent.name.startsWith(".") || dirent.isSymbolicLink()) continue;
    const absolute = path.join(rootReal, dirent.name);
    if (dirent.isFile() && dirent.name.toLowerCase().endsWith(".md")) {
      const source = await readSource(
        root.origin,
        rootReal,
        absolute,
        dirent.name,
        true,
      );
      if (source) found.push(source);
      continue;
    }
    if (!dirent.isDirectory()) continue;
    const skillFile = path.join(absolute, SKILL_FILE_NAME);
    const source = await readSource(
      root.origin,
      rootReal,
      skillFile,
      dirent.name,
      false,
    );
    if (source) found.push(source);
  }
  return found;
}

export async function discoverMachineSkills(options?: {
  home?: string;
  roots?: readonly MachineSkillRoot[];
  installedSlugs?: ReadonlySet<string>;
}): Promise<DiscoveredMachineSkill[]> {
  const roots = options?.roots ?? machineSkillRoots(options?.home);
  const installed = options?.installedSlugs ?? new Set<string>();
  const sources = (
    await Promise.all(roots.map((root) => scanRoot(root)))
  ).flat();
  sources.sort((a, b) =>
    a.origin === b.origin
      ? a.slug < b.slug
        ? -1
        : a.slug > b.slug
          ? 1
          : 0
      : a.origin < b.origin
        ? -1
        : 1,
  );
  return sources.map((source) => ({
    id: source.id,
    slug: source.slug,
    title: source.title,
    description: source.description,
    origin: source.origin,
    installed: installed.has(source.slug),
    importable: true,
    blockedReason: null,
  }));
}

async function findSource(
  discoveryIdValue: string,
  roots: readonly MachineSkillRoot[],
): Promise<SkillSource> {
  const sources = (
    await Promise.all(roots.map((root) => scanRoot(root)))
  ).flat();
  const match = sources.find((source) => source.id === discoveryIdValue);
  if (!match) {
    throw new SambaError(
      "Essa skill não está mais nas pastas do computador. Atualize a lista e tente de novo.",
      SambaErrorKind.NotFound,
    );
  }
  return match;
}

async function collectTextFiles(
  directory: string,
  rootReal: string,
  depth: number,
): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  if (depth > MAX_WALK_DEPTH) return [];
  let dirents: Dirent[];
  try {
    dirents = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: Array<{ relativePath: string; absolutePath: string }> = [];
  for (const dirent of dirents) {
    if (dirent.name.startsWith(".") || dirent.name === "node_modules") continue;
    if (dirent.isSymbolicLink()) continue;
    const absolutePath = path.join(directory, dirent.name);
    if (dirent.isDirectory()) {
      files.push(
        ...(await collectTextFiles(absolutePath, rootReal, depth + 1)),
      );
      continue;
    }
    if (!dirent.isFile()) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(dirent.name).toLowerCase())) continue;
    const realFile = await fs.realpath(absolutePath);
    if (!insideRoot(rootReal, realFile)) continue;
    const stats = await fs.lstat(realFile);
    if (!stats.isFile() || stats.size > MAX_EXTENSION_FILE_BYTES) continue;
    files.push({
      relativePath: path.relative(rootReal, realFile),
      absolutePath: realFile,
    });
    if (files.length > MAX_SKILL_FILES) {
      throw new SambaError(
        `A skill tem mais de ${MAX_SKILL_FILES} arquivos de texto.`,
        SambaErrorKind.Validation,
      );
    }
  }
  return files;
}

function withDescription(raw: string, description: string): string {
  const { body } = splitFrontmatter(raw);
  const frontmatter = `---\ndescription: ${JSON.stringify(description)}\n---\n`;
  return `${frontmatter}${body.replace(/^\n+/, "")}`;
}

/**
 * Copia uma skill descoberta para `<userData>/extensions/skills/<slug>/`.
 * O identificador vem de uma varredura nova: o renderer não escolhe o caminho.
 */
export async function importMachineSkill(options: {
  discoveryId: string;
  home?: string;
  roots?: readonly MachineSkillRoot[];
  userDataDirectory?: string;
}): Promise<{
  slug: string;
  relativePath: string;
  status: "installed" | "already-present";
}> {
  const roots = options.roots ?? machineSkillRoots(options.home);
  const source = await findSource(options.discoveryId, roots);
  const userData = options.userDataDirectory ?? getUserDataPath();
  const destination = path.resolve(
    userData,
    USER_EXTENSIONS_DIRECTORY,
    "skills",
    source.slug,
  );
  const extensionsRoot = path.resolve(userData, USER_EXTENSIONS_DIRECTORY);
  if (!insideRoot(extensionsRoot, destination)) {
    throw new SambaError(
      "O nome da skill escapa da pasta de extensões.",
      SambaErrorKind.Validation,
    );
  }
  const skillFile = path.join(destination, SKILL_FILE_NAME);
  try {
    const existing = await fs.lstat(skillFile);
    if (existing.isFile()) {
      return {
        slug: source.slug,
        relativePath: `skills/${source.slug}/${SKILL_FILE_NAME}`,
        status: "already-present",
      };
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  await fs.mkdir(destination, { recursive: true });
  if (source.singleFile) {
    const raw = await fs.readFile(source.singleFile, "utf8");
    await fs.writeFile(
      skillFile,
      withDescription(raw, source.description),
      "utf8",
    );
  } else {
    const files = await collectTextFiles(
      source.directoryReal,
      source.directoryReal,
      0,
    );
    const skill = files.find(
      (file) =>
        path.basename(file.absolutePath) === SKILL_FILE_NAME &&
        !file.relativePath.includes(`${path.sep}`),
    );
    if (!skill) {
      throw new SambaError(
        "A pasta da skill não tem SKILL.md na raiz.",
        SambaErrorKind.Validation,
      );
    }
    for (const file of files) {
      const target = path.resolve(destination, file.relativePath);
      if (!insideRoot(destination, target) && target !== destination) {
        throw new SambaError(
          "Um arquivo da skill aponta para fora da pasta de destino.",
          SambaErrorKind.Validation,
        );
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      const raw = await fs.readFile(file.absolutePath, "utf8");
      const contents =
        path.basename(file.relativePath) === SKILL_FILE_NAME &&
        file.relativePath === SKILL_FILE_NAME
          ? withDescription(raw, source.description)
          : raw;
      await fs.writeFile(target, contents, "utf8");
    }
  }

  return {
    slug: source.slug,
    relativePath: `skills/${source.slug}/${SKILL_FILE_NAME}`,
    status: "installed",
  };
}
