import { z } from "zod";
import path from "node:path";
import type { AgentContext, ToolDefinition } from "./types";
import { escapeXmlAttr, escapeXmlContent } from "./types";
import { runBufferedProcess } from "@/ipc/utils/buffered_process";
import { getPackageManagerCommandEnv } from "@/ipc/utils/socket_firewall";
import { prependPathSegment } from "@/ipc/utils/managed_tools";

const REPO_COMMAND_TIMEOUT_MS = 5 * 60 * 1000;
const REPO_COMMAND_MAX_OUTPUT_BYTES = 200_000;

const runRepoCommandSchema = z.object({
  command: z
    .string()
    .describe(
      "The verification command to run in the repository (the repo's own " +
        "command — e.g. 'npm test', 'pnpm lint', 'python3 -m pytest', " +
        "'cargo test'). Use the repository's real verification command, never " +
        "the scaffold's.",
    ),
});

const description = `Run a verification command of the EXISTING repository you are working on (an imported app — not the scaffold). This is how you verify changes in a repo whose stack is not the Samba Builder scaffold:

- Discover the repo's own commands first by reading its manifests (package.json scripts, pyproject.toml, etc.)
- Prefer the repo's existing test/lint/typecheck scripts; run them with the package manager the repo uses (npm/pnpm/yarn/python/cargo/...)
- Run verification BEFORE and AFTER every change; never leave the repo in a broken state, even mid-task
- One verification at a time; keep the command focused on what you changed when possible
- The command runs in the repository directory with the user's Node runtime on PATH

This tool is for verification only (tests, lint, typecheck). Do not use it to install dependencies or mutate the repo outside verification.`;

export const runRepoCommandTool: ToolDefinition<
  z.infer<typeof runRepoCommandSchema>
> = {
  name: "run_repo_command",
  description,
  inputSchema: runRepoCommandSchema,
  defaultConsent: "always",

  getConsentPreview: (args) => `Run in repo: ${args.command}`,

  execute: async ({ command }, ctx: AgentContext) => {
    ctx.onXmlStream(
      `<samba-status title="${escapeXmlAttr(`Running: ${command}`)}"></samba-status>`,
    );

    const result = await runBufferedProcess({
      command,
      cwd: ctx.appPath,
      env: prependPathSegment(
        getPackageManagerCommandEnv(),
        path.join(ctx.appPath, "node_modules", ".bin"),
      ),
      timeoutMs: REPO_COMMAND_TIMEOUT_MS,
      maxOutputBytes: REPO_COMMAND_MAX_OUTPUT_BYTES,
    });

    const output =
      [result.stdout, result.stderr].filter(Boolean).join("\n").trim() ||
      "(no output)";
    const state = result.code === 0 ? "finished" : "warning";

    ctx.onXmlComplete(
      `<samba-status title="${escapeXmlAttr(
        `exit ${result.code ?? "?"}${result.timedOut ? " (timed out)" : ""}`,
      )}" state="${state}">\n${escapeXmlContent(output)}\n</samba-status>`,
    );

    const truncated =
      result.stdoutTruncated || result.stderrTruncated
        ? "\n(Output truncated.)"
        : "";
    return `Command exited with code ${result.code ?? "?"}.${result.timedOut ? " TIMED OUT." : ""}${truncated}\n${output}`;
  },
};
