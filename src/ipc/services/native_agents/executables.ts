import { z } from "zod";
import { withLock } from "../../utils/lock_utils";
import { app } from "electron";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { constants } from "node:fs";
import type { NativeAgent } from "@/shared/native_agents";
function settingsPath() {
  return path.join(app.getPath("userData"), "native-agent-paths.json");
}
async function settings(): Promise<Partial<Record<NativeAgent, string>>> {
  try {
    return z
      .object({
        codex: z.string().optional(),
        claude: z.string().optional(),
        grok: z.string().optional(),
      })
      .parse(JSON.parse(await fs.readFile(settingsPath(), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
export async function setExecutable(provider: NativeAgent, filename: string) {
  await fs.access(filename, constants.F_OK);
  if (!(await fs.stat(filename)).isFile())
    throw new Error("Selecione o executável oficial do agente.");
  await withLock("native-agent-paths", async () => {
    const current = await settings();
    current[provider] = filename;
    await fs.writeFile(settingsPath() + ".tmp", JSON.stringify(current), {
      mode: 0o600,
    });
    await fs.rename(settingsPath() + ".tmp", settingsPath());
  });
}
export async function resolveExecutable(
  provider: NativeAgent,
): Promise<string | undefined> {
  const saved = (await settings())[provider];
  const dirs = [
    path.join(os.homedir(), ".local", "bin"),
    path.join(os.homedir(), ".grok", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    ...(process.env.PATH ?? "").split(path.delimiter),
  ].filter(Boolean);
  if (process.platform === "win32") {
    if (process.env.APPDATA)
      dirs.unshift(path.join(process.env.APPDATA, "npm"));
    if (process.env.LOCALAPPDATA)
      dirs.unshift(path.join(process.env.LOCALAPPDATA, "Programs", provider));
  }
  const names =
    process.platform === "win32"
      ? [`${provider}.exe`, `${provider}.cmd`, `${provider}.bat`]
      : [provider];
  const candidates = [
    ...(saved ? [saved] : []),
    ...dirs.flatMap((dir) => names.map((name) => path.join(dir, name))),
  ];
  if (provider === "codex" && process.platform === "darwin")
    candidates.push("/Applications/ChatGPT.app/Contents/Resources/codex");
  for (const candidate of candidates) {
    try {
      await fs.access(
        candidate,
        process.platform === "win32" ? constants.F_OK : constants.X_OK,
      );
      if ((await fs.stat(candidate)).isFile()) return candidate;
    } catch {
      /* Try the next official CLI installation location. */
    }
  }
}
