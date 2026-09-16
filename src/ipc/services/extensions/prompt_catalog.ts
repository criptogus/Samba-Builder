import { buildExtensionCatalog } from "./catalog";
import { listExtensions } from "./load";
import { resolveExtensionRoots } from "./roots";

/**
 * Catálogo de skills publicado no prompt do turno (REQ-03).
 *
 * Só metadados: nome, escopo, descrição e modos. O corpo vem sob demanda pela
 * tool `load_skill`. O teto existe porque o prompt é pago em tokens em toda
 * chamada — um diretório com 200 skills não pode virar 200 linhas fixas.
 */
export const MAX_SKILLS_IN_PROMPT = 20;

export async function buildSkillCatalogBlock(
  projectDirectory: string | null,
): Promise<string> {
  const skills = await listExtensions(
    resolveExtensionRoots(projectDirectory),
    "skill",
  );
  if (skills.length === 0) return "";

  const catalog = buildExtensionCatalog(skills, "skill", {
    header: "Skills available for this app (call load_skill to read one):",
  });
  const hidden = skills.length - MAX_SKILLS_IN_PROMPT;
  if (hidden <= 0) return catalog;

  const visible = buildExtensionCatalog(
    skills.slice(0, MAX_SKILLS_IN_PROMPT),
    "skill",
    { header: "Skills available for this app (call load_skill to read one):" },
  );
  return `${visible}\n…and ${hidden} more (use load_skill without arguments to list all).`;
}
