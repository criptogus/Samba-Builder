import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { PUBLISH_PATHS } from "../../../packages/samba-factory/src/publish_paths";

function source(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

function sliceFrom(relative: string, marker: string): string {
  const text = source(relative);
  const start = text.indexOf(marker);
  expect(start, `${relative} :: ${marker}`).toBeGreaterThan(-1);
  return text.slice(start);
}

/** O gate precisa aparecer antes do efeito que publica. */
function expectGateBefore(
  region: string,
  gate: string,
  effect: string,
  label: string,
) {
  const gateAt = region.indexOf(gate);
  const effectAt = region.indexOf(effect);
  expect(gateAt, `${label} gate`).toBeGreaterThan(-1);
  expect(effectAt, `${label} effect`).toBeGreaterThan(gateAt);
}

describe("publish paths fail closed before the side effect", () => {
  it("covers every gated path in the inventory", () => {
    const gated = PUBLISH_PATHS.filter(
      (entry) => entry.disposition === "gated",
    ).map((entry) => entry.id);
    expect(gated).toEqual([
      "git-push",
      "vercel-create",
      "vercel-deploy",
      "coolify-deploy",
      "aws-deploy",
      "supabase-function",
      "repo-command",
      "mcp-publish",
    ]);
    expect(
      PUBLISH_PATHS.find((entry) => entry.id === "pty-terminal")?.disposition,
    ).toBe("residual");
  });

  it("gates git push before the remote update", () => {
    expectGateBefore(
      sliceFrom("src/ipc/utils/git_utils.ts", "export async function gitPush"),
      "assertFactoryReleaseForPath",
      '["push", "origin"',
      "git-push",
    );
  });

  it("gates Vercel create and deploy before they talk to Vercel", () => {
    expectGateBefore(
      sliceFrom(
        "src/ipc/handlers/vercel_handlers.ts",
        "async function handleCreateProject",
      ),
      "assertFactoryRelease",
      "slugifyAppPath",
      "vercel-create",
    );
    expectGateBefore(
      sliceFrom(
        "src/ipc/handlers/vercel_handlers.ts",
        "vercelContracts.deploy",
      ),
      "assertFactoryRelease",
      "submitVercelDeployment",
      "vercel-deploy",
    );
  });

  it("gates Coolify and AWS before the deploy call", () => {
    expectGateBefore(
      sliceFrom(
        "src/ipc/handlers/coolify_handlers.ts",
        "coolifyContracts.deploy",
      ),
      "assertFactoryRelease",
      "requestDeploy",
      "coolify-deploy",
    );
    expectGateBefore(
      sliceFrom("src/ipc/handlers/aws_handlers.ts", "awsContracts.deploy"),
      "assertFactoryRelease",
      "deployAws",
      "aws-deploy",
    );
  });

  it("gates a published Supabase function and skips a local bundle", () => {
    const region = sliceFrom(
      "src/supabase_admin/supabase_management_client.ts",
      "export async function deploySupabaseFunction",
    );
    const bundleOnly = region.indexOf("if (!bundleOnly)");
    const gate = region.indexOf("assertFactoryReleaseForAppPath");
    const enqueue = region.indexOf("enqueueSupabaseDeploy");
    expect(bundleOnly).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(bundleOnly);
    expect(enqueue).toBeGreaterThan(gate);
  });

  it("gates an agent publish command before the process starts", () => {
    expectGateBefore(
      sliceFrom(
        "src/pro/main/ipc/handlers/local_agent/tools/run_repo_command.ts",
        "execute: async",
      ),
      "assertFactoryRelease",
      "runBufferedProcess",
      "repo-command",
    );
  });

  it("gates an MCP publish tool before consent and before execute", () => {
    const region = sliceFrom(
      "src/pro/main/ipc/handlers/local_agent/tools/mcp_type_defs.ts",
      "map[def.jsName] = async",
    );
    const gate = region.indexOf("assertFactoryRelease");
    const consent = region.indexOf("requireMcpToolConsent");
    const execute = region.indexOf("mcpTool.execute");
    expect(gate).toBeGreaterThan(-1);
    expect(consent).toBeGreaterThan(gate);
    expect(execute).toBeGreaterThan(consent);
  });
});
