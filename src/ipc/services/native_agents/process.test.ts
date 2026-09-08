// @vitest-environment node
import { once } from "node:events";
import { expect, it } from "vitest";
import { spawnAgent, stopChild } from "./process";
it("waits for a child that ignores graceful termination and leaves no process", async () => {
  const controller = new AbortController();
  const child = spawnAgent(
    process.execPath,
    [
      "-e",
      'process.on("SIGTERM", () => {}); process.stdout.write("ready"); setInterval(() => {}, 1000);',
    ],
    process.cwd(),
    controller.signal,
  );
  try {
    await once(child.stdout, "data");
    const pid = child.pid!;
    await stopChild(child);
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    await stopChild(child);
  }
}, 10000);
it("cancels an active native process through the owning AbortController", async () => {
  const controller = new AbortController();
  const child = spawnAgent(
    process.execPath,
    ["-e", 'process.stdout.write("ready"); setInterval(() => {}, 1000);'],
    process.cwd(),
    controller.signal,
  );
  try {
    await once(child.stdout, "data");
    const closed = once(child, "close");
    controller.abort();
    await closed;
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
  } finally {
    await stopChild(child);
  }
});
