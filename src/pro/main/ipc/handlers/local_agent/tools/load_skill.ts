import { z } from "zod";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import {
  EXTENSION_SLUG_PATTERN,
  MAX_EXTENSION_SLUG_LENGTH,
} from "@/shared/extensions";
import { resolveExtensionRoots } from "@/ipc/services/extensions/roots";
import { listExtensions, loadExtension } from "@/ipc/services/extensions/load";
import { ToolDefinition } from "./types";

const loadSkillSchema = z.object({
  skill: z
    .string()
    .trim()
    .min(1)
    .max(MAX_EXTENSION_SLUG_LENGTH)
    .optional()
    .describe(
      "Slug da skill a carregar (ex.: 'revisar-login'). Omita para listar as skills disponíveis.",
    ),
});

/**
 * Skills sob demanda (REQ-03 do plano de paridade).
 *
 * O projeto guarda skills em `.samba/skills/` e o usuário em
 * `<userData>/extensions/skills/`. O agente vê apenas este catálogo e carrega o
 * corpo da skill que realmente casa com a tarefa — em vez de receber todas as
 * instruções no prompt. As skills não concedem ferramentas nem permissões.
 */
export const loadSkillTool: ToolDefinition<z.infer<typeof loadSkillSchema>> = {
  name: "load_skill",
  description:
    "Read the full instructions of a skill available in this project or on the user's machine. Call it without `skill` to list what is available, then load only the skill whose description matches the current task.",
  inputSchema: loadSkillSchema,
  defaultConsent: "always",

  getConsentPreview: (args) =>
    args.skill ? `Load skill: ${args.skill}` : "List available skills",

  execute: async (args, ctx) => {
    const roots = resolveExtensionRoots(ctx.appPath);

    if (!args.skill) {
      const skills = await listExtensions(roots, "skill");
      if (skills.length === 0) {
        return "No skills are available in this project or on this machine.";
      }
      return [
        "Available skills:",
        ...skills.map((skill) => {
          const modes =
            skill.modes.length > 0 ? ` [modes: ${skill.modes.join(", ")}]` : "";
          return `- ${skill.slug} (${skill.scope}): ${skill.description}${modes}`;
        }),
      ].join("\n");
    }

    if (!EXTENSION_SLUG_PATTERN.test(args.skill)) {
      throw new SambaError(
        `"${args.skill}" is not a valid skill name: use lowercase letters, numbers and hyphens.`,
        SambaErrorKind.Validation,
      );
    }

    try {
      const { entry, body } = await loadExtension(roots, "skill", args.skill);
      return [
        `Skill "${entry.slug}" (${entry.scope} · ${entry.relativePath}):`,
        "<instructions>",
        body,
        "</instructions>",
      ].join("\n");
    } catch (error) {
      if (
        error instanceof SambaError &&
        error.kind === SambaErrorKind.NotFound
      ) {
        const skills = await listExtensions(roots, "skill");
        const available = skills.map((skill) => skill.slug).join(", ");
        throw new SambaError(
          `Skill "${args.skill}" not found. Available skills: ${available || "(none)"}`,
          SambaErrorKind.NotFound,
        );
      }
      throw error;
    }
  },
};
