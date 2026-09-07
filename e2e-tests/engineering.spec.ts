import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("saves an engineering draft and runs the real secrets scanner", async ({
  po,
}) => {
  test.setTimeout(180000);
  await po.appManagement.importApp("minimal-with-ai-rules");
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  const panel = po.page.getByRole("region", { name: "Plano de entrega" });
  await panel.getByRole("tab", { name: "Engenharia", exact: true }).click();
  const engineering = panel.getByRole("region", {
    name: "Engenharia e qualidade",
  });
  await engineering
    .getByRole("button", { name: "Definir política de engenharia" })
    .click();
  await engineering
    .getByLabel("Usuários simultâneos", { exact: true })
    .fill("200");
  await panel
    .getByRole("button", { name: "Salvar plano", exact: true })
    .click();
  await expect(
    panel.getByText("Salvo no aplicativo", { exact: false }),
  ).toBeVisible();
  await engineering
    .getByRole("button", { name: "Instalar ferramentas", exact: true })
    .click();
  await expect(
    engineering.getByRole("button", { name: "Segredos", exact: true }),
  ).toBeEnabled({ timeout: 150000 });
  await engineering
    .getByRole("button", { name: "Segredos", exact: true })
    .click();
  await expect(engineering.getByText(/Segredos · Passou/)).toBeVisible({
    timeout: 30000,
  });
  await expect(engineering.getByText(/Secretlint executado/)).toBeVisible();
  const appId = Number(new URL(po.page.url()).searchParams.get("appId"));
  const runs = await po.page.evaluate(
    async (appId) =>
      (window as any).electron.ipcRenderer.invoke("delivery:quality-runs", {
        appId,
      }),
    appId,
  );
  expect(runs[0].kind).toBe("secrets");
  expect(runs[0].report.status).toBe("passed");
});
