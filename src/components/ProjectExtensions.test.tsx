import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/ipc/types", () => ({ ipc: { extensions: { list } } }));

import { ProjectExtensions } from "./ProjectExtensions";

function renderComponent() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ProjectExtensions />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("lista as extensões descobertas com escopo e avisos", async () => {
  list.mockResolvedValue({
    entries: [
      {
        id: "skill:project:revisar-login",
        kind: "skill",
        scope: "project",
        slug: "revisar-login",
        description: "Revisa o fluxo de login",
        modes: ["plan"],
        agent: null,
        model: null,
        subtask: false,
        relativePath: "skills/revisar-login/SKILL.md",
        bytes: 120,
      },
      {
        id: "command:user:enviar-pr",
        kind: "command",
        scope: "user",
        slug: "enviar-pr",
        description: "",
        modes: [],
        agent: "build",
        model: null,
        subtask: false,
        relativePath: "commands/enviar-pr.md",
        bytes: 40,
      },
    ],
    warnings: [
      {
        code: "invalid-slug",
        relativePath: "commands/Enviar PR.md",
        message:
          '"Enviar PR" não é um nome válido: use minúsculas, números e hífens.',
      },
    ],
  });

  renderComponent();

  await screen.findByText("revisar-login");
  expect(list).toHaveBeenCalledWith({ appId: undefined });
  expect(screen.getByText("Revisa o fluxo de login")).toBeTruthy();
  expect(
    screen.getByText(/Projeto · skills\/revisar-login\/SKILL.md/),
  ).toBeTruthy();
  expect(screen.getByText(/Modos: plan/)).toBeTruthy();
  expect(screen.getByText("enviar-pr")).toBeTruthy();
  expect(screen.getByText(/Usuário · commands\/enviar-pr.md/)).toBeTruthy();
  expect(screen.getByText(/Usa o agente: build/)).toBeTruthy();
  expect(
    screen.getByText(/não é um nome válido: use minúsculas, números e hífens/),
  ).toBeTruthy();
});

it("explica o próximo passo quando não há extensões", async () => {
  list.mockResolvedValue({ entries: [], warnings: [] });

  renderComponent();

  await screen.findByText(/Nenhuma extensão encontrada/);
  expect(
    screen.getByText(/\.samba\/skills\/revisar-login\/SKILL\.md/),
  ).toBeTruthy();
});

it("mostra falha de leitura em vez de fingir que não há extensões", async () => {
  list.mockRejectedValue(new Error("sem permissão"));

  renderComponent();

  await screen.findByText(/Não foi possível ler as extensões agora/);
  expect(screen.queryByText(/Nenhuma extensão encontrada/)).toBeNull();
});
