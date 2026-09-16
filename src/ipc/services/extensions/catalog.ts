import type { ExtensionEntry, ExtensionKind } from "@/shared/extensions";

/**
 * Formato único, visível ao modelo, para extensões (REQ-21).
 *
 * Catálogo, tool de carregamento e UI falam do mesmo jeito porque todos passam
 * por aqui. Sem isso, cada lugar inventa sua linha e o modelo vê duas verdades
 * para a mesma skill.
 */

const KIND_LABELS: Record<ExtensionKind, string> = {
  skill: "skill",
  command: "command",
  agent: "agent",
};

export function formatExtensionSummary(entry: ExtensionEntry): string {
  const modes =
    entry.modes.length > 0 ? ` [modes: ${entry.modes.join(", ")}]` : "";
  const description = entry.description || "(no description)";
  return `- ${entry.slug} (${KIND_LABELS[entry.kind]} · ${entry.scope}): ${description}${modes}`;
}

/** Catálogo ordenado por nome — o que o modelo recebe antes de decidir carregar. */
export function buildExtensionCatalog(
  entries: readonly ExtensionEntry[],
  kind: ExtensionKind,
  options?: { header?: string },
): string {
  const selected = entries
    .filter((entry) => entry.kind === kind)
    .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  if (selected.length === 0) return "";

  const header = options?.header ?? `Available ${KIND_LABELS[kind]}s:`;
  return [header, ...selected.map(formatExtensionSummary)].join("\n");
}

/** Corpo carregado de uma extensão, no mesmo formato para catálogo e tool. */
export function formatExtensionBody(
  entry: ExtensionEntry,
  body: string,
): string {
  return [
    `${KIND_LABELS[entry.kind]} "${entry.slug}" (${entry.scope} · ${entry.relativePath}):`,
    "<instructions>",
    body,
    "</instructions>",
  ].join("\n");
}
