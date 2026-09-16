import * as fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import {
  EXTENSION_KINDS,
  EXTENSION_SLUG_PATTERN,
  MAX_EXTENSIONS_PER_ROOT,
  MAX_EXTENSION_FILE_BYTES,
  MAX_EXTENSION_SLUG_LENGTH,
  extensionEntryId,
  type ExtensionEntry,
  type ExtensionKind,
  type ExtensionScope,
  type ExtensionWarning,
} from "@/shared/extensions";
import { parseExtensionFrontmatter } from "./frontmatter";

/** Subpasta lida dentro de cada raiz de extensões. */
export const EXTENSION_KIND_DIRECTORIES: Record<ExtensionKind, string> = {
  skill: "skills",
  command: "commands",
  agent: "agents",
};

/** Formato portátil de skill: `<slug>/SKILL.md`. */
export const SKILL_FILE_NAME = "SKILL.md";

export interface ExtensionRoot {
  scope: ExtensionScope;
  /** Diretório que contém `skills/`, `commands/` e `agents/`. */
  directory: string;
}

export interface DiscoverExtensionsResult {
  entries: ExtensionEntry[];
  warnings: ExtensionWarning[];
}

interface Candidate {
  kind: ExtensionKind;
  scope: ExtensionScope;
  slug: string;
  relativePath: string;
  absolutePath: string;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Retorna o tamanho apenas de arquivos regulares; links simbólicos dão `null`. */
async function statRegularFile(filePath: string): Promise<number | null> {
  try {
    const stats = await fs.lstat(filePath);
    return stats.isFile() ? stats.size : null;
  } catch {
    return null;
  }
}

async function readCandidates(
  root: ExtensionRoot,
  kind: ExtensionKind,
  warnings: ExtensionWarning[],
): Promise<Candidate[]> {
  const directoryName = EXTENSION_KIND_DIRECTORIES[kind];
  const directory = path.join(root.directory, directoryName);

  let dirents: Dirent[];
  try {
    dirents = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) return [];
    warnings.push({
      code: "read-failed",
      relativePath: directoryName,
      message: `Não foi possível ler ${directoryName}: ${errorMessage(error)}`,
    });
    return [];
  }

  const sorted = [...dirents].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  const candidates: Candidate[] = [];
  for (const dirent of sorted) {
    if (dirent.name.startsWith(".")) continue;
    // Nunca seguir links: um symlink poderia apontar para fora do projeto.
    if (dirent.isSymbolicLink()) continue;

    if (dirent.isFile() && dirent.name.toLowerCase().endsWith(".md")) {
      candidates.push({
        kind,
        scope: root.scope,
        slug: dirent.name.slice(0, -3),
        relativePath: `${directoryName}/${dirent.name}`,
        absolutePath: path.join(directory, dirent.name),
      });
      continue;
    }

    if (dirent.isDirectory() && kind === "skill") {
      const nestedPath = path.join(directory, dirent.name, SKILL_FILE_NAME);
      if ((await statRegularFile(nestedPath)) !== null) {
        candidates.push({
          kind,
          scope: root.scope,
          slug: dirent.name,
          relativePath: `${directoryName}/${dirent.name}/${SKILL_FILE_NAME}`,
          absolutePath: nestedPath,
        });
      }
    }
  }
  return candidates;
}

async function readExtension(
  candidate: Candidate,
): Promise<{ entry: ExtensionEntry } | { warning: ExtensionWarning }> {
  const { kind, slug, relativePath, absolutePath } = candidate;
  if (
    !EXTENSION_SLUG_PATTERN.test(slug) ||
    slug.length > MAX_EXTENSION_SLUG_LENGTH
  ) {
    return {
      warning: {
        code: "invalid-slug",
        relativePath,
        message: `"${slug}" não é um nome válido: use minúsculas, números e hífens.`,
      },
    };
  }

  const bytes = await statRegularFile(absolutePath);
  if (bytes === null) {
    return {
      warning: {
        code: "read-failed",
        relativePath,
        message: "Arquivo ausente ou não é um arquivo regular.",
      },
    };
  }
  if (bytes > MAX_EXTENSION_FILE_BYTES) {
    return {
      warning: {
        code: "oversize",
        relativePath,
        message: `Arquivo maior que ${Math.round(MAX_EXTENSION_FILE_BYTES / 1024)} KB.`,
      },
    };
  }

  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    return {
      warning: {
        code: "read-failed",
        relativePath,
        message: `Não foi possível ler o arquivo: ${errorMessage(error)}`,
      },
    };
  }

  const parsed = parseExtensionFrontmatter(raw);
  if (!parsed.ok) {
    return {
      warning: {
        code: "invalid-frontmatter",
        relativePath,
        message: parsed.message,
      },
    };
  }

  const description = parsed.data.description ?? "";
  if (kind === "skill" && !description) {
    return {
      warning: {
        code: "invalid-frontmatter",
        relativePath,
        message:
          'Skill sem "description": sem ela o agente não consegue descobrir a skill.',
      },
    };
  }

  return {
    entry: {
      id: extensionEntryId(kind, candidate.scope, slug),
      kind,
      scope: candidate.scope,
      slug,
      description,
      modes: parsed.data.modes ?? [],
      agent: parsed.data.agent ?? null,
      model: parsed.data.model ?? null,
      subtask: parsed.data.subtask ?? false,
      relativePath,
      bytes,
    },
  };
}

function compareEntries(a: ExtensionEntry, b: ExtensionEntry): number {
  const kindDelta =
    EXTENSION_KINDS.indexOf(a.kind) - EXTENSION_KINDS.indexOf(b.kind);
  if (kindDelta !== 0) return kindDelta;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/**
 * Descobre extensões declarativas em uma ou mais raízes (usuário e projeto).
 *
 * Nunca lança por conteúdo inválido: frontmatter errado, nome ruim, arquivo
 * grande demais ou ilegível vira um aviso e é ignorado. Extensão de projeto
 * substitui a de usuário com o mesmo nome, registrando um aviso.
 */
export async function discoverExtensions(
  roots: readonly ExtensionRoot[],
): Promise<DiscoverExtensionsResult> {
  const found: ExtensionEntry[] = [];
  const warnings: ExtensionWarning[] = [];

  for (const root of roots) {
    for (const kind of EXTENSION_KINDS) {
      const candidates = await readCandidates(root, kind, warnings);
      let accepted = 0;
      for (const candidate of candidates) {
        if (accepted >= MAX_EXTENSIONS_PER_ROOT) {
          warnings.push({
            code: "too-many",
            relativePath: EXTENSION_KIND_DIRECTORIES[kind],
            message: `Limite de ${MAX_EXTENSIONS_PER_ROOT} extensões por pasta atingido; as demais foram ignoradas.`,
          });
          break;
        }
        const result = await readExtension(candidate);
        if ("warning" in result) {
          warnings.push(result.warning);
          continue;
        }
        found.push(result.entry);
        accepted += 1;
      }
    }
  }

  const byName = new Map<string, ExtensionEntry>();
  for (const entry of found) {
    const key = `${entry.kind}:${entry.slug}`;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, entry);
      continue;
    }
    const winner = entry.scope === "project" ? entry : existing;
    const loser = winner === entry ? existing : entry;
    warnings.push({
      code: "shadowed",
      relativePath: loser.relativePath,
      message: `"${key}" do escopo ${loser.scope} foi substituída pela versão de escopo ${winner.scope}.`,
    });
    byName.set(key, winner);
  }

  return {
    entries: [...byName.values()].sort(compareEntries),
    warnings,
  };
}
