import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("imports a meeting transcript into the existing draft and exposes Granola", async ({
  po,
}) => {
  await po.setUp();
  const input = po.chatActions.getChatInput();
  await input.fill("Contexto já escrito pelo usuário.");
  await po.page.getByRole("button", { name: "Briefing de reunião" }).click();
  const dialog = po.page.getByRole("dialog", { name: "Briefing de reunião" });
  await dialog.getByLabel("Importar transcrição").setInputFiles({
    name: "kickoff.vtt",
    mimeType: "text/vtt",
    buffer: Buffer.from(
      "WEBVTT\n\n00:00:15.000 --> 00:00:18.000\nAna: Precisamos de agendamento online.",
    ),
  });
  await expect(dialog.getByLabel("Transcrição para revisar")).toHaveValue(
    /Ana: Precisamos de agendamento online/,
  );
  await expect(dialog.getByLabel("Nome da gravação ou reunião")).toHaveValue(
    "kickoff.vtt",
  );
  await dialog.getByRole("button", { name: "Usar no chat" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(input).toContainText("Contexto já escrito pelo usuário.");
  await expect(input).toContainText("Ana: Precisamos de agendamento online.");
  await expect(input).toContainText("hipótese e pendente");
  await expect(input).toContainText("não implemente código");
  // Preparing a briefing does not submit a message or create a project.
  await expect(
    po.page.getByRole("heading", { name: "What do you want to build?" }),
  ).toBeVisible();
  await po.page.getByRole("link", { name: "Plugins", exact: true }).click();
  const card = po.page
    .getByTestId("catalog-card")
    .filter({ hasText: "Granola" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Granola");
  await expect(
    card.getByRole("button", { name: "Add", exact: true }),
  ).toBeVisible();
});
