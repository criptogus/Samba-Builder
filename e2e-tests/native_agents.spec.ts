import { testWithConfig } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const test = testWithConfig({
  preLaunchHook: async ({ userDataDir }) => {
    await fs.mkdir(userDataDir, { recursive: true });
    const program = path.join(
      userDataDir,
      process.platform === "win32" ? "fake-agent.cmd" : "fake-agent",
    );
    const fixture = path.resolve("e2e-tests/fixtures/native-agents/agent.cjs");
    const script =
      process.platform === "win32"
        ? `@"${process.execPath}" "${fixture}" %*\r\n`
        : `#!${process.execPath}\nrequire(${JSON.stringify(fixture)});\n`;
    await fs.writeFile(program, script, { mode: 0o700 });
    await fs.writeFile(
      path.join(userDataDir, "native-agent-paths.json"),
      JSON.stringify({ codex: program, claude: program, grok: program }),
    );
  },
});
test("runs native agent protocols through packaged IPC and asks before writing", async ({
  po,
}) => {
  await po.setUp();
  await po.appManagement.importApp("minimal");
  await po.page
    .getByRole("button", { name: "Agentes locais", exact: true })
    .click();
  const dialog = po.page.getByRole("dialog", { name: "Agentes locais" });
  for (const name of ["Codex", "Claude Code", "Grok Build"]) {
    await dialog.getByRole("button", { name, exact: true }).click();
    await expect(dialog.getByText(/Programa encontrado/)).toBeVisible();
    await dialog
      .getByLabel("Tarefa para o projeto")
      .fill("Criar arquivo de teste");
    await dialog.getByRole("button", { name: "Executar no projeto" }).click();
    await dialog.getByRole("button", { name: "Permitir uma vez" }).click();
    await expect(dialog.getByRole("status")).toHaveText(`${name}: Concluído`, {
      timeout: 20000,
    });
    await expect(
      dialog.getByText("Alteração autorizada concluída.", { exact: true }),
    ).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Codex", exact: true }).click();
  await dialog
    .getByLabel("Tarefa para o projeto")
    .fill("Aguardar cancelamento");
  await dialog.getByRole("button", { name: "Executar no projeto" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Codex: Em execução");
  await dialog.getByRole("button", { name: "Cancelar execução" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Codex: Cancelado");
});
