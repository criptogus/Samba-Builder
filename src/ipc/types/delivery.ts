import { QualityKindSchema, QualityReportSchema } from "../../delivery/quality";
import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { DeliveryPlanSchema } from "../../delivery/model";
const record = z.object({
  appId: z.number(),
  revision: z.number(),
  plan: DeliveryPlanSchema,
});
const id = z.object({ appId: z.number().int().positive() });
const qualityRun = z.object({
  id: z.string(),
  kind: z.string(),
  commit: z.string().nullable(),
  createdAt: z.number(),
  toolVersion: z.string(),
  report: QualityReportSchema,
});
export const deliveryContracts = {
  installQuality: defineContract({
    channel: "delivery:install-quality",
    input: z.void(),
    output: z.void(),
  }),
  cancelQuality: defineContract({
    channel: "delivery:cancel-quality",
    input: z.void(),
    output: z.void(),
  }),
  qualityRuns: defineContract({
    channel: "delivery:quality-runs",
    input: id,
    output: z.array(qualityRun),
  }),
  runQuality: defineContract({
    channel: "delivery:run-quality",
    input: id.extend({
      kind: QualityKindSchema,
      maxLcpMs: z.number().min(100).max(60000),
      maxCls: z.number().min(0).max(1),
    }),
    output: qualityRun,
  }),
  qualityArtifacts: defineContract({
    channel: "delivery:quality-artifacts",
    input: id.extend({ id: z.string().uuid(), approve: z.boolean() }),
    output: z.void(),
  }),
  testEvidence: defineContract({
    channel: "delivery:test-evidence",
    input: id,
    output: z.array(
      z.object({
        id: z.string(),
        startedAt: z.number(),
        finishedAt: z.number(),
        commit: z.string().nullable(),
        source: z.string(),
        status: z.string(),
        passed: z.number(),
        failed: z.number(),
        inconclusive: z.number(),
        files: z.number(),
      }),
    ),
  }),
  foundation: defineContract({
    channel: "delivery:foundation",
    input: id,
    output: z.object({
      required: z.boolean(),
      documents: z.array(
        z.object({ file: z.string(), digest: z.string(), issue: z.string() }),
      ),
    }),
  }),
  approvals: defineContract({
    channel: "delivery:approvals",
    input: id,
    output: z.array(
      z.object({
        id: z.number(),
        revision: z.number(),
        commit: z.string(),
        reviewer: z.string(),
        note: z.string(),
        createdAt: z.date(),
      }),
    ),
  }),
  usage: defineContract({
    channel: "delivery:usage",
    input: id,
    output: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
  }),
  get: defineContract({ channel: "delivery:get", input: id, output: record }),
  list: defineContract({
    channel: "delivery:list",
    input: z.void(),
    output: z.array(
      z.object({
        appId: z.number(),
        revision: z.number(),
        plan: z.object({
          owner: z.string(),
          dueDate: z.string(),
          stage: DeliveryPlanSchema.shape.stage,
          tasks: z.array(
            z.object({ status: z.enum(["todo", "doing", "blocked", "done"]) }),
          ),
        }),
      }),
    ),
  }),
  save: defineContract({
    channel: "delivery:save",
    invalidates: () => [{ family: "delivery" }],
    input: id.extend({
      revision: z.number().int().min(0),
      plan: DeliveryPlanSchema,
    }),
    output: record,
  }),
  snapshot: defineContract({
    channel: "delivery:snapshot",
    input: id,
    output: z.string(),
  }),
};
export const deliveryClient = createClient(deliveryContracts);
