import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { buildWindowsCommandInvocation } from "../../utils/windows_command";
const children = new Map<ChildProcessWithoutNullStreams, Promise<void>>();
function signalChild(child: ChildProcessWithoutNullStreams, force = false) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    if (child.exitCode === null && child.signalCode === null)
      spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
        windowsHide: true,
        timeout: 5000,
      });
  } else {
    // The process group may still contain tools after the agent exits.
    try {
      process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
    } catch {
      if (child.exitCode === null && child.signalCode === null)
        child.kill(force ? "SIGKILL" : "SIGTERM");
    }
  }
}
export async function stopChild(child: ChildProcessWithoutNullStreams) {
  const closed = children.get(child);
  signalChild(child);
  if (!closed) {
    signalChild(child, true);
    return;
  }
  const escalation = setTimeout(() => signalChild(child, true), 1500);
  try {
    await closed;
  } finally {
    clearTimeout(escalation);
    signalChild(child, true);
  }
}
export function stopNativeAgentProcesses() {
  for (const child of children.keys()) signalChild(child, true);
}
export function spawnAgent(
  command: string,
  args: string[],
  cwd: string,
  signal: AbortSignal,
  environment?: Record<string, string | undefined>,
) {
  signal.throwIfAborted();
  const invocation = buildWindowsCommandInvocation(command, args);
  const child = spawn(invocation.command, invocation.args, {
    cwd,
    env: environment ?? { ...process.env },
    stdio: "pipe",
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  const cancel = () => {
    void stopChild(child);
  };
  const closed = new Promise<void>((resolve) =>
    child.once("close", () => {
      children.delete(child);
      signal.removeEventListener("abort", cancel);
      resolve();
    }),
  );
  children.set(child, closed);
  // Broken pipes during cancellation must not crash Electron.
  child.stdin.on("error", () => {});
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  return child;
}
