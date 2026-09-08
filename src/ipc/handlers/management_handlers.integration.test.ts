import { afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { eq } from "drizzle-orm";
import {
  setupHandlerTestHarness,
  type HandlerTestHarness,
} from "@/testing/handler_test_harness";
import {
  apps,
  chats,
  projectDeliveries,
  projectTokenEvents,
} from "@/db/schema";
import { emptyDeliveryPlan } from "@/delivery/model";
import { registerManagementHandlers } from "./management_handlers";
import { recordProjectTokenUsage } from "../services/project_accounting";
import type { Management, Metrics } from "@/management/model";
let h: HandlerTestHarness;
let root: string;
let appId: number;
let chatId: number;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const commit = () => {
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
    "test",
  );
};
const call = async (channel: string, input: Record<string, unknown> = {}) =>
  h.invokeHandler(channel, { appId, ...input }) as Promise<{
    revision: number;
    data: Management;
  }>;
beforeAll(() => registerManagementHandlers());
beforeEach(async () => {
  h = setupHandlerTestHarness();
  root = await fs.mkdtemp(path.join(os.tmpdir(), "samba-management-"));
  git("init");
  await fs.writeFile(path.join(root, "app.ts"), "const a=1;\n");
  await fs.writeFile(path.join(root, "notes.md"), "not code\n");
  commit();
  appId = h.db
    .insert(apps)
    .values({ name: "Metrics", path: root })
    .returning()
    .get().id;
  chatId = h.db.insert(chats).values({ appId }).returning().get().id;
});
afterEach(async () => {
  h.dispose();
  await fs.rm(root, { recursive: true, force: true });
});
it("records usage independently of chat deletion and separates unknown cost from zero", async () => {
  recordProjectTokenUsage(chatId, "test", "model", "agent", {
    inputTokens: 1000000,
    outputTokens: 200000,
  });
  recordProjectTokenUsage(chatId, "test", "other", "agent", {});
  h.db.delete(chats).where(eq(chats.id, chatId)).run();
  const report = (await h.invokeHandler("management:metrics", {
    appId,
  })) as Metrics;
  expect(report.tokens).toHaveLength(2);
  expect(report.tokens.every((t) => t.estimatedCost === null)).toBe(true);
  expect(report.codeLines).toBe(1);
  expect(report.codeFiles).toBe(1);
  await call("management:save", {
    revision: 0,
    rates: [
      {
        provider: "test",
        model: "model",
        inputPerMillion: 2,
        outputPerMillion: 5,
      },
    ],
    timeEntries: [],
  });
  const priced = (await h.invokeHandler("management:metrics", {
    appId,
  })) as Metrics;
  expect(priced.tokens.find((t) => t.model === "model")?.estimatedCost).toBe(3);
  expect(priced.tokens.find((t) => t.model === "other")?.unknownCalls).toBe(1);
  h.db.delete(apps).where(eq(apps.id, appId)).run();
  expect(h.db.select().from(projectTokenEvents).all()).toHaveLength(0);
});
it("freezes sprint scope, hours, code changes and cost with optimistic concurrency", async () => {
  const oldId = crypto.randomUUID();
  const newId = crypto.randomUUID();
  const plan = emptyDeliveryPlan();
  plan.tasks = [
    {
      id: oldId,
      title: "Already shipped",
      owner: "A",
      kind: "feature",
      status: "done",
      acceptance: "ok",
      evidence: "test",
    },
  ];
  h.db
    .insert(projectDeliveries)
    .values({ appId, revision: 1, data: JSON.stringify(plan) })
    .run();
  const start = await call("management:start", {
    revision: 0,
    name: "Sprint 1",
  });
  const sprint = start.data.sprints[0];
  await expect(
    call("management:start", { revision: 1, name: "duplicate" }),
  ).rejects.toThrow();
  const time = {
    id: crypto.randomUUID(),
    sprintId: sprint.id,
    date: "2026-09-06",
    person: "Ana",
    description: "Feature",
    minutes: 90,
    hourlyRate: 40,
  };
  await call("management:save", {
    revision: 1,
    rates: [],
    timeEntries: [time],
  });
  await expect(
    call("management:save", { revision: 1, rates: [], timeEntries: [] }),
  ).rejects.toThrow("outra janela");
  await fs.writeFile(path.join(root, "app.ts"), "const a=1;\nconst b=2;\n");
  commit();
  plan.tasks.push({
    id: newId,
    title: "New feature",
    owner: "Ana",
    kind: "feature",
    status: "done",
    acceptance: "ok",
    evidence: "tests passed",
  });
  h.db
    .update(projectDeliveries)
    .set({ data: JSON.stringify(plan) })
    .where(eq(projectDeliveries.appId, appId))
    .run();
  const closed = await call("management:close", {
    revision: 2,
    sprintId: sprint.id,
  });
  const report = closed.data.sprints[0].report!;
  expect(report.minutes).toBe(90);
  expect(report.laborCost).toBe(60);
  expect(report.features.map((f) => f.id)).toEqual([newId]);
  expect(report.addedLines).toBe(1);
  expect(report.commits).toBe(1);
  await expect(
    call("management:save", { revision: 3, rates: [], timeEntries: [] }),
  ).rejects.toThrow("imutáveis");
  await fs.writeFile(path.join(root, "app.ts"), "const different=3;\n");
  commit();
  expect(
    await h.invokeHandler("management:metrics", { appId, sprintId: sprint.id }),
  ).toEqual(report);
});
it("rejects unknown projects and invalid sprint membership", async () => {
  await expect(
    h.invokeHandler("management:get", { appId: 999999 }),
  ).rejects.toThrow();
  await expect(
    call("management:save", {
      revision: 0,
      rates: [],
      timeEntries: [
        {
          id: crypto.randomUUID(),
          sprintId: crypto.randomUUID(),
          date: "2026-09-06",
          person: "A",
          description: "work",
          minutes: 60,
          hourlyRate: null,
        },
      ],
    }),
  ).rejects.toThrow("Sprint inválida");
});
