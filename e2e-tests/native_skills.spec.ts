import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("discovers bundled skills and loads instructions only on selection", async ({
  po,
  electronApp,
}) => {
  await expect(
    po.page.getByRole("heading", { name: "What do you want to build?" }),
  ).toBeVisible();
  // file:// resources are not consistently exposed by Resource Timing.
  // Observe scripts actually parsed by Electron, including already loaded ones.
  const session = await po.page.context().newCDPSession(po.page);
  const scripts: string[] = [];
  session.on("Debugger.scriptParsed", ({ url }) => scripts.push(url));
  await session.send("Debugger.enable");
  await po.page.getByRole("link", { name: "Library", exact: true }).click();
  await po.page.getByRole("button", { name: "Prompts", exact: true }).click();
  const library = po.page.getByRole("region", { name: "Skills nativas" });
  await expect(library).toBeVisible();
  expect(scripts.some((name) => /samba-debug.*\.js/.test(name))).toBe(false);
  await library.getByLabel("Buscar skills nativas").fill("depuração");
  await library
    .getByRole("button", { name: "Ver Depuração com evidências" })
    .click();
  await expect(library.getByLabel("Instruções da skill")).toContainText(
    "Formule uma hipótese falsificável",
  );
  expect(scripts.some((name) => /samba-debug.*\.js/.test(name))).toBe(true);
  expect(scripts.some((name) => /samba-video.*\.js/.test(name))).toBe(false);
  await library.getByRole("button", { name: "Copiar comando" }).click();
  await expect(library.getByRole("status")).toContainText("Comando copiado");
  expect(
    await electronApp.evaluate(({ clipboard }) => clipboard.readText()),
  ).toBe("/samba-debug ");
  await library.getByLabel("Buscar skills nativas").fill("PM Samba");
  await library
    .getByRole("button", { name: "Ver PM Samba", exact: true })
    .click();
  await expect(library.getByLabel("Instruções da skill")).toContainText(
    "Faça valer a pena construir",
  );
  await library.getByRole("button", { name: "Copiar comando" }).click();
  await expect
    .poll(() => electronApp.evaluate(({ clipboard }) => clipboard.readText()))
    .toBe("/samba-pm ");
  await library.getByLabel("Buscar skills nativas").fill("movimento");
  await library
    .getByRole("button", { name: "Ver Direção de movimento", exact: true })
    .click();
  await expect(library.getByLabel("Instruções da skill")).toContainText(
    "prefers-reduced-motion",
  );
  await library.getByRole("button", { name: "Copiar comando" }).click();
  await expect
    .poll(() => electronApp.evaluate(({ clipboard }) => clipboard.readText()))
    .toBe("/samba-motion ");
  await po.navigation.goToAppsTab();
  const chatInput = po.chatActions.getChatInput();
  await chatInput.fill("/samba-pm");
  const menu = po.page.locator('[data-mentions-menu="true"]');
  await expect(menu).toBeVisible();
  await menu.getByText("samba-pm", { exact: true }).click();
  await expect(chatInput).toContainText("/samba-pm");
  await session.detach();
});
