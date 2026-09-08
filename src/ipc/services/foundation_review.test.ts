// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureProjectFoundation } from "./project_foundation";
import {
  assertFoundationReviewed,
  inspectFoundation,
  reviewedDocuments,
} from "./foundation_review";
import { emptyDeliveryPlan } from "@/delivery/model";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "foundation-review-"));
  roots.push(root);
  return root;
}
it("preserves legacy projects but cannot remove the required foundation", async () => {
  const root = await fixture();
  await expect(assertFoundationReviewed(root)).resolves.toBeUndefined();
  await expect(
    assertFoundationReviewed(root, {
      ...emptyDeliveryPlan(),
      foundationRequired: true,
    }),
  ).rejects.toThrow("Restaure");
  await ensureProjectFoundation(root);
  await expect(assertFoundationReviewed(root)).rejects.toThrow(
    "plano de entrega",
  );
});
it("rejects untouched drafts even when a person marks their hashes reviewed", async () => {
  const root = await fixture();
  await ensureProjectFoundation(root);
  const state = await inspectFoundation(root);
  expect(state.documents.every((d) => !!d.issue)).toBe(true);
  const plan = {
    ...emptyDeliveryPlan(),
    foundationReviews: state.documents.map((d) => ({
      file: d.file,
      digest: d.digest,
      reviewer: "Ana",
      note: "Revisado",
    })),
  };
  await expect(assertFoundationReviewed(root, plan)).rejects.toThrow("Revise");
});
it("accepts reviews of authored files and invalidates them when content changes", async () => {
  const root = await fixture();
  await ensureProjectFoundation(root);
  for (const file of reviewedDocuments)
    await fs.writeFile(
      path.join(root, "project-docs", file),
      `# ${file}\nDecisões do piloto confirmadas pelo cliente.`,
    );
  const state = await inspectFoundation(root);
  const plan = {
    ...emptyDeliveryPlan(),
    foundationReviews: state.documents.map((d) => ({
      file: d.file,
      digest: d.digest,
      reviewer: "Ana",
      note: "Conferido com o cliente",
    })),
  };
  await expect(assertFoundationReviewed(root, plan)).resolves.toBeUndefined();
  await fs.appendFile(
    path.join(root, "project-docs/PRD.md"),
    "\nEscopo alterado",
  );
  await expect(assertFoundationReviewed(root, plan)).rejects.toThrow("PRD.md");
});
it("rejects missing, oversized and symlink documents", async () => {
  const root = await fixture();
  await ensureProjectFoundation(root);
  await fs.unlink(path.join(root, "project-docs/PRD.md"));
  await fs.writeFile(
    path.join(root, "project-docs/ARCHITECTURE.md"),
    "x".repeat(256001),
  );
  await fs.unlink(path.join(root, "project-docs/TECH_STACK.md"));
  await fs.symlink(
    path.join(root, "project-docs/DESIGN_SYSTEM.md"),
    path.join(root, "project-docs/TECH_STACK.md"),
  );
  const state = await inspectFoundation(root);
  expect(state.documents.slice(0, 3).every((d) => !d.digest && d.issue)).toBe(
    true,
  );
});
