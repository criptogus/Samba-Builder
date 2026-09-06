import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import { emptyDeliveryPlan } from "../src/delivery/model";

test("delivery persists scope, preserves conflicts, refuses premature approval and prepares a task", async ({
  po,
}) => {
  await po.appManagement.importApp("minimal-with-ai-rules");
  await expect(
    po.page.getByRole("group", { name: "Ferramentas de criação" }),
  ).toBeVisible();
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  const panel = po.page.getByRole("region", { name: "Plano de entrega" });
  await panel.getByLabel("Cliente", { exact: true }).fill("Acme");
  await panel.getByLabel("Responsável", { exact: true }).fill("Ana");
  await panel.getByLabel("Prazo", { exact: true }).fill("2026-01-01");
  await panel
    .getByLabel("Briefing do cliente", { exact: true })
    .fill("Agendamentos duplicados custam tempo.");
  await panel
    .getByLabel("Escopo da entrega", { exact: true })
    .fill("Agenda para a recepção.");
  await panel
    .getByLabel("Critérios de aceite", { exact: true })
    .fill("Impedir reservas duplicadas\nConfirmar a reserva");
  await panel
    .getByRole("button", { name: "Criar tarefas a partir dos critérios" })
    .click();
  await panel
    .getByRole("button", { name: "Salvar plano", exact: true })
    .click();
  await expect(
    panel.getByText("Salvo no aplicativo", { exact: false }),
  ).toBeVisible();
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  await expect(panel.getByLabel("Cliente", { exact: true })).toHaveValue(
    "Acme",
  );
  const appId = Number(new URL(po.page.url()).searchParams.get("appId"));
  const saved = await po.page.evaluate(
    async (appId) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:get", {
        appId,
      }),
    appId,
  );
  const invalid = await po.page.evaluate(
    async ({ appId, saved }) => {
      try {
        await (window as any).electron.ipcRenderer.invoke("delivery:save", {
          appId,
          revision: saved.revision,
          plan: { ...saved.plan, stage: "approved" },
        });
        return "";
      } catch (e) {
        return String(e);
      }
    },
    { appId, saved },
  );
  expect(invalid).toContain("evidências");
  await panel.getByLabel("Cliente", { exact: true }).fill("Meu rascunho");
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  await expect(panel.getByLabel("Cliente", { exact: true })).toHaveValue(
    "Meu rascunho",
  );
  await po.page.evaluate(
    async ({ appId, saved }) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        appId,
        revision: saved.revision,
        plan: { ...saved.plan, owner: "Outro responsável" },
      }),
    { appId, saved },
  );
  await panel
    .getByRole("button", { name: "Salvar plano", exact: true })
    .click();
  await expect(panel.getByText(/alterada em outra janela/)).toBeVisible();
  await expect(panel.getByLabel("Cliente", { exact: true })).toHaveValue(
    "Meu rascunho",
  );
  await panel
    .getByRole("button", { name: "Descartar rascunho e carregar versão salva" })
    .click();
  await expect(panel.getByLabel("Responsável", { exact: true })).toHaveValue(
    "Outro responsável",
  );
  await po.navigation.goToAppsTab();
  await expect(
    po.page
      .getByRole("region", { name: "Precisa da sua atenção" })
      .getByText(/Prazo vencido/),
  ).toBeVisible();
  await po.page
    .getByRole("region", { name: "Precisa da sua atenção" })
    .getByRole("button")
    .click();
  await po.page.setViewportSize({ width: 1100, height: 900 });
  await panel.scrollIntoViewIfNeeded();
  await po.page.screenshot({
    path: "test-results/project-delivery.png",
    animations: "disabled",
  });
  await panel
    .getByRole("button", { name: "Preparar execução no chat" })
    .first()
    .click();
  await expect(po.chatActions.getChatInput()).toContainText(
    "Impedir reservas duplicadas",
  );
  await expect(po.chatActions.getChatInput()).toContainText(
    "Não publique automaticamente",
  );
  // Preparing work must not send the prompt or invoke a paid model.
  await expect(
    po.page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeEnabled();
});

test("delivery rejects unknown projects through real IPC", async ({ po }) => {
  const plan = emptyDeliveryPlan();
  const result = await po.page.evaluate(async (plan) => {
    try {
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        appId: 999999,
        revision: 0,
        plan,
      });
      return "";
    } catch (e) {
      return String(e);
    }
  }, plan);
  expect(result).toContain("Projeto não encontrado");
});

test("approval records keep the reviewed Git version and are not duplicated on delivery", async ({
  po,
}) => {
  await po.appManagement.importApp("minimal-with-ai-rules");
  await expect(
    po.page.getByRole("group", { name: "Ferramentas de criação" }),
  ).toBeVisible();
  const appId = Number(new URL(po.page.url()).searchParams.get("appId"));
  const root = await po.appManagement.getCurrentAppPath();
  const { execFileSync } = await import("node:child_process");
  // Only this isolated fixture repository is changed; no user project or cloud is touched.
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Delivery Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "Review fixture",
    ],
    { cwd: root },
  );
  const commit = await po.page.evaluate(
    async (appId) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:snapshot", {
        appId,
      }),
    appId,
  );
  const plan = {
    ...emptyDeliveryPlan(),
    client: "Acme",
    owner: "Ana",
    scope: "Fixture",
    acceptance: "Fixture criteria",
    stage: "approved" as const,
    reviewer: "Test client",
    approvalNote: "Test approval evidence",
    reviewCommit: commit,
    approvalCommit: commit,
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "Fixture task",
        owner: "Ana",
        acceptance: "Fixture criteria",
        evidence: "Fixture test evidence",
        status: "done" as const,
      },
    ],
    checks: {
      flows: "Fixture test",
      security: "Fixture test",
      accessibility: "Fixture test",
      responsive: "Fixture test",
    },
  };
  const saved = await po.page.evaluate(
    async ({ appId, plan }) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        appId,
        revision: 0,
        plan,
      }),
    { appId, plan },
  );
  await po.page.evaluate(
    async ({ appId, saved }) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        appId,
        revision: saved.revision,
        plan: { ...saved.plan, stage: "delivered" },
      }),
    { appId, saved },
  );
  const approvals = await po.page.evaluate(
    async (appId) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:approvals", {
        appId,
      }),
    appId,
  );
  expect(approvals).toHaveLength(1);
  expect(approvals[0].commit).toBe(commit);
  expect(approvals[0].reviewer).toBe("Test client");
  const stale = await po.page.evaluate(
    async ({ appId, saved }) => {
      try {
        await (window as any).electron.ipcRenderer.invoke("delivery:save", {
          appId,
          revision: saved.revision + 1,
          plan: { ...saved.plan, reviewCommit: "a".repeat(40) },
        });
        return "";
      } catch (e) {
        return String(e);
      }
    },
    { appId, saved },
  );
  expect(stale).toContain("versão atual");
  await po.page.evaluate(
    async ({ appId, saved }) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:save", {
        appId,
        revision: saved.revision + 1,
        plan: {
          ...saved.plan,
          acceptance: "Updated acceptance explicitly approved",
        },
      }),
    { appId, saved },
  );
  const updatedApprovals = await po.page.evaluate(
    async (appId) =>
      await (window as any).electron.ipcRenderer.invoke("delivery:approvals", {
        appId,
      }),
    appId,
  );
  expect(updatedApprovals).toHaveLength(2);
});
