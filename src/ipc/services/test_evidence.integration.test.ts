import { afterEach, beforeEach, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { eq } from "drizzle-orm";
import {
  setupHandlerTestHarness,
  type HandlerTestHarness,
} from "@/testing/handler_test_harness";
import { apps, projectTestExecutions } from "@/db/schema";
import { summarizeTestEvidence, withTestEvidence } from "./test_evidence";
import type { RunAppTestsResult } from "../types/tests";
let h: HandlerTestHarness;
let root: string;
let appId: number;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
beforeEach(async () => {
  h = setupHandlerTestHarness();
  root = await fs.mkdtemp(path.join(os.tmpdir(), "samba-test-evidence-"));
  git("init");
  await fs.writeFile(path.join(root, "app.ts"), "export const a=1;\n");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "fixture",
  );
  appId = h.db
    .insert(apps)
    .values({ name: "Evidence", path: root })
    .returning()
    .get().id;
});
afterEach(async () => {
  h.dispose();
  await fs.rm(root, { recursive: true, force: true });
});
const passed = (): RunAppTestsResult => ({
  appId,
  results: [
    {
      file: "flow.spec.ts",
      status: "passed",
      tests: [{ title: "PRIVATE CLIENT TEXT", status: "passed" }],
    },
  ],
});
const identity = (r: RunAppTestsResult) => r;
it("persists verified commit and summary without titles, then cascades with project deletion", async () => {
  await withTestEvidence(appId, "panel", async () => passed(), identity);
  const row = h.db.select().from(projectTestExecutions).get()!;
  expect(row.commit).toBe(git("rev-parse", "HEAD"));
  expect(row.status).toBe("passed");
  expect(row.passed).toBe(1);
  expect(JSON.stringify(row)).not.toContain("PRIVATE");
  h.db.delete(apps).where(eq(apps.id, appId)).run();
  expect(h.db.select().from(projectTestExecutions).all()).toHaveLength(0);
});
it("does not attach dirty or modified code to a commit", async () => {
  await fs.appendFile(path.join(root, "app.ts"), "// dirty");
  await withTestEvidence(appId, "agent", async () => passed(), identity);
  expect(h.db.select().from(projectTestExecutions).get()!.commit).toBeNull();
});
it("captures teardown failure as inconclusive and preserves thrown errors", async () => {
  await withTestEvidence(
    appId,
    "panel",
    async () => passed(),
    (r) => ({ ...r, infraError: { message: "PRIVATE SECRET" } }),
  );
  expect(h.db.select().from(projectTestExecutions).get()!.status).toBe(
    "inconclusive",
  );
  await expect(
    withTestEvidence(
      appId,
      "panel",
      async () => {
        throw new Error("failed runner");
      },
      identity,
    ),
  ).rejects.toThrow("failed runner");
  expect(h.db.select().from(projectTestExecutions).all()).toHaveLength(2);
  expect(
    h.db
      .select()
      .from(projectTestExecutions)
      .all()
      .every((r) => r.status === "inconclusive"),
  ).toBe(true);
});
it("does not label empty or incomplete reports as passed", () => {
  expect(summarizeTestEvidence({ appId, results: [] }).status).toBe(
    "inconclusive",
  );
  expect(
    summarizeTestEvidence({
      appId,
      results: [{ file: "empty", status: "passed", tests: [] }],
    }).status,
  ).toBe("inconclusive");
  expect(
    summarizeTestEvidence({
      appId,
      results: [
        { file: "failed", status: "failed", tests: passed().results[0].tests },
      ],
    }).status,
  ).toBe("failed");
});
