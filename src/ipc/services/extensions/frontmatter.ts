import { parse as parseYaml } from "yaml";
import {
  ExtensionFrontmatterSchema,
  type ExtensionFrontmatter,
} from "@/shared/extensions";

export type FrontmatterParseResult =
  | { ok: true; data: ExtensionFrontmatter; body: string }
  | { ok: false; message: string };

const DELIMITER = "---";

/**
 * Separa o frontmatter YAML do corpo. Só um `---` na primeira linha abre o
 * bloco, e ele precisa ser fechado por outro `---`; caso contrário o arquivo é
 * tratado como corpo puro (sem frontmatter), que é o caso da maioria dos
 * comandos simples.
 *
 * As quebras de linha (LF e CRLF) são normalizadas para LF, para que o mesmo
 * arquivo produza o mesmo corpo em macOS, Linux e Windows.
 */
export function splitFrontmatter(raw: string): {
  frontmatter: string;
  body: string;
} {
  const withoutBom = raw.replace(/^\uFEFF/, "");
  const lines = withoutBom.split(/\r?\n/);
  if (lines[0]?.trim() !== DELIMITER) {
    return { frontmatter: "", body: withoutBom };
  }
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === DELIMITER,
  );
  if (closingIndex === -1) {
    return { frontmatter: "", body: withoutBom };
  }
  return {
    frontmatter: lines.slice(1, closingIndex).join("\n"),
    body: lines
      .slice(closingIndex + 1)
      .join("\n")
      .replace(/^\n+/, ""),
  };
}

export function parseExtensionFrontmatter(raw: string): FrontmatterParseResult {
  const { frontmatter, body } = splitFrontmatter(raw);
  if (!frontmatter.trim()) {
    return { ok: true, data: {}, body };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(frontmatter);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Frontmatter não é um YAML válido: ${detail}`,
    };
  }

  const result = ExtensionFrontmatterSchema.safeParse(parsed ?? {});
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) =>
        issue.path.length > 0
          ? `${issue.path.join(".")}: ${issue.message}`
          : issue.message,
      )
      .join("; ");
    return { ok: false, message: `Frontmatter inválido: ${detail}` };
  }

  return { ok: true, data: result.data, body };
}
