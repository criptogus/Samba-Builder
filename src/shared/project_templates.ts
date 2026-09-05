import { z } from "zod";
export const TEAM_TEMPLATE_REPO = "criptogus/Samba-Builder";
export const TEAM_TEMPLATE_URL = `https://github.com/${TEAM_TEMPLATE_REPO}`;
export const TEAM_TEMPLATE_DIRECTORY = "samba-templates";
export const TemplateDraftInputSchema = z.object({
  appId: z.number().int().positive(),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1000),
});
export const TemplateIdSchema = z.string().uuid();
export const TemplateFileSchema = z.object({
  path: z.string().min(1).max(500),
  size: z.number().int().nonnegative().max(20_000_000),
  executable: z.boolean(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export const TemplateDraftSchema = TemplateDraftInputSchema.omit({
  appId: true,
}).extend({
  id: TemplateIdSchema,
  files: z.array(TemplateFileSchema).min(1).max(1000),
  excluded: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export const TeamTemplateEntrySchema = TemplateDraftSchema.omit({
  files: true,
  excluded: true,
}).extend({
  treeSha: z.string().regex(/^[a-f0-9]{40}$/),
});
export const TeamTemplateIndexSchema = z.object({
  version: z.literal(1),
  templates: z.array(TeamTemplateEntrySchema).max(500),
});
export type TemplateDraft = z.infer<typeof TemplateDraftSchema>;
export type TeamTemplateEntry = z.infer<typeof TeamTemplateEntrySchema>;
export function teamTemplateId(id: string) {
  return `team:${id}`;
}
