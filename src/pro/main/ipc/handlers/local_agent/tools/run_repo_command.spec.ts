import { describe, expect, it, vi, beforeEach } from "vitest";

import type { AgentContext } from "./types";
import { runBufferedProcess } from "@/ipc/utils/buffered_process";
import { runRepoCommandTool } from "./run_repo_command";

vi.mock("@/ipc/utils/buffered_process", () => ({
  runBufferedProcess: vi.fn(),
}));

function makeCtx(appPath: string): AgentContext {
  return {
    appId: 1,
    appPath,
    event: { sender: undefined },
    onXmlStream: vi.fn(),
    onXmlComplete: vi.fn(),
    reinstallAndRestartAppToolAvailable: true,
  } as unknown as AgentContext;
}

describe("runRepoCommandTool", () => {
  const appPath = "/tmp/fake-repo";

  beforeEach(() => {
    vi.mocked(runBufferedProcess).mockReset();
  });

  it("runs the command in the repo directory with the repo env", async () => {
    vi.mocked(runBufferedProcess).mockResolvedValue({
      code: 0,
      signal: null,
      stdout: "ok",
      stderr: "",
      stdoutTruncated: false,
      stderrTruncated: false,
      aborted: false,
      timedOut: false,
    });

    const ctx = makeCtx(appPath);
    const result = await runRepoCommandTool.execute(
      { command: "npm test" },
      ctx,
    );

    expect(runBufferedProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "npm test",
        cwd: appPath,
        env: expect.objectContaining({}),
      }),
    );
    expect(result).toContain("exited with code 0");
    expect(result).toContain("ok");
    const xml = vi.mocked(ctx.onXmlComplete).mock.calls[0][0];
    expect(xml).toContain('state="finished"');
  });

  it("reports a non-zero exit as a warning with the output", async () => {
    vi.mocked(runBufferedProcess).mockResolvedValue({
      code: 1,
      signal: null,
      stdout: "",
      stderr: "1 failing test",
      stdoutTruncated: false,
      stderrTruncated: false,
      aborted: false,
      timedOut: false,
    });

    const ctx = makeCtx(appPath);
    const result = await runRepoCommandTool.execute(
      { command: "npm test" },
      ctx,
    );

    expect(result).toContain("exited with code 1");
    expect(result).toContain("1 failing test");
    const xml = vi.mocked(ctx.onXmlComplete).mock.calls[0][0];
    expect(xml).toContain('state="warning"');
  });

  it("marks a timeout and truncation in the result", async () => {
    vi.mocked(runBufferedProcess).mockResolvedValue({
      code: null,
      signal: null,
      stdout: "partial",
      stderr: "",
      stdoutTruncated: true,
      stderrTruncated: false,
      aborted: false,
      timedOut: true,
    });

    const ctx = makeCtx(appPath);
    const result = await runRepoCommandTool.execute(
      { command: "npm test" },
      ctx,
    );

    expect(result).toContain("TIMED OUT");
    expect(result).toContain("(Output truncated.)");
  });
});
