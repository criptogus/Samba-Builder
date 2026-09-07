import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureProjectFoundation } from "../src/ipc/services/project_foundation";

test("reviews authored documentation, persists it and detects later changes", async ({
  po,
}) => {
  await po.appManagement.importApp("minimal-with-ai-rules");
  const root = await po.appManagement.getCurrentAppPath();
  await ensureProjectFoundation(root);
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  const panel = po.page.getByRole("region", { name: "Plano de entrega" });
  await panel.getByRole("tab", { name: "Revisão", exact: true }).click();
  const base = panel.getByRole("region", { name: "Revisão da base" });
  await expect(
    base.getByText("Complete o rascunho inicial antes da revisão.").first(),
  ).toBeVisible();
  await fs.writeFile(
    path.join(root, "project-docs/PRD.md"),
    "# PRD\nPiloto de agendamento. Impedir duplicidade, acesso limitado à clínica. Escopo revisado com o cliente.",
  );
  await base.getByRole("button", { name: "Atualizar documentos" }).click();
  await base.getByLabel("Responsável pela revisão documental").fill("Ana");
  await base
    .getByLabel("Revisão de PRD.md", { exact: true })
    .fill("Conferi escopo e critérios do piloto com o cliente.");
  await base
    .getByRole("button", { name: "Registrar revisão de PRD.md", exact: true })
    .click();
  await expect(
    base.getByText("PRD.md · Revisado por Ana", { exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Salvar plano", exact: true })
    .click();
  await expect(
    panel.getByText("Salvo no aplicativo", { exact: false }),
  ).toBeVisible();
  await fs.appendFile(path.join(root, "project-docs/PRD.md"), "\nNovo escopo.");
  await base.getByRole("button", { name: "Atualizar documentos" }).click();
  await expect(
    base.getByText("PRD.md · Revisão pendente", { exact: true }),
  ).toBeVisible();
});

test("new projects cannot disable foundation review or approve after deleting documentation", async ({
  po,
}) => {
  const created = await po.page.evaluate(async () =>
    (window as any).electron.ipcRenderer.invoke("create-app", {
      name: "Foundation policy",
      initialChatMode: "ask",
    }),
  );
  const saved = await po.page.evaluate(
    async (appId) =>
      (window as any).electron.ipcRenderer.invoke("delivery:get", { appId }),
    created.app.id,
  );
  expect(saved.plan.foundationRequired).toBe(true);
  const downgraded = await po.page.evaluate(async (saved) => {
    try {
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        ...saved,
        plan: { ...saved.plan, foundationRequired: false },
      });
      return "accepted";
    } catch (error) {
      return String(error);
    }
  }, saved);
  expect(downgraded).toContain("obrigatória");
  await fs.rm(path.join(created.app.resolvedPath, "project-docs"), {
    recursive: true,
  });
  const rejected = await po.page.evaluate(async (saved) => {
    const plan = {
      ...saved.plan,
      client: "Client",
      owner: "Ana",
      scope: "Pilot",
      acceptance: "Works",
      stage: "approved",
      reviewer: "Ana",
      approvalNote: "Manual review",
      reviewCommit: "a".repeat(40),
      approvalCommit: "a".repeat(40),
      checks: {
        flows: "manual",
        security: "manual",
        accessibility: "manual",
        responsive: "manual",
      },
      tasks: [
        {
          id: crypto.randomUUID(),
          title: "Pilot",
          owner: "Ana",
          status: "done",
          acceptance: "Works",
          evidence: "manual",
        },
      ],
    };
    try {
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        ...saved,
        plan,
      });
      return "accepted";
    } catch (error) {
      return String(error);
    }
  }, saved);
  expect(rejected).toContain("Restaure");
});
