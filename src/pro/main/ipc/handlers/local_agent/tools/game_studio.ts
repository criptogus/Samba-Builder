import { z } from "zod";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { installBundledGameSkill } from "@/ipc/services/game_studio/bundled_skills";
import { formatGameComputer } from "@/ipc/services/game_studio/computer";
import { importMachineSkill } from "@/ipc/services/game_studio/machine_skills";
import { readGameStudioSnapshot } from "@/ipc/services/game_studio/snapshot";
import { ToolDefinition } from "./types";

const importGameSkillSchema = z.object({
  discovery_id: z
    .string()
    .trim()
    .min(8)
    .max(64)
    .optional()
    .describe(
      "Identificador devolvido por inspect_game_computer para uma skill achada no computador.",
    ),
  bundled_slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .describe(
      "Slug de uma skill de jogo que já vem com o Samba, se ela tiver sido apagada.",
    ),
});

/**
 * Importa uma skill sem terminal: ou a cópia local (Claude, Codex, Cursor,
 * pasta da pessoa) ou uma skill de jogo que acompanha o app.
 */
export const importGameSkillTool: ToolDefinition<
  z.infer<typeof importGameSkillSchema>
> = {
  name: "import_game_skill",
  description:
    "Copy a skill found on this computer into Samba, or restore a bundled game skill. Never ask the user to download files or run a terminal command. Call inspect_game_computer first and pass its discovery_id.",
  inputSchema: importGameSkillSchema,
  defaultConsent: "ask",
  modifiesState: true,
  mutationTracking: "none",
  requiresBlueprintApproval: false,
  getConsentPreview: (args) =>
    args.discovery_id
      ? `Importar skill do computador (${args.discovery_id})`
      : `Restaurar skill de jogo ${args.bundled_slug ?? ""}`.trim(),
  execute: async (args) => {
    if (Boolean(args.discovery_id) === Boolean(args.bundled_slug)) {
      throw new SambaError(
        "Informe discovery_id ou bundled_slug, um só.",
        SambaErrorKind.Validation,
      );
    }
    if (args.bundled_slug) {
      const result = await installBundledGameSkill(args.bundled_slug);
      const verb =
        result.status === "installed" ? "instalada" : "já estava instalada";
      return `Skill "${result.slug}" ${verb} em ${result.relativePath}. Carregue com load_skill.`;
    }
    const result = await importMachineSkill({
      discoveryId: args.discovery_id ?? "",
    });
    const verb =
      result.status === "installed" ? "importada" : "já estava importada";
    return `Skill "${result.slug}" ${verb} em ${result.relativePath}. Carregue com load_skill.`;
  },
};

export const inspectGameComputerTool: ToolDefinition<Record<string, never>> = {
  name: "inspect_game_computer",
  description:
    "See which local game programs are installed and which skills were found on this computer but are not imported into Samba yet. Read-only.",
  inputSchema: z.object({}),
  defaultConsent: "always",
  getConsentPreview: () => "Ver programas e skills do computador",
  execute: async () => {
    const snapshot = await readGameStudioSnapshot();
    const installed = snapshot.bundled
      .filter((skill) => skill.installed)
      .map((skill) => skill.slug)
      .join(", ");
    const pending = snapshot.discovered.filter((skill) => !skill.installed);
    const pendingLines =
      pending.length === 0
        ? "Nenhuma skill nova nas pastas do computador."
        : pending
            .map(
              (skill) =>
                `- ${skill.slug} (${skill.origin}) id=${skill.id}: ${skill.description}`,
            )
            .join("\n");
    return [
      "Programas locais:",
      formatGameComputer(snapshot.computer),
      "",
      `Skills de jogo já no Samba: ${installed || "(nenhuma)"}`,
      "Skills do computador ainda não importadas:",
      pendingLines,
      "",
      "Importe com import_game_skill e o discovery_id. Não peça terminal ao usuário.",
    ].join("\n");
  },
};
