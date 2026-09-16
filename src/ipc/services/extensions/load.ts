import * as fs from "node:fs/promises";
import path from "node:path";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import {
  MAX_EXTENSION_FILE_BYTES,
  type ExtensionEntry,
  type ExtensionKind,
} from "@/shared/extensions";
import { discoverExtensions, type ExtensionRoot } from "./discovery";
import { splitFrontmatter } from "./frontmatter";

export interface LoadedExtension {
  entry: ExtensionEntry;
  /** Corpo do arquivo sem o frontmatter — é o que o agente deve seguir. */
  body: string;
}

/** Extensões de um tipo, já validadas e ordenadas (ver `discoverExtensions`). */
export async function listExtensions(
  roots: readonly ExtensionRoot[],
  kind: ExtensionKind,
): Promise<ExtensionEntry[]> {
  const { entries } = await discoverExtensions(roots);
  return entries.filter((entry) => entry.kind === kind);
}

/**
 * Carrega o corpo de uma extensão **revalidando** a descoberta antes de ler o
 * arquivo: o slug vem do modelo, então nada é confiado. Além disso, o caminho é
 * confirmado dentro da raiz (um `relativePath` nunca deveria escapar, mas o
 * custo de conferir é zero) e o tamanho é limitado antes da leitura.
 */
export async function loadExtension(
  roots: readonly ExtensionRoot[],
  kind: ExtensionKind,
  slug: string,
): Promise<LoadedExtension> {
  // A descoberta sobre todas as raízes é quem resolve a precedência
  // (projeto substitui usuário). Escolher aqui "o primeiro que existir"
  // reintroduziria a regra num segundo lugar — e devolveria a versão errada.
  const { entries } = await discoverExtensions(roots);
  const entry = entries.find(
    (candidate) => candidate.kind === kind && candidate.slug === slug,
  );
  if (!entry) {
    throw new SambaError(
      `Extensão "${slug}" (${kind}) não encontrada.`,
      SambaErrorKind.NotFound,
    );
  }

  const root = roots.find((candidate) => candidate.scope === entry.scope);
  if (!root) {
    throw new SambaError(
      `Raiz da extensão "${slug}" não está mais disponível.`,
      SambaErrorKind.NotFound,
    );
  }

  const rootDirectory = path.resolve(root.directory);
  const absolutePath = path.resolve(rootDirectory, entry.relativePath);
  if (
    absolutePath !== rootDirectory &&
    !absolutePath.startsWith(rootDirectory + path.sep)
  ) {
    throw new SambaError(
      `Caminho de extensão fora da raiz: ${entry.relativePath}`,
      SambaErrorKind.Validation,
    );
  }

  let stats: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stats = await fs.lstat(absolutePath);
  } catch {
    throw new SambaError(
      `Arquivo da extensão não encontrado: ${entry.relativePath}`,
      SambaErrorKind.NotFound,
    );
  }
  if (!stats.isFile()) {
    throw new SambaError(
      `Arquivo da extensão não é um arquivo regular: ${entry.relativePath}`,
      SambaErrorKind.Validation,
    );
  }
  if (stats.size > MAX_EXTENSION_FILE_BYTES) {
    throw new SambaError(
      `Arquivo da extensão maior que ${Math.round(MAX_EXTENSION_FILE_BYTES / 1024)} KB: ${entry.relativePath}`,
      SambaErrorKind.Validation,
    );
  }

  const raw = await fs.readFile(absolutePath, "utf8");
  return { entry, body: splitFrontmatter(raw).body };
}
