import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { DeliveryPlanSchema } from "../../delivery/model";
const record = z.object({
  appId: z.number(),
  revision: z.number(),
  plan: DeliveryPlanSchema,
});
const id = z.object({ appId: z.number().int().positive() });
export const deliveryContracts = {
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
