import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("software house workspace finds and reopens a real project", async ({
  po,
}) => {
  await expect(
    po.page.getByRole("heading", { name: "Delivery workspace" }),
  ).toBeVisible();
  await expect(
    po.page.getByText("Your next delivery starts here"),
  ).toBeVisible();
  await po.page.getByRole("link", { name: "New project", exact: true }).click();
  await expect(po.page.locator("#project-intake")).toBeInViewport();
  await po.appManagement.importApp("minimal-with-ai-rules");
  await expect(
    po.page.getByRole("group", { name: "Ferramentas de criação" }),
  ).toBeVisible();
  await po.navigation.goToAppsTab();
  const workspace = po.page.getByRole("region", { name: "Delivery workspace" });
  await workspace.getByRole("textbox").fill("no matching client");
  await expect(workspace.getByText("No matching projects")).toBeVisible();
  await workspace.getByRole("textbox").fill("minimal");
  await expect(
    workspace.getByRole("button", { name: /minimal-with-ai-rules/ }),
  ).toBeVisible();
  await po.page.setViewportSize({ width: 1100, height: 850 });
  await po.page.evaluate(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    window.scrollTo(0, 0);
  });
  await workspace.scrollIntoViewIfNeeded();
  await po.page.screenshot({
    path: "test-results/delivery-workspace.png",
    animations: "disabled",
  });
  await workspace
    .getByRole("button", { name: /minimal-with-ai-rules/ })
    .click();
  await expect(po.page).toHaveURL(/app-details\?appId=/);
});
