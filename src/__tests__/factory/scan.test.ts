import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const run = vi.hoisted(() => vi.fn());
vi.mock("@/ipc/utils/spawn_streaming", () => ({ spawnStreaming: run }));
import { runFactoryScan } from "@/ipc/services/factory/scan";
let root: string;
beforeEach(async () => {
  vi.resetAllMocks();
  root = await fs.mkdtemp(path.join(os.tmpdir(), "samba-scan-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});
async function manifest() {
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      scripts: { typecheck: "tool-check", "test:smoke": "tool-test" },
    }),
  );
  await fs.writeFile(path.join(root, "package-lock.json"), "{}");
}
const success = {
  code: 0,
  stdout: "",
  stderr: "",
  timedOut: false,
  aborted: false,
};
describe("release verification runner", () => {
  it("never treats absent scripts and audit as success", async () => {
    const result = await runFactoryScan(root);
    expect(result.typecheck).toBe("missing");
    expect(result.smoke).toBe("missing");
    expect(result.dependencies).toBe("unavailable");
    expect(run).not.toHaveBeenCalled();
  });
  it("requires real successful command statuses and interpretable audit", async () => {
    await manifest();
    run
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce({ ...success, code: 1 })
      .mockResolvedValueOnce({
        ...success,
        stdout: JSON.stringify({
          metadata: { vulnerabilities: { high: 0, critical: 0 } },
        }),
      });
    const result = await runFactoryScan(root);
    expect(result.typecheck).toBe("passed");
    expect(result.smoke).toBe("failed");
    expect(result.dependencies).toBe("passed");
    expect(run.mock.calls[0][0].args).toEqual([
      "--ignore-scripts",
      "run",
      "typecheck",
    ]);
  });
  it("fails closed for audit timeout or malformed output", async () => {
    await manifest();
    run.mockResolvedValue({ ...success, timedOut: true, stdout: "invalid" });
    const result = await runFactoryScan(root);
    expect(result.typecheck).toBe("failed");
    expect(result.dependencies).toBe("unavailable");
  });
  it("invalidates evidence if a check mutates source files", async () => {
    await manifest();
    run.mockImplementation(async () => {
      await fs.writeFile(path.join(root, "changed.ts"), "changed");
      return {
        ...success,
        stdout: JSON.stringify({
          metadata: { vulnerabilities: { high: 1, critical: 0 } },
        }),
      };
    });
    const result = await runFactoryScan(root);
    expect(result.complete).toBe(false);
    expect(result.dependencies).toBe("failed");
    expect(result.limitations.join(" ")).toMatch(/alteraram fontes/);
  });
});
