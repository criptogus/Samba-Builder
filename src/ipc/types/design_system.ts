import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// =============================================================================
// Design System Toolkit schemas
// =============================================================================
//
// These contracts drive the Samba Builder "Design System Toolkit" (CLI at
// `samba/design-system/design.py`): list saved design-system templates, extract
// the current app's design system and save it as a template, and apply a saved
// template back onto a project.

export const DesignSystemTemplateSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  savedAt: z.string(),
  /** Source project the template was extracted from (may be empty). */
  from: z.string(),
});

export type DesignSystemTemplate = z.infer<typeof DesignSystemTemplateSchema>;

export const ListDesignSystemsResultSchema = z.object({
  templates: z.array(DesignSystemTemplateSchema),
});

export type ListDesignSystemsResult = z.infer<
  typeof ListDesignSystemsResultSchema
>;

export const ExtractDesignSystemParamsSchema = z.object({
  appId: z.number(),
  name: z.string().trim().min(1, "A name is required"),
});

export type ExtractDesignSystemParams = z.infer<
  typeof ExtractDesignSystemParamsSchema
>;

export const ExtractDesignSystemResultSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export type ExtractDesignSystemResult = z.infer<
  typeof ExtractDesignSystemResultSchema
>;

export const ApplyDesignSystemParamsSchema = z.object({
  appId: z.number(),
  slug: z.string().trim().min(1, "A template is required"),
});

export type ApplyDesignSystemParams = z.infer<
  typeof ApplyDesignSystemParamsSchema
>;

export const ApplyDesignSystemResultSchema = z.object({
  slug: z.string(),
  /** Absolute path of the globals.css the template was written to. */
  appliedPath: z.string(),
});

export type ApplyDesignSystemResult = z.infer<
  typeof ApplyDesignSystemResultSchema
>;

// =============================================================================
// Design System contracts
// =============================================================================

export const designSystemContracts = {
  listTemplates: defineContract({
    channel: "design-system:list-templates",
    input: z.void(),
    output: ListDesignSystemsResultSchema,
  }),
  extractTemplate: defineContract({
    channel: "design-system:extract",
    input: ExtractDesignSystemParamsSchema,
    output: ExtractDesignSystemResultSchema,
  }),
  applyTemplate: defineContract({
    channel: "design-system:apply",
    input: ApplyDesignSystemParamsSchema,
    output: ApplyDesignSystemResultSchema,
  }),
} as const;

// =============================================================================
// Design System client
// =============================================================================

export const designSystemClient = createClient(designSystemContracts);
