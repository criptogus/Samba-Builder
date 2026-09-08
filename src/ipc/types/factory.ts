import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import {
  BrandSchema,
  ModeSchema,
  PlanSchema,
  ProjectSchema,
} from "../../../packages/samba-factory/src/schema";
const identity = {
  appId: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
};
const actor = z.string().trim().min(2).max(120);
export const FactoryActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("brief"),
    brief: z.string().trim().min(1).max(30000),
    knowledge: z.string().max(20000),
  }),
  z.object({ type: z.literal("plan"), plan: PlanSchema }),
  z.object({ type: z.literal("approve-plan"), actor }),
  z.object({ type: z.literal("brand"), brand: BrandSchema, actor }),
  z.object({ type: z.literal("mode"), mode: ModeSchema }),
  z.object({
    type: z.literal("task"),
    taskId: z.string().uuid(),
    status: z.enum(["todo", "doing", "done"]),
  }),
  z.object({
    type: z.literal("request"),
    request: z.string().trim().min(1).max(2000),
  }),
  z.object({
    type: z.literal("resolve-request"),
    id: z.string().uuid(),
    status: z.enum(["in-scope", "change-request", "rejected"]),
    taskId: z.string().uuid().nullable(),
    actor,
  }),
]);
export type FactoryAction = z.infer<typeof FactoryActionSchema>;
export const factoryContracts = {
  list: defineContract({
    channel: "factory:list",
    input: z.void(),
    output: z.array(ProjectSchema),
  }),
  enroll: defineContract({
    channel: "factory:enroll",
    input: z.object({
      appId: identity.appId,
      client: z.string().trim().min(1).max(120),
    }),
    output: ProjectSchema,
  }),
  update: defineContract({
    channel: "factory:update",
    input: z.object({ ...identity, action: FactoryActionSchema }),
    output: ProjectSchema,
  }),
  scan: defineContract({
    channel: "factory:scan",
    input: z.object(identity),
    output: ProjectSchema,
  }),
  export: defineContract({
    channel: "factory:export",
    input: z.object(identity),
    output: z.array(z.string()),
  }),
  gate: defineContract({
    channel: "factory:gate",
    input: z.object({ appId: identity.appId }),
    output: z.array(z.string()),
  }),
};
export const factoryClient = createClient(factoryContracts);
