import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("reviews a project template without publishing before confirmation", async ({
  po,
}) => {
  await po.setUp();
  await po.appManagement.importApp("minimal");
  await po.appManagement.getTitleBarAppNameButton().click();
  await po.appManagement.clickAppDetailsMoreOptions();
  await po.page.getByRole("button", { name: "Salvar como template" }).click();
  const dialog = po.page.getByRole("dialog", { name: "Salvar como template" });
  await dialog.getByLabel("Nome do template").fill("Portal da equipe");
  await dialog
    .getByLabel("Descrição e uso recomendado")
    .fill("Base reutilizável de portal para clientes.");
  await dialog.getByRole("button", { name: "Revisar arquivos" }).click();
  await expect(
    dialog.getByRole("list", { name: "Arquivos do template" }),
  ).toContainText("package.json");
  await expect(
    dialog.getByRole("button", { name: "Publicar template" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await expect(
    dialog.getByRole("button", { name: "Publicar template" }),
  ).toBeEnabled();
  // No GitHub request or real team content is published by this test.
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).not.toBeVisible();
  await po.page.getByRole("link", { name: "Templates", exact: true }).click();
  await expect(
    po.page.getByRole("button", { name: "Atualizar templates da equipe" }),
  ).toBeVisible();
  await expect(
    po.page.getByText("criptogus/Samba-Builder", { exact: false }).first(),
  ).toBeVisible();
});
