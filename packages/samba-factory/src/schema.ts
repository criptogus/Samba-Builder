import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
export const ModeSchema = z.enum([
  "discover",
  "plan",
  "design",
  "build",
  "fix",
  "secure",
  "review",
  "ask",
]);
export type FactoryMode = z.infer<typeof ModeSchema>;
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: text,
  priority: z.enum(["must", "should", "could"]),
  acceptance: text,
  status: z.enum(["todo", "doing", "done"]).default("todo"),
});
export const PlanSchema = z.object({
  problem: text,
  users: text,
  stack: text,
  outOfScope: text,
  risks: text,
  tasks: z.array(TaskSchema).min(1).max(100),
});
export type FactoryPlan = z.infer<typeof PlanSchema>;
export const BrandSchema = z.object({
  name: text,
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  radius: z.enum(["4", "8", "16"]),
  font: z.enum(["Inter", "Geist", "system-ui"]),
});
export const FindingSchema = z.object({
  id: text,
  rule: text,
  severity: z.enum(["critical", "high", "medium", "info"]),
  file: text,
  line: z.number().int().nonnegative(),
  message: text,
  remediation: text,
});
export type Finding = z.infer<typeof FindingSchema>;
export const ScanSchema = z.object({
  at: z.string(),
  digest: z.string(),
  complete: z.boolean(),
  findings: z.array(FindingSchema),
  limitations: z.array(z.string()),
  typecheck: z.enum(["passed", "failed", "missing"]),
  smoke: z.enum(["passed", "failed", "missing"]),
  dependencies: z.enum(["passed", "failed", "unavailable"]),
});
export type FactoryScan = z.infer<typeof ScanSchema>;
export const ApprovalSchema = z.object({
  actor: text,
  at: z.string(),
  revision: z.number().int(),
});
export const ProjectSchema = z.object({
  appId: z.number().int().positive(),
  client: text,
  name: text,
  brief: z.string().max(30000),
  knowledge: z.string().max(20000).default(""),
  revision: z.number().int().nonnegative(),
  mode: ModeSchema,
  plan: PlanSchema.nullable(),
  approval: ApprovalSchema.nullable(),
  brand: BrandSchema.nullable(),
  brandApproval: ApprovalSchema.nullable(),
  scan: ScanSchema.nullable(),
  changes: z.array(
    z.object({
      id: z.string().uuid(),
      request: text,
      taskId: z.string().uuid().nullable(),
      status: z.enum(["pending", "in-scope", "change-request", "rejected"]),
      at: z.string(),
    }),
  ),
  audit: z.array(
    z.object({
      at: z.string(),
      actor: text,
      action: text,
      revision: z.number().int(),
    }),
  ),
});
export type FactoryProject = z.infer<typeof ProjectSchema>;
export const StoreSchema = z.object({
  version: z.literal(1),
  projects: z.array(ProjectSchema),
});
export type FactoryStore = z.infer<typeof StoreSchema>;
