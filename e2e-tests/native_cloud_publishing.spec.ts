import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";

test("offers native Vercel and AWS publishing without contacting a cloud account", async ({
  po,
}, testInfo) => {
  await po.setUp();
  await po.importApp("minimal");
  await po.previewPanel.selectPreviewMode("publish");
  await expect(
    po.page.getByRole("tab", { name: "Vercel — site simples" }),
  ).toBeVisible();
  await po.page.getByRole("tab", { name: "AWS — front e backend" }).click();
  await expect(po.page.getByTestId("aws-connector")).toBeVisible();
  await expect(po.page.getByLabel("Perfil AWS CLI")).toHaveValue("default");
  await expect(
    po.page.getByRole("button", { name: "Publicar nesta conta AWS" }),
  ).toHaveCount(0);
  await po.page.screenshot({
    path: testInfo.outputPath("native-cloud-publishing.png"),
    fullPage: true,
  });
  await po.page.getByRole("tab", { name: "Vercel — site simples" }).click();
  await expect(
    po.page.getByText("GitHub Required for Vercel Deployment"),
  ).toBeVisible();
});
