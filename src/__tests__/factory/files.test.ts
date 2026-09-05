import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  readFactorySources,
  writeFactoryArtifact,
} from "@/ipc/services/factory/files";
const location = vi.hoisted(() => ({ root: "" }));
vi.mock("@/paths/paths", () => ({ getUserDataPath: () => location.root }));
import {
  readFactoryStore,
  mutateFactoryProject,
  writeFactoryStore,
} from "@/ipc/services/factory/store";
import { ProjectSchema } from "../../../packages/samba-factory/src/schema";
let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "samba-factory-"));
  location.root = root;
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});
describe("source evidence and exports", () => {
  it("fingerprints content and new files, including design tokens", async () => {
    await fs.writeFile(path.join(root, "app.ts"), "export const value = 1;");
    const before = await readFactorySources(root);
    await fs.writeFile(path.join(root, "app.ts"), "export const value = 2;");
    const after = await readFactorySources(root);
    expect(after.digest).not.toBe(before.digest);
    await writeFactoryArtifact(
      root,
      "docs/design-tokens.json",
      '{"primary":"#123456"}',
    );
    const branded = await readFactorySources(root);
    expect(branded.digest).not.toBe(after.digest);
    await writeFactoryArtifact(root, "docs/security-report.md", "receipt");
    expect((await readFactorySources(root)).digest).toBe(branded.digest);
  });
  it("marks symlink coverage incomplete and never follows it", async () => {
    await fs.symlink(os.tmpdir(), path.join(root, "linked"), "dir");
    const result = await readFactorySources(root);
    expect(result.complete).toBe(false);
    expect(result.files).toEqual([]);
  });
  it("updates regular artifacts but refuses directory symlinks and arbitrary paths", async () => {
    await writeFactoryArtifact(root, "docs/brief.md", "version one");
    await writeFactoryArtifact(root, "docs/brief.md", "version two");
    expect(await fs.readFile(path.join(root, "docs/brief.md"), "utf8")).toBe(
      "version two",
    );
    await expect(writeFactoryArtifact(root, "../secret", "x")).rejects.toThrow(
      /allowlisted/,
    );
    await fs.symlink(path.join(root, "docs"), path.join(root, "samba"), "dir");
    await expect(
      writeFactoryArtifact(root, "samba/skills.lock", "x"),
    ).rejects.toThrow(/simbólico/);
  });
  it("rejects symlink artifact targets", async () => {
    await fs.mkdir(path.join(root, "docs"));
    await fs.writeFile(path.join(root, "private"), "keep");
    await fs.symlink(
      path.join(root, "private"),
      path.join(root, "docs/brief.md"),
    );
    await expect(
      writeFactoryArtifact(root, "docs/brief.md", "changed"),
    ).rejects.toThrow(/link/);
    expect(await fs.readFile(path.join(root, "private"), "utf8")).toBe("keep");
  });
});
describe("durable factory store", () => {
  it("rejects stale revision writers across concurrent windows", async () => {
    const project = ProjectSchema.parse({
      appId: 1,
      client: "A",
      name: "Portal",
      brief: "",
      revision: 0,
      mode: "ask",
      plan: null,
      approval: null,
      brand: null,
      brandApproval: null,
      scan: null,
      changes: [],
      audit: [],
    });
    await writeFactoryStore((store) => ({ ...store, projects: [project] }));
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        mutateFactoryProject(1, 0, (current) => ({ ...current, revision: 1 })),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect((await readFactoryStore()).projects[0].revision).toBe(1);
  });
  it("fails closed on a damaged store instead of dropping approval policy", async () => {
    await fs.writeFile(path.join(root, "samba-factory.json"), "broken json");
    await expect(readFactoryStore()).rejects.toThrow(/restaure/);
  });
});
