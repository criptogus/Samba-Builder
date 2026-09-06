import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("workspace keeps navigation readable and starting tools preserve the draft", async ({
  po,
}) => {
  // Discovery and layout work before an AI provider is connected.
  await expect(
    po.page.getByRole("heading", { name: "What do you want to build?" }),
  ).toBeVisible();
  await po.page.setViewportSize({ width: 1100, height: 800 });
  const input = po.chatActions.getChatInput();
  await input.fill("A simple appointment app");
  const apps = po.page.getByRole("link", { name: "Apps", exact: true });
  await expect(apps).toHaveAttribute("aria-current", "page");
  await expect(apps.getByText("Apps", { exact: true })).toHaveCSS(
    "opacity",
    "1",
  );
  await po.page
    .getByRole("button", { name: "Planejar com PM", exact: true })
    .click();
  await expect(
    po.page.getByLabel("Qual problema vale a pena resolver?"),
  ).toHaveValue("A simple appointment app");
  await po.page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(input).toContainText("A simple appointment app");
  await po.page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });
  await po.page.screenshot({
    animations: "disabled",
    path: "test-results/workspace-light.png",
  });
  await po.page.evaluate(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  });
  await po.page.screenshot({
    animations: "disabled",
    path: "test-results/workspace-dark.png",
  });
  await po.page.setViewportSize({ width: 800, height: 700 });
  await expect(
    po.page.getByRole("button", { name: "Planejar com PM", exact: true }),
  ).toBeVisible();
  await expect(
    po.page.getByRole("button", { name: "Briefing de reunião", exact: true }),
  ).toBeVisible();
  expect(
    await po.page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await po.appManagement.importApp("minimal-with-ai-rules");
  const tools = po.page.getByRole("group", { name: "Ferramentas de criação" });
  await expect(
    tools.getByRole("button", { name: "Agentes locais" }),
  ).toBeVisible();
  await po.page.screenshot({
    animations: "disabled",
    path: "test-results/workspace-chat.png",
  });
});
