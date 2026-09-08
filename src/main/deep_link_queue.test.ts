import { describe, expect, it, vi } from "vitest";
import { createDeepLinkQueue } from "@/main/deep_link_queue";

describe("createDeepLinkQueue", () => {
  it("queues deep links until the app is marked ready", () => {
    const handler = vi.fn();
    const queue = createDeepLinkQueue(handler);

    queue.handle("sambabuilder://one");
    queue.handle("sambabuilder://two");

    expect(handler).not.toHaveBeenCalled();

    queue.markReady();

    expect(handler).toHaveBeenNthCalledWith(1, "sambabuilder://one");
    expect(handler).toHaveBeenNthCalledWith(2, "sambabuilder://two");
  });

  it("handles deep links immediately after the app is marked ready", () => {
    const handler = vi.fn();
    const queue = createDeepLinkQueue(handler);

    queue.markReady();
    queue.handle("sambabuilder://ready");
    queue.markReady();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith("sambabuilder://ready");
  });

  it("queues again while a newly targeted window is loading", () => {
    const handler = vi.fn();
    const queue = createDeepLinkQueue(handler);
    queue.markReady();
    queue.markNotReady();

    queue.handle("sambabuilder://new-window");
    expect(handler).not.toHaveBeenCalled();

    queue.markReady();
    expect(handler).toHaveBeenCalledWith("sambabuilder://new-window");
  });
});
