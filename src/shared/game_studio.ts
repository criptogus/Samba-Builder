import { z } from "zod";

/**
 * Contratos do construtor de jogos: skills que já vêm com o app, skills
 * encontradas no computador e o que o estúdio pode usar localmente.
 * Sem leitura de disco — o processo main preenche os dados.
 */

export const GAME_SKILL_INSTALL_STATUSES = [
  "installed",
  "already-present",
] as const;

export const GameSkillInstallResultSchema = z.object({
  slug: z.string(),
  status: z.enum(GAME_SKILL_INSTALL_STATUSES),
  relativePath: z.string(),
});
export type GameSkillInstallResult = z.infer<
  typeof GameSkillInstallResultSchema
>;

export const BundledGameSkillSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  installed: z.boolean(),
});
export type BundledGameSkill = z.infer<typeof BundledGameSkillSchema>;

export const DiscoveredMachineSkillSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  origin: z.string(),
  installed: z.boolean(),
  importable: z.boolean(),
  blockedReason: z.string().nullable(),
});
export type DiscoveredMachineSkill = z.infer<
  typeof DiscoveredMachineSkillSchema
>;

export const GameComputerProgramSchema = z.object({
  id: z.string(),
  label: z.string(),
  available: z.boolean(),
});
export type GameComputerProgram = z.infer<typeof GameComputerProgramSchema>;

export const GameStudioSnapshotSchema = z.object({
  bundled: z.array(BundledGameSkillSchema),
  discovered: z.array(DiscoveredMachineSkillSchema),
  computer: z.array(GameComputerProgramSchema),
});
export type GameStudioSnapshot = z.infer<typeof GameStudioSnapshotSchema>;
