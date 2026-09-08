import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { NativeAgentSchema, NativeRunSchema } from "../../shared/native_agents";
const provider = z.object({ provider: NativeAgentSchema });
const run = z.object({ id: z.string().uuid() });
export const nativeAgentContracts = {
  status: defineContract({
    channel: "native-agents:status",
    input: z.void(),
    output: z.array(
      z.object({
        provider: NativeAgentSchema,
        installed: z.boolean(),
        path: z.string().optional(),
      }),
    ),
  }),
  selectExecutable: defineContract({
    channel: "native-agents:select-executable",
    input: provider,
    output: z.boolean(),
  }),
  login: defineContract({
    channel: "native-agents:login",
    input: provider,
    output: NativeRunSchema,
  }),
  start: defineContract({
    channel: "native-agents:start",
    input: provider.extend({
      appId: z.number().int().positive(),
      prompt: z.string().trim().min(1).max(100_000),
    }),
    output: NativeRunSchema,
  }),
  read: defineContract({
    channel: "native-agents:read",
    input: run,
    output: NativeRunSchema,
  }),
  respond: defineContract({
    channel: "native-agents:respond",
    input: run.extend({
      approvalId: z.string(),
      allow: z.boolean(),
      text: z.string().max(10_000).optional(),
    }),
    output: z.void(),
  }),
  loginInput: defineContract({
    channel: "native-agents:login-input",
    input: run.extend({ text: z.string().max(4000) }),
    output: z.void(),
  }),
  cancel: defineContract({
    channel: "native-agents:cancel",
    input: run,
    output: z.void(),
  }),
};
export const nativeAgentClient = createClient(nativeAgentContracts);
