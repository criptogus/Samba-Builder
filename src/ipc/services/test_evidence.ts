import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import log from "electron-log";
import { db } from "@/db";
import { apps, projectTestExecutions } from "@/db/schema";
import { getSambaAppPath } from "@/paths/paths";
import { execGit } from "../utils/git_utils";
import type { RunAppTestsResult } from "../types/tests";

export function summarizeTestEvidence(result: RunAppTestsResult) {
  const counts = {
    passed: 0,
    failed: 0,
    inconclusive: 0,
    files: result.results.length,
  };
  for (const file of result.results) {
    const cases = file.tests ?? [file];
    if (!cases.length) counts.inconclusive++;
    for (const test of cases) counts[test.status]++;
    // A file-level infrastructure verdict must not disappear behind passing cases.
    if (
      file.status === "inconclusive" &&
      !cases.some((test) => test.status === "inconclusive")
    )
      counts.inconclusive++;
    if (
      file.status === "failed" &&
      !cases.some((test) => test.status === "failed")
    )
      counts.failed++;
  }
  const status =
    result.infraError || counts.inconclusive || !result.results.length
      ? "inconclusive"
      : counts.failed
        ? "failed"
        : "passed";
  return { ...counts, status };
}
async function cleanCommit(root: string) {
  try {
    const options = { maxBuffer: 512000, signal: AbortSignal.timeout(10000) };
    const status = await execGit(
      [
        "-c",
        "core.fsmonitor=false",
        "status",
        "--porcelain",
        "--untracked-files=normal",
      ],
      root,
      options,
    );
    if (status.exitCode !== 0 || status.stdout.trim()) return null;
    const head = await execGit(["rev-parse", "HEAD"], root, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    return head.exitCode === 0 && /^[a-f0-9]{40,64}$/.test(head.stdout.trim())
      ? head.stdout.trim()
      : null;
  } catch {
    return null;
  }
}
/** Called under the test lifecycle's app-path/ref/worktree admission, including teardown.
 * Stores counts only: never credentials, URLs, test titles, logs or customer data.
 */
export async function withTestEvidence(
  appId: number,
  source: string,
  run: () => Promise<RunAppTestsResult>,
  normalize: (result: RunAppTestsResult) => RunAppTestsResult,
) {
  let root: string | null = null;
  try {
    const app = db
      .select({ path: apps.path })
      .from(apps)
      .where(eq(apps.id, appId))
      .get();
    root = app ? getSambaAppPath(app.path) : null;
  } catch {
    /* Evidence failure must not prevent the test lifecycle. */
  }
  const startedAt = Date.now();
  const before = root ? await cleanCommit(root) : null;
  let result: RunAppTestsResult = {
    appId,
    results: [],
    infraError: { message: "Execution interrupted" },
  };
  try {
    result = await run();
    return result;
  } finally {
    try {
      const after = root ? await cleanCommit(root) : null;
      db.insert(projectTestExecutions)
        .values({
          id: randomUUID(),
          appId,
          startedAt,
          finishedAt: Date.now(),
          source,
          commit: before && before === after ? before : null,
          ...summarizeTestEvidence(normalize(result)),
        })
        .run();
    } catch {
      log.warn("Could not persist test execution evidence");
    }
  }
}
