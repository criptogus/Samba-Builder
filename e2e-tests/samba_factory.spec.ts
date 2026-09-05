import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";

test("factory approval, brand, release gate and durable handoff", async ({
  po,
}, testInfo) => {
  await po.page.setViewportSize({ width: 1440, height: 1080 });
  await po.setUp();
  await po.importApp("minimal");
  await po.page.getByRole("link", { name: "Fábrica", exact: true }).click();
  await expect(
    po.page.getByRole("heading", { name: "Do briefing à entrega." }),
  ).toBeVisible();
  await po.page.getByLabel("Cliente", { exact: true }).fill("Cliente de teste");
  await po.page.getByLabel("Aplicativo existente").selectOption({ index: 1 });
  await po.page
    .getByRole("button", { name: "Adicionar projeto", exact: true })
    .click();
  await po.page
    .getByLabel("Briefing do cliente")
    .fill(
      "Portal B2B: usuários consultam apenas dados da própria organização.",
    );
  await po.page
    .getByRole("button", { name: "Salvar briefing", exact: true })
    .click();
  await po.page.getByRole("button", { name: /04\s*Studio/ }).click();
  await expect(po.page.getByRole("button", { name: /^Build/ })).toBeDisabled();
  await po.page.getByRole("button", { name: /02\s*Plano/ }).click();
  await po.page
    .getByText("Importar plano JSON produzido pelo agente", { exact: true })
    .click();
  await po.page.getByLabel("JSON do plano").fill(
    JSON.stringify({
      problem: "Compartilhar documentos com isolamento",
      users: "Clientes B2B",
      stack: "React + TypeScript",
      outOfScope: "Billing",
      risks: "Dados privados e integração pendente",
      tasks: [
        {
          id: "95c564f4-9668-4312-8817-23ecc26eaf39",
          title: "Isolar organizações",
          priority: "must",
          acceptance: "Usuário A não consegue ler documentos de B",
          status: "todo",
        },
      ],
    }),
  );
  await po.page
    .getByRole("button", { name: "Importar para revisão", exact: true })
    .click();
  await po.page
    .getByRole("button", { name: "Salvar plano para revisão", exact: true })
    .click();
  await expect(
    po.page.getByRole("button", {
      name: "Salvar plano para revisão",
      exact: true,
    }),
  ).toBeDisabled();
  await po.page
    .getByLabel("Responsável pela aprovação do plano")
    .fill("Tech Lead de teste");
  await po.page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await expect(
    po.page.getByText("Aprovado por Tech Lead de teste", { exact: true }),
  ).toBeVisible();
  await po.page.getByRole("button", { name: /03\s*Design/ }).click();
  await po.page.getByRole("button", { name: /Samba · Operações/ }).click();
  await po.page
    .getByLabel("Responsável", { exact: true })
    .fill("Designer de teste");
  await po.page
    .getByRole("button", { name: "Confirmar tokens de marca", exact: true })
    .click();
  await expect(
    po.page.getByText("Confirmado por Designer de teste.", { exact: true }),
  ).toBeVisible();
  await expect(
    po.page.getByText("Plano importado para revisão. Salve antes de aprovar.", {
      exact: true,
    }),
  ).toBeHidden();
  await po.page.locator(".samba-factory").evaluate((element) => {
    element.scrollTop = 0;
  });
  await po.page.screenshot({
    path: testInfo.outputPath("factory-design.png"),
    fullPage: true,
  });
  await po.page.getByRole("button", { name: /04\s*Studio/ }).click();
  await expect(po.page.getByRole("button", { name: /^Build/ })).toBeEnabled();
  await po.page.getByRole("button", { name: /06\s*Entrega/ }).click();
  await expect(
    po.page.getByText("Publicação bloqueada", { exact: true }),
  ).toBeVisible();
  await expect(
    po.page.getByText("Conclua todas as tarefas Must.", { exact: true }),
  ).toBeVisible();
  await po.page
    .getByRole("button", { name: "Exportar / atualizar handoff", exact: true })
    .click();
  await expect(
    po.page.getByText("8 artefatos exportados para docs/ e samba/.", {
      exact: true,
    }),
  ).toBeVisible();
  await po.page.screenshot({
    path: testInfo.outputPath("factory-release.png"),
    fullPage: true,
  });
  await po.page.getByRole("link", { name: "Apps", exact: true }).click();
  await po.page.getByRole("link", { name: "Fábrica", exact: true }).click();
  await po.page
    .getByRole("button", { name: /Cliente de teste.*Plano aprovado/ })
    .click();
  await po.page.getByRole("button", { name: /02\s*Plano/ }).click();
  await expect(
    po.page.getByText("Aprovado por Tech Lead de teste", { exact: true }),
  ).toBeVisible();
  await po.page.setViewportSize({ width: 760, height: 900 });
  const overflows = await po.page
    .locator(".samba-factory")
    .evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflows).toBe(false);
});
