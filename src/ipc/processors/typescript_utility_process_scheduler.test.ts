import { afterEach, describe, expect, it, vi } from "vitest";

import { TypeScriptUtilityProcessScheduler } from "./typescript_utility_process_scheduler";

describe("TypeScriptUtilityProcessScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs operations globally in FIFO order", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    const events: string[] = [];
    let finishFirst!: () => void;

    const first = scheduler.runExclusive("code-explorer", async () => {
      events.push("first:start");
      await new Promise<void>((resolve) => {
        finishFirst = resolve;
      });
      events.push("first:end");
      return 1;
    });
    const second = scheduler.runExclusive("tsc", async () => {
      events.push("second:start");
      return 2;
    });

    expect(events).toEqual(["first:start"]);
    finishFirst();

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("reuses an idle explorer for another explorer request", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    const stop = vi.fn(async () => undefined);
    const token = {};

    await scheduler.runExclusive("code-explorer", async () => {
      scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token,
        stop,
      });
    });
    await scheduler.runExclusive("code-explorer", async () => undefined);

    expect(stop).not.toHaveBeenCalled();
  });

  it("stops an idle explorer before starting TSC", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    const events: string[] = [];
    const token = {};
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;

    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token,
        stop: async () => {
          events.push("explorer:stop");
          registration.clear();
        },
      });
    });
    await scheduler.runExclusive("tsc", async () => {
      events.push("tsc:start");
    });

    expect(events).toEqual(["explorer:stop", "tsc:start"]);
  });

  it("waits for an already-stopping explorer before reusing its kind", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    const events: string[] = [];
    const token = {};
    let finishStop!: () => void;
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;

    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token,
        stop: async () => {
          events.push("explorer:stopping");
          await new Promise<void>((resolve) => {
            finishStop = resolve;
          });
          registration.clear();
          events.push("explorer:stopped");
        },
      });
    });

    const stopping = registration!.stop();
    const next = scheduler.runExclusive("code-explorer", async () => {
      events.push("explorer:next");
    });
    await Promise.resolve();
    expect(events).toEqual(["explorer:stopping"]);

    finishStop();
    await Promise.all([stopping, next]);
    expect(events).toEqual([
      "explorer:stopping",
      "explorer:stopped",
      "explorer:next",
    ]);
  });

  it("stops a non-reusable TSC process before the next TSC run", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    const events: string[] = [];
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;

    await scheduler.runExclusive("tsc", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "tsc",
        reusable: false,
        token: {},
        stop: async () => {
          events.push("first:stop");
          registration.clear();
        },
      });
    });
    await scheduler.runExclusive("tsc", async () => {
      events.push("second:start");
    });

    expect(events).toEqual(["first:stop", "second:start"]);
  });

  it("continues the queue after an operation rejects", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    const first = scheduler.runExclusive("tsc", async () => {
      throw new Error("boom");
    });
    const second = scheduler.runExclusive("code-explorer", async () => 2);

    await expect(first).rejects.toThrow("boom");
    await expect(second).resolves.toBe(2);
  });

  it("retries stopping a resident after a stop attempt rejects", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    let stopAttempts = 0;
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;

    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token: {},
        stop: async () => {
          stopAttempts++;
          if (stopAttempts === 1) {
            throw new Error("temporary stop failure");
          }
          registration.clear();
        },
      });
    });

    const firstOperation = vi.fn(async () => undefined);
    await expect(scheduler.runExclusive("tsc", firstOperation)).rejects.toThrow(
      "temporary stop failure",
    );
    expect(firstOperation).not.toHaveBeenCalled();

    const secondOperation = vi.fn(async () => undefined);
    await expect(
      scheduler.runExclusive("tsc", secondOperation),
    ).resolves.toBeUndefined();
    expect(stopAttempts).toBe(2);
    expect(secondOperation).toHaveBeenCalledOnce();
  });

  it("does not reuse an explorer whose stop attempt failed", async () => {
    const scheduler = new TypeScriptUtilityProcessScheduler();
    let stopAttempts = 0;
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;

    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token: {},
        stop: async () => {
          stopAttempts++;
          if (stopAttempts === 1) {
            throw new Error("temporary stop failure");
          }
          registration.clear();
        },
      });
    });

    // Idle shutdown path: the stop fails, leaving the resident registered.
    await expect(registration!.stop()).rejects.toThrow(
      "temporary stop failure",
    );

    // A same-kind operation must retry the stop instead of reusing the
    // resident, since the owner already detached its handle.
    const nextOperation = vi.fn(async () => undefined);
    await expect(
      scheduler.runExclusive("code-explorer", nextOperation),
    ).resolves.toBeUndefined();
    expect(stopAttempts).toBe(2);
    expect(nextOperation).toHaveBeenCalledOnce();
  });

  it("times out a hung stop without starting the incompatible operation", async () => {
    vi.useFakeTimers();
    const scheduler = new TypeScriptUtilityProcessScheduler();
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;

    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token: {},
        stop: () => new Promise<void>(() => undefined),
      });
    });

    const blockedOperation = vi.fn(async () => undefined);
    const blocked = scheduler.runExclusive("tsc", blockedOperation);
    const expectation = expect(blocked).rejects.toThrow(
      "Timed out after 30000ms waiting for code-explorer process to exit",
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await expectation;
    expect(blockedOperation).not.toHaveBeenCalled();

    // A later real exit clears the resident and lets the queue recover.
    registration!.clear();
    await expect(
      scheduler.runExclusive("tsc", async () => "recovered"),
    ).resolves.toBe("recovered");
  });
});

describe("idle TypeScript memory release", () => {
  afterEach(() => vi.useRealTimers());

  it("releases the resident after a minute and resets the timer on reuse", async () => {
    vi.useFakeTimers();
    const scheduler = new TypeScriptUtilityProcessScheduler();
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;
    const stop = vi.fn(async () => registration.clear());
    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token: {},
        stop,
      });
    });
    await vi.advanceTimersByTimeAsync(59_000);
    await scheduler.runExclusive("code-explorer", async () => undefined);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(stop).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("never evicts an index during an active operation", async () => {
    vi.useFakeTimers();
    const scheduler = new TypeScriptUtilityProcessScheduler();
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;
    const stop = vi.fn(async () => registration.clear());
    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token: {},
        stop,
      });
    });
    let finish!: () => void;
    const active = scheduler.runExclusive(
      "code-explorer",
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await vi.advanceTimersByTimeAsync(120_000);
    expect(stop).not.toHaveBeenCalled();
    finish();
    await active;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("waits for actual exit when a request arrives during idle shutdown", async () => {
    vi.useFakeTimers();
    const scheduler = new TypeScriptUtilityProcessScheduler();
    let registration: ReturnType<typeof scheduler.registerResidentProcess>;
    let exited!: () => void;
    await scheduler.runExclusive("code-explorer", async () => {
      registration = scheduler.registerResidentProcess({
        kind: "code-explorer",
        reusable: true,
        token: {},
        stop: () =>
          new Promise<void>((resolve) => {
            exited = () => {
              registration.clear();
              resolve();
            };
          }),
      });
    });
    await vi.advanceTimersByTimeAsync(60_000);
    const operation = vi.fn(async () => undefined);
    const next = scheduler.runExclusive("code-explorer", operation);
    expect(operation).not.toHaveBeenCalled();
    exited();
    await next;
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
