import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { ExtensionsListResultSchema } from "../../shared/extensions";
import {
  GameSkillInstallResultSchema,
  GameStudioSnapshotSchema,
} from "../../shared/game_studio";

/**
 * Extensões declarativas descobertas no disco (REQ-01/REQ-02).
 *
 * `appId` é opcional: sem ele, a listagem traz apenas o escopo do usuário
 * (`<userData>/extensions`); com ele, soma o escopo do projeto (`<app>/.samba`).
 */
export const extensionContracts = {
  list: defineContract({
    channel: "extensions:list",
    input: z.object({ appId: z.number().int().positive().optional() }),
    output: ExtensionsListResultSchema,
  }),
  gameStudio: defineContract({
    channel: "extensions:game-studio",
    input: z.object({}),
    output: GameStudioSnapshotSchema,
  }),
  importMachineSkill: defineContract({
    channel: "extensions:import-machine-skill",
    input: z.object({ discoveryId: z.string().trim().min(8).max(64) }),
    output: GameSkillInstallResultSchema,
  }),
  installGameSkill: defineContract({
    channel: "extensions:install-game-skill",
    input: z.object({
      slug: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    }),
    output: GameSkillInstallResultSchema,
  }),
};

export const extensionClient = createClient(extensionContracts);
