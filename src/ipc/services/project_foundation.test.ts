// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ensureProjectFoundation,
  recordFoundationBlueprint,
} from "./project_foundation";
const roots: string[] = [];
async function root() {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), "samba-foundation-"));
  roots.push(p);
  return p;
}
afterEach(async () => {
  for (const p of roots.splice(0))
    await fs.rm(p, { recursive: true, force: true });
});
it("creates the complete durable handover pack without pretending decisions are approved", async () => {
  const p = await root();
  await ensureProjectFoundation(p);
  expect(await fs.readdir(path.join(p, "project-docs"))).toHaveLength(9);
  expect(
    await fs.readFile(path.join(p, "project-docs/PRD.md"), "utf8"),
  ).toContain("pendente");
  expect(await fs.readFile(path.join(p, "AGENTS.md"), "utf8")).toContain(
    "never secrets",
  );
});
it("preserves authored documents and existing instructions across retries", async () => {
  const p = await root();
  await fs.writeFile(path.join(p, "AI_RULES.md"), "Existing rules\n");
  await ensureProjectFoundation(p);
  await fs.writeFile(
    path.join(p, "project-docs/PRD.md"),
    "Client-approved scope",
  );
  await ensureProjectFoundation(p);
  expect(await fs.readFile(path.join(p, "project-docs/PRD.md"), "utf8")).toBe(
    "Client-approved scope",
  );
  const rules = await fs.readFile(path.join(p, "AI_RULES.md"), "utf8");
  expect(rules).toContain("Existing rules");
  expect(rules.match(/## Project foundation/g)).toHaveLength(1);
});
it("persists approvals idempotently and keeps earlier decisions when a blueprint changes", async () => {
  const p = await root();
  const b = {
    appName: "Samba",
    userPrompt: "Brief",
    templateId: "react",
    themeId: "default",
    designDirection: "Clear",
    primaryColor: "#123456",
  };
  await recordFoundationBlueprint(p, b);
  await recordFoundationBlueprint(p, b);
  expect(await fs.readdir(path.join(p, "project-docs/approvals"))).toHaveLength(
    1,
  );
  await recordFoundationBlueprint(p, { ...b, appName: "New name" });
  expect(await fs.readdir(path.join(p, "project-docs/approvals"))).toHaveLength(
    2,
  );
});
it("refuses documentation and instruction symlinks without writing outside the project", async () => {
  const p = await root();
  const outside = await root();
  await fs.symlink(outside, path.join(p, "project-docs"), "dir");
  await expect(ensureProjectFoundation(p)).rejects.toThrow("Unsafe");
  expect(await fs.readdir(outside)).toEqual([]);
  await fs.unlink(path.join(p, "project-docs"));
  const target = path.join(outside, "rules");
  await fs.writeFile(target, "Original");
  await fs.symlink(target, path.join(p, "AI_RULES.md"));
  await expect(ensureProjectFoundation(p)).rejects.toThrow("Unsafe");
  expect(await fs.readFile(target, "utf8")).toBe("Original");
});
