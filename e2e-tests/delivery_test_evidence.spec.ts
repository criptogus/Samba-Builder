import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("records an inconclusive executor attempt and displays it separately from manual review", async ({
  po,
}) => {
  await po.appManagement.importApp("minimal-with-ai-rules");
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  const appId = Number(new URL(po.page.url()).searchParams.get("appId"));
  const result = await po.page.evaluate(
    async (appId) =>
      (window as any).electron.ipcRenderer.invoke("tests:run", { appId }),
    appId,
  );
  expect(result.infraError).toBeTruthy();
  const evidence = await po.page.evaluate(
    async (appId) =>
      (window as any).electron.ipcRenderer.invoke("delivery:test-evidence", {
        appId,
      }),
    appId,
  );
  expect(evidence).toHaveLength(1);
  expect(evidence[0].status).toBe("inconclusive");
  expect(evidence[0].passed).toBe(0);
  const panel = po.page.getByRole("region", { name: "Plano de entrega" });
  await panel.getByRole("tab", { name: "Revisão", exact: true }).click();
  const section = panel.getByRole("region", { name: "Testes executados" });
  await expect(section.getByText(/Inconclusivo ·/)).toBeVisible();
  await expect(section.getByText(/0 aprovados/)).toBeVisible();
  await po.navigation.goToAppsTab();
  await po.page
    .getByRole("region", { name: "Delivery workspace" })
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .last()
    .click();
  await panel.getByRole("tab", { name: "Revisão", exact: true }).click();
  await expect(section.getByText(/Inconclusivo ·/)).toBeVisible();
});
