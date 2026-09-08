import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import {
  ManagementSchema,
  MetricsSchema,
  RateSchema,
  TimeEntrySchema,
} from "../../management/model";
const id = z.object({ appId: z.number().int().positive() });
const record = z.object({ revision: z.number(), data: ManagementSchema });
export const managementContracts = {
  get: defineContract({ channel: "management:get", input: id, output: record }),
  save: defineContract({
    channel: "management:save",
    input: id.extend({
      revision: z.number().int().nonnegative(),
      rates: z.array(RateSchema).max(100),
      timeEntries: z.array(TimeEntrySchema).max(5000),
    }),
    output: record,
  }),
  metrics: defineContract({
    channel: "management:metrics",
    input: id.extend({ sprintId: z.string().uuid().optional() }),
    output: MetricsSchema,
  }),
  start: defineContract({
    channel: "management:start",
    input: id.extend({
      revision: z.number().int().nonnegative(),
      name: z.string().trim().min(1).max(150),
    }),
    output: record,
  }),
  close: defineContract({
    channel: "management:close",
    input: id.extend({
      revision: z.number().int().nonnegative(),
      sprintId: z.string().uuid(),
    }),
    output: record,
  }),
};
export const managementClient = createClient(managementContracts);
