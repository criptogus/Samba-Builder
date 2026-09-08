import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
test("guides discovery, resumes its draft and prepares a review without submitting", async ({
  po,
}) => {
  // Discovery and layout work before an AI provider is connected.
  await expect(
    po.page.getByRole("heading", { name: "What do you want to build?" }),
  ).toBeVisible();
  const input = po.chatActions.getChatInput();
  await input.fill("Clínicas precisam reduzir horários duplicados.");
  await po.page.getByRole("button", { name: "Planejar com PM" }).click();
  const dialog = po.page.getByRole("dialog", { name: "Planejar com PM" });
  await expect(
    dialog.getByLabel("Qual problema vale a pena resolver?"),
  ).toHaveValue("Clínicas precisam reduzir horários duplicados.");
  await dialog.getByRole("button", { name: "Próxima pergunta" }).click();
  await dialog
    .getByLabel("Quem sente esse problema e como resolve hoje?")
    .fill("Recepcionistas usam planilhas. Duas clínicas relataram o problema.");
  await dialog.getByRole("button", { name: "Próxima pergunta" }).click();
  await dialog
    .getByLabel("O que essa pessoa precisa conseguir fazer, do início ao fim?")
    .fill("Paciente escolhe horário e recebe confirmação.");
  await dialog.getByRole("button", { name: "Próxima pergunta" }).click();
  await dialog
    .getByRole("button", { name: "Ainda não sei", exact: true })
    .click();
  await dialog.getByLabel(/Contas e dados privados/).check();
  await dialog.getByRole("button", { name: "Próxima pergunta" }).click();
  await expect(
    dialog.getByLabel("Quem pode ver ou alterar quais informações?"),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Ainda não sei", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await po.page.getByRole("button", { name: "Planejar com PM" }).click();
  await dialog
    .getByRole("button", { name: "Revisar o que já respondi" })
    .click();
  await expect(
    dialog.getByText(
      "Recepcionistas usam planilhas. Duas clínicas relataram o problema.",
      { exact: true },
    ),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Levar briefing ao chat" }).click();
  await expect(input).toContainText(
    "Clínicas precisam reduzir horários duplicados.",
  );
  await expect(input).toContainText("Dado/Quando/Então");
  await expect(input).toContainText("não implemente código nem publique");
  await expect(input).toContainText("Ainda não sei — decisão pendente");
  await expect(
    po.page.getByRole("heading", { name: "What do you want to build?" }),
  ).toBeVisible();
  // No message, provider request, or project creation is triggered by preparing a brief.
});
