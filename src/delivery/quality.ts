import { z } from "zod";
export const qualityKinds = [
  "secrets",
  "dependencies",
  "accessibility",
  "performance",
  "visual",
] as const;
export const QualityKindSchema = z.enum(qualityKinds);
export const RequirementSchema = z.object({
  id: z.string().max(44),
  category: z.enum(["journey", "authorization", "recovery", "load"]).optional(),
  codePaths: z.array(z.string().max(300)).max(20).optional(),
  title: z.string().trim().max(300),
  acceptance: z.string().trim().max(3000),
  testExecutionId: z.string().uuid().optional(),
});
export const EngineeringPolicySchema = z.object({
  version: z.literal(1),
  profile: z.enum(["public", "private", "critical"]),
  requirements: z
    .array(RequirementSchema)
    .max(150)
    .refine(
      (r) => new Set(r.map((v) => v.id)).size === r.length,
      "IDs de requisitos duplicados",
    ),
  peakUsers: z.number().int().min(1).max(1000000000),
  availabilityPercent: z.number().min(0).max(100),
  recoveryMinutes: z.number().int().min(0),
  dataLossMinutes: z.number().int().min(0),
  monthlyBudgetUSD: z.number().min(0),
  maxLcpMs: z.number().min(100).max(60000),
  maxCls: z.number().min(0).max(1),
  architectureEvidence: z.string().trim().max(5000),
  usabilityEvidence: z.string().trim().max(5000),
});
export const QualityReportSchema = z.object({
  status: z.enum(["passed", "failed", "inconclusive"]),
  summary: z.string().max(1000),
  findings: z
    .array(
      z.object({
        file: z.string().max(500),
        line: z.number().optional(),
        rule: z.string().max(200),
      }),
    )
    .max(100),
  metrics: z.record(z.string(), z.number()).optional(),
});
export type QualityKind = z.infer<typeof QualityKindSchema>;
