import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { expect, it, vi } from "vitest";
import { AgentRpc } from "./rpc";
function transport() {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    kill: vi.fn(),
  });
  const writes: any[] = [];
  child.stdin.on("data", (b) => writes.push(JSON.parse(b.toString())));
  return {
    child,
    writes,
    rpc: new AgentRpc(child as unknown as ChildProcessWithoutNullStreams),
  };
}
it("matches responses, decodes split unicode and forwards approvals", async () => {
  const { child, rpc, writes } = transport();
  const request = rpc.request("initialize", {});
  child.stdout.write('{"id":1,"result":{"ready":true}}\n');
  await expect(request).resolves.toEqual({ ready: true });
  rpc.onNotification = vi.fn();
  const message = Buffer.from('{"method":"delta","params":{"text":"ação"}}\n');
  for (const byte of message) child.stdout.write(Buffer.from([byte]));
  expect(rpc.onNotification).toHaveBeenCalledWith("delta", { text: "ação" });
  rpc.onRequest = vi.fn().mockResolvedValue({ decision: "decline" });
  child.stdout.write('{"id":"approval","method":"approve","params":{}}\n');
  await vi.waitFor(() =>
    expect(writes.at(-1)).toEqual({
      jsonrpc: "2.0",
      id: "approval",
      result: { decision: "decline" },
    }),
  );
  rpc.fail(new Error("done"));
});
it("rejects all pending requests on broken pipes and oversized messages", async () => {
  const { child, rpc } = transport();
  const request = rpc.request("start", {});
  const rejected = expect(request).rejects.toThrow("EPIPE");
  child.stdin.emit("error", new Error("EPIPE"));
  await rejected;
  await expect(rpc.request("next", {})).rejects.toThrow(/encerrada/);
  const other = transport();
  const big = other.rpc.request("start", {});
  const exceeded = expect(big).rejects.toThrow(/limite/);
  other.child.stdout.write("x".repeat(4000001));
  await exceeded;
  expect(other.child.kill).toHaveBeenCalled();
});
