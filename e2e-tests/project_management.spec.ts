import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("manager records sprint hours and preserves the closed report", async ({
  po,
}) => {
  await po.appManagement.importApp("minimal-with-ai-rules");
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  await po.page
    .getByText("Gestão · sprints, esforço e custos", { exact: true })
    .click();
  await po.page.getByLabel("Nome da sprint").fill("Sprint 1 · Agenda");
  await po.page
    .getByRole("button", { name: "Iniciar sprint", exact: true })
    .click();
  await expect(
    po.page.getByRole("button", { name: "Encerrar sprint e salvar relatório" }),
  ).toBeVisible();
  await po.page.getByLabel("Pessoa", { exact: true }).fill("Ana");
  await po.page.getByLabel("Horas", { exact: true }).fill("1.5");
  await po.page.getByLabel("USD por hora", { exact: true }).fill("40");
  await po.page
    .getByLabel("Atividade", { exact: true })
    .fill("Desenho da agenda e critérios de aceite");
  await po.page.getByRole("button", { name: "Salvar apontamento" }).click();
  await expect(
    po.page.getByText("Ana · 1.50 h", { exact: false }),
  ).toBeVisible();
  await expect(po.page.getByText("1.50", { exact: true })).toBeVisible();
  await po.page
    .getByRole("button", { name: "Encerrar sprint e salvar relatório" })
    .click();
  await expect(
    po.page.getByRole("button", { name: "Iniciar sprint", exact: true }),
  ).toBeVisible();
  await expect(
    po.page.getByRole("button", { name: "Remover apontamento" }),
  ).toHaveCount(0);
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  await po.page
    .getByText("Gestão · sprints, esforço e custos", { exact: true })
    .click();
  await po.page
    .getByLabel("Período dos indicadores")
    .selectOption({ label: "Sprint 1 · Agenda · encerrada" });
  await expect(po.page.getByText("1.50", { exact: true })).toBeVisible();
  await expect(
    po.page.getByText("Ana · 1.50 h", { exact: false }),
  ).toBeVisible();
  await po.page
    .getByText("Gestão · sprints, esforço e custos", { exact: true })
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await po.page.screenshot({
    path: "test-results/samba-management.png",
    fullPage: true,
  });
});
