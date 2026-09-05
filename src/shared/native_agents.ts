import { z } from "zod";
export const NativeAgentSchema = z.enum(["codex", "claude", "grok"]);
export type NativeAgent = z.infer<typeof NativeAgentSchema>;
export const NATIVE_AGENTS = [
  {
    id: "codex",
    name: "Codex",
    installUrl: "https://developers.openai.com/codex/cli/",
  },
  {
    id: "claude",
    name: "Claude Code",
    installUrl: "https://code.claude.com/docs/en/setup",
  },
  { id: "grok", name: "Grok Build", installUrl: "https://x.ai/cli" },
] as const;
export const NativeRunSchema = z.object({
  id: z.string().uuid(),
  provider: NativeAgentSchema,
  phase: z.enum([
    "starting",
    "running",
    "approval",
    "cancelling",
    "completed",
    "failed",
    "cancelled",
  ]),
  kind: z.enum(["login", "task"]),
  output: z.string(),
  error: z.string().optional(),
  approval: z
    .object({
      id: z.string(),
      title: z.string(),
      detail: z.string(),
      question: z.boolean(),
    })
    .optional(),
});
export type NativeRun = z.infer<typeof NativeRunSchema>;
