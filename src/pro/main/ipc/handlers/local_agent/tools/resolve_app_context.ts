import path from "node:path";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import type { AgentContext } from "./types";

/**
 * Resolve the app path a read-only tool should target.
 *
 * - Omitted `appName` → current app (`ctx.appPath`).
 * - Provided `appName` → must match a referenced app from the current turn's
 *   `@app:Name` mentions. Any other value is rejected.
 *
 * Write tools do not call this — they operate only on `ctx.appPath` so that
 * referenced apps remain structurally unreachable for modification.
 */
export function resolveTargetAppPath(
  ctx: AgentContext,
  appName: string | undefined,
): string {
  if (!appName) {
    return ctx.appPath;
  }
  const appPath = ctx.referencedApps.get(appName.toLowerCase());
  if (appPath) {
    return appPath;
  }
  const available = [...ctx.referencedApps.keys()];
  const availableStr =
    available.length > 0 ? available.join(", ") : "(none available)";
  throw new SambaError(
    `Unknown app_name '${appName}'. Available referenced apps: ${availableStr}`,
    SambaErrorKind.NotFound,
  );
}

/**
 * Glob pattern for `.samba/` internals, for use in the node `glob` library's
 * ignore list.
 *
 * A referenced app's `.samba/` folder (rules, chat history, snapshots, etc.) is
 * not part of the `@app:Name` reference contract and must not be exposed to
 * read-only tools when targeting another app.
 */
export const SAMBA_INTERNAL_GLOB = "**/.samba/**";

/**
 * Negated glob for ripgrep's `--glob` flag, excluding `.samba/` at the app root
 * (ripgrep globs are relative to cwd, which is the target app path).
 */
export const SAMBA_INTERNAL_RIPGREP_EXCLUDE = "!.samba/**";

/**
 * Is `relativePath` inside a `.samba/` folder at the app root?
 *
 * Accepts slashes in either direction and a leading `./`; callers should pass a
 * path already resolved relative to the app root (so traversal aliases like
 * `src/../.samba/...` normalize correctly before being checked).
 */
export function isSambaInternalPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return normalized.split("/")[0] === ".samba";
}

/**
 * Strip `.samba/` entries from a file list when targeting a referenced app.
 * No-op for the current app (`appName` omitted) — the user's own `.samba/`
 * internals are always visible to them.
 */
export function filterSambaInternalFiles<T extends { path: string }>(
  files: T[],
  appName: string | undefined,
): T[] {
  if (!appName) {
    return files;
  }
  return files.filter((file) => !isSambaInternalPath(file.path));
}

/**
 * Throw if a resolved path inside a referenced app points into its `.samba/`
 * folder. No-op when `appName` is omitted (current app). The relative path is
 * computed from the resolved `fullFilePath`, so normalized traversal aliases
 * (e.g. `src/../.samba/...`) are caught.
 */
export function assertSambaInternalAccessAllowed({
  targetAppPath,
  fullFilePath,
  appName,
}: {
  targetAppPath: string;
  fullFilePath: string;
  appName: string | undefined;
}): void {
  if (!appName) {
    return;
  }
  const relativeFromApp = path.relative(targetAppPath, fullFilePath);
  if (isSambaInternalPath(relativeFromApp)) {
    throw new SambaError(
      `Cannot read .samba/ paths from referenced apps — these files are not part of the @app reference contract.`,
      SambaErrorKind.Validation,
    );
  }
}
