import { beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { emptyDeliveryPlan, type DeliveryPlan } from "@/delivery/model";
const state = vi.hoisted(() => ({
  row: undefined as { data: string } | undefined,
}));
vi.mock("@/db", () => ({
  db: {
    select: () => {
      const query: any = {
        from: () => query,
        where: () => query,
        get: () => state.row,
      };
      return query;
    },
  },
}));
import { assertDeliveryReadyForPublish } from "./delivery_readiness";
let root: string, commit: string, plan: DeliveryPlan;
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "samba-delivery-"));
  git("init");
  git("config", "user.name", "Samba Test");
  git("config", "user.email", "test@example.com");
  fs.writeFileSync(path.join(root, "README.md"), "fixture");
  git("add", ".");
  git("commit", "-m", "Fixture");
  commit = git("rev-parse", "HEAD");
});
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
beforeEach(() => {
  state.row = undefined;
  plan = {
    ...emptyDeliveryPlan(),
    client: "Acme",
    owner: "Ana",
    scope: "Booking",
    acceptance: "No duplicates",
    stage: "approved",
    reviewer: "Client",
    approvalNote: "Test fixture approval",
    reviewCommit: commit,
    approvalCommit: commit,
    checks: {
      flows: "test",
      security: "test",
      accessibility: "test",
      responsive: "test",
    },
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "Booking",
        owner: "Ana",
        status: "done",
        acceptance: "No duplicates",
        evidence: "test fixture",
      },
    ],
  };
});
it("preserves existing projects without a delivery plan", async () =>
  expect(await assertDeliveryReadyForPublish(1, root)).toBeUndefined());
it("refuses production with an incomplete delivery before calling Git", async () => {
  state.row = { data: JSON.stringify(emptyDeliveryPlan()) };
  await expect(assertDeliveryReadyForPublish(1, root)).rejects.toThrow(
    "ainda não está aprovada",
  );
});
it("returns the exact approved commit for publishing", async () => {
  state.row = { data: JSON.stringify(plan) };
  expect(await assertDeliveryReadyForPublish(1, root)).toBe(commit);
});
it("refuses changed worktrees and mismatched approval versions", async () => {
  state.row = { data: JSON.stringify(plan) };
  fs.writeFileSync(path.join(root, "unsaved.txt"), "change");
  await expect(assertDeliveryReadyForPublish(1, root)).rejects.toThrow(
    "Salve as alterações",
  );
  fs.unlinkSync(path.join(root, "unsaved.txt"));
  state.row = {
    data: JSON.stringify({ ...plan, approvalCommit: "a".repeat(40) }),
  };
  await expect(assertDeliveryReadyForPublish(1, root)).rejects.toThrow(
    "código mudou",
  );
});
