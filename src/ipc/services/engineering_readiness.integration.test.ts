import { afterEach, beforeEach, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  setupHandlerTestHarness,
  type HandlerTestHarness,
} from "@/testing/handler_test_harness";
import { apps, projectQualityRuns, projectTestExecutions } from "@/db/schema";
import { emptyDeliveryPlan, type DeliveryPlan } from "@/delivery/model";
import { qualityKinds } from "@/delivery/quality";
import { assertEngineeringReady } from "./engineering_readiness";
let h: HandlerTestHarness,
  root: string,
  appId: number,
  commit: string,
  plan: DeliveryPlan;
beforeEach(async () => {
  h = setupHandlerTestHarness();
  root = await fs.mkdtemp(path.join(os.tmpdir(), "engineering-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init");
  await fs.writeFile(path.join(root, "app.ts"), "export const value=1;\n");
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
  commit = git("rev-parse", "HEAD");
  appId = h.db
    .insert(apps)
    .values({ name: "Quality", path: root })
    .returning()
    .get().id;
  const testId = crypto.randomUUID();
  h.db
    .insert(projectTestExecutions)
    .values({
      id: testId,
      appId,
      startedAt: 1,
      finishedAt: 2,
      commit,
      source: "panel",
      status: "passed",
      passed: 1,
      failed: 0,
      inconclusive: 0,
      files: 1,
    })
    .run();
  plan = {
    ...emptyDeliveryPlan(),
    engineeringRequired: true,
    engineeringPolicy: {
      version: 1,
      profile: "public",
      requirements: [
        {
          id: "REQ-1",
          title: "Journey",
          acceptance: "Completes journey",
          codePaths: ["app.ts"],
          testExecutionId: testId,
        },
      ],
      peakUsers: 100,
      availabilityPercent: 99,
      recoveryMinutes: 60,
      dataLossMinutes: 60,
      monthlyBudgetUSD: 100,
      maxLcpMs: 2500,
      maxCls: 0.1,
      architectureEvidence: "Tested scope",
      usabilityEvidence: "Reviewed scope",
    },
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "Journey",
        owner: "Ana",
        acceptance: "Journey",
        status: "done",
        evidence: "Test",
        requirementIds: ["REQ-1"],
      },
    ],
  };
  for (const kind of qualityKinds)
    h.db
      .insert(projectQualityRuns)
      .values({
        id: crypto.randomUUID(),
        appId,
        kind,
        commit,
        createdAt: 1,
        toolVersion: "fixture",
        report: JSON.stringify({
          status: "passed",
          summary: "fixture",
          findings: [],
          metrics: { lcpMs: 1000, cls: 0 },
        }),
      })
      .run();
});
afterEach(async () => {
  h.dispose();
  await fs.rm(root, { recursive: true, force: true });
});
it("accepts a traced requirement with current test and check results", async () => {
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).resolves.toBeUndefined();
});
it("rejects requirements without code and without task coverage", async () => {
  plan.engineeringPolicy!.requirements[0].codePaths = ["missing.ts"];
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).rejects.toThrow("arquivos");
  plan.engineeringPolicy!.requirements[0].codePaths = ["app.ts"];
  plan.tasks = [];
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).rejects.toThrow("tarefa");
});
it("rejects a test from another version", async () => {
  await expect(
    assertEngineeringReady(appId, plan, "a".repeat(40), root),
  ).rejects.toThrow();
});
it("a newer failed check supersedes an earlier passed check", async () => {
  h.db
    .insert(projectQualityRuns)
    .values({
      id: crypto.randomUUID(),
      appId,
      kind: "secrets",
      commit,
      createdAt: 2,
      toolVersion: "fixture",
      report: JSON.stringify({
        status: "failed",
        summary: "finding",
        findings: [],
      }),
    })
    .run();
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).rejects.toThrow("secrets");
});
it("enforces the current performance budget and risk-specific requirements", async () => {
  plan.engineeringPolicy!.maxLcpMs = 500;
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).rejects.toThrow("desempenho");
  plan.engineeringPolicy!.maxLcpMs = 2500;
  plan.engineeringPolicy!.profile = "critical";
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).rejects.toThrow("authorization");
});
it("allows saving drafts but never approves an empty policy", async () => {
  plan.engineeringPolicy!.requirements = [];
  await expect(
    assertEngineeringReady(appId, plan, commit, root),
  ).rejects.toThrow("Complete");
});
