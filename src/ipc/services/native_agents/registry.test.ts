import { expect, it, vi } from "vitest";
import { NativeAgentRegistry } from "./registry";
import { nativeTransition } from "./transition";
import type { NativeRun } from "@/shared/native_agents";
it("reserves admission synchronously, isolates windows, and holds cancellation until cleanup", async () => {
  const registry = new NativeAgentRegistry();
  let release!: () => void;
  const cleanup = new Promise<void>((resolve) => {
    release = resolve;
  });
  const run = registry.start(1, "codex", "task", async ({ controller }) => {
    await new Promise<void>((resolve) =>
      controller.signal.addEventListener("abort", () => resolve(), {
        once: true,
      }),
    );
    await cleanup;
  });
  expect(() => registry.start(2, "grok", "task", async () => {})).toThrow(
    /Já há/,
  );
  expect(() => registry.read(run.id, 2)).toThrow(/não pertence/);
  await vi.waitFor(() =>
    expect(registry.read(run.id, 1).phase).toBe("running"),
  );
  registry.cancel(run.id, 1);
  expect(registry.read(run.id, 1).phase).toBe("cancelling");
  expect(() => registry.start(1, "codex", "task", async () => {})).toThrow();
  release();
  await vi.waitFor(() =>
    expect(registry.read(run.id, 1).phase).toBe("cancelled"),
  );
  const next = registry.start(1, "grok", "task", async () => {});
  expect(() => registry.cancel(run.id, 1)).toThrow();
  await vi.waitFor(() =>
    expect(registry.read(next.id, 1).phase).toBe("completed"),
  );
});
it("serializes approvals, rejects duplicate answers and cancels queued questions", async () => {
  const registry = new NativeAgentRegistry();
  const answers: boolean[] = [];
  const run = registry.start(1, "codex", "task", async ({ ask }) => {
    await Promise.all([
      ask("First", {}).then((a) => answers.push(a.allow)),
      ask("Second", {}).then((a) => answers.push(a.allow)),
    ]);
  });
  await vi.waitFor(() =>
    expect(registry.read(run.id, 1).approval?.title).toBe("First"),
  );
  const id = registry.read(run.id, 1).approval!.id;
  registry.respond(run.id, 1, id, true);
  expect(() => registry.respond(run.id, 1, id, true)).toThrow();
  await vi.waitFor(() =>
    expect(registry.read(run.id, 1).approval?.title).toBe("Second"),
  );
  registry.cancelOwner(1);
  await vi.waitFor(() =>
    expect(registry.read(run.id, 1).phase).toBe("cancelled"),
  );
  expect(answers).toEqual([true, false]);
});
it("bounds output and ignores events after a terminal state", () => {
  const state: NativeRun = {
    id: "id",
    provider: "codex",
    kind: "task",
    phase: "running",
    output: "",
  };
  const bounded = nativeTransition(state, {
    type: "output",
    text: "x".repeat(210000),
  });
  expect(bounded.output).toHaveLength(200000);
  const done = nativeTransition(bounded, { type: "done" });
  expect(nativeTransition(done, { type: "cancel" })).toBe(done);
});
