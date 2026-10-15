import { describe, it, expect, vi } from "vitest";
import { runShellCommand } from "./runShellCommand";
import * as child_process from "child_process";
import { EventEmitter } from "events";

vi.mock("child_process", () => {
  return {
    spawn: vi.fn(),
  };
});

describe("runShellCommand", () => {
  it("should spawn process with correct arguments and shell: false", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    vi.mocked(child_process.spawn).mockReturnValue(mockProcess);

    const promise = runShellCommand("test-cmd", ["arg1", "arg2"], {
      env: { TEST: "1" },
    });

    expect(child_process.spawn).toHaveBeenCalledWith(
      "test-cmd",
      ["arg1", "arg2"],
      {
        env: { TEST: "1" },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    mockProcess.stdout.emit("data", "success output");
    mockProcess.emit("close", 0);

    const result = await promise;
    expect(result).toBe("success output");
  });

  it("should return null if process fails", async () => {
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    vi.mocked(child_process.spawn).mockReturnValue(mockProcess);

    const promise = runShellCommand("fail-cmd", ["arg1"]);

    expect(child_process.spawn).toHaveBeenCalledWith("fail-cmd", ["arg1"], {
      env: undefined,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    mockProcess.stderr.emit("data", "error output");
    mockProcess.emit("close", 1);

    const result = await promise;
    expect(result).toBeNull();
  });
});
