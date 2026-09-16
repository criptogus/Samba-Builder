import { z } from "zod";

/**
 * Declarative, file-based extensions (Fase 0 do plano de paridade — ver
 * `plans/kilocode-parity-plan.md`, requisitos REQ-01/REQ-02).
 *
 * Um projeto guarda extensões em `<app>/.samba/{skills,commands,agents}/` e o
 * usuário em `<userData>/extensions/{skills,commands,agents}/`. Este módulo é a
 * fonte única dos tipos, limites e regras de validação: ele NÃO lê o disco (isso
 * é do processo main) para poder ser importado pelo preload sem arrastar I/O.
 */

export const EXTENSION_KINDS = ["skill", "command", "agent"] as const;
export type ExtensionKind = (typeof EXTENSION_KINDS)[number];
export const ExtensionKindSchema = z.enum(EXTENSION_KINDS);

/** Modos de chat existentes aos quais uma extensão pode se limitar. */
export const EXTENSION_MODES = ["local-agent", "build", "ask", "plan"] as const;
export type ExtensionMode = (typeof EXTENSION_MODES)[number];
export const ExtensionModeSchema = z.enum(EXTENSION_MODES);

export const EXTENSION_SCOPES = ["project", "user"] as const;
export type ExtensionScope = (typeof EXTENSION_SCOPES)[number];
export const ExtensionScopeSchema = z.enum(EXTENSION_SCOPES);

/** Limites defensivos: nada de ler um arquivo gigante nem um diretório infinito. */
export const MAX_EXTENSION_FILE_BYTES = 128 * 1024;
export const MAX_EXTENSIONS_PER_ROOT = 40;
export const MAX_EXTENSION_SLUG_LENGTH = 64;
export const EXTENSION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Frontmatter aceito nos arquivos `.md`. Chaves desconhecidas são rejeitadas de
 * propósito: um typo em `descriptoin:` não pode passar em silêncio.
 */
export const ExtensionFrontmatterSchema = z
  .object({
    description: z.string().trim().min(1).max(600).optional(),
    modes: z
      .array(ExtensionModeSchema)
      .min(1)
      .max(EXTENSION_MODES.length)
      .optional(),
    agent: ExtensionModeSchema.optional(),
    model: z.string().trim().min(1).max(200).optional(),
    subtask: z.boolean().optional(),
  })
  .strict();
export type ExtensionFrontmatter = z.infer<typeof ExtensionFrontmatterSchema>;

export const ExtensionEntrySchema = z.object({
  id: z.string(),
  kind: ExtensionKindSchema,
  scope: ExtensionScopeSchema,
  slug: z.string(),
  description: z.string(),
  modes: z.array(ExtensionModeSchema),
  agent: ExtensionModeSchema.nullable(),
  model: z.string().nullable(),
  subtask: z.boolean(),
  /** Caminho relativo à raiz, sempre com "/" — seguro para exibir na UI. */
  relativePath: z.string(),
  bytes: z.number().int().nonnegative(),
});
export type ExtensionEntry = z.infer<typeof ExtensionEntrySchema>;

export const EXTENSION_WARNING_CODES = [
  "invalid-frontmatter",
  "invalid-slug",
  "oversize",
  "too-many",
  "shadowed",
  "read-failed",
] as const;
export type ExtensionWarningCode = (typeof EXTENSION_WARNING_CODES)[number];
export const ExtensionWarningCodeSchema = z.enum(EXTENSION_WARNING_CODES);

export const ExtensionWarningSchema = z.object({
  code: ExtensionWarningCodeSchema,
  relativePath: z.string(),
  message: z.string(),
});
export type ExtensionWarning = z.infer<typeof ExtensionWarningSchema>;

export const ExtensionsListResultSchema = z.object({
  entries: z.array(ExtensionEntrySchema),
  warnings: z.array(ExtensionWarningSchema),
});
export type ExtensionsListResult = z.infer<typeof ExtensionsListResultSchema>;

export function extensionEntryId(
  kind: ExtensionKind,
  scope: ExtensionScope,
  slug: string,
): string {
  return `${kind}:${scope}:${slug}`;
}
