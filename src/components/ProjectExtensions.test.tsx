import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
const gameStudio = vi.hoisted(() => vi.fn());
const importMachineSkill = vi.hoisted(() => vi.fn());
const installGameSkill = vi.hoisted(() => vi.fn());
vi.mock("@/ipc/types", () => ({
  ipc: {
    extensions: { list, gameStudio, importMachineSkill, installGameSkill },
  },
}));

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

const studioSnapshot = {
  bundled: [
    {
      slug: "construtor-de-jogos",
      title: "Construtor de jogos",
      description: "Fatia jogável com um verbo.",
      installed: true,
    },
  ],
  discovered: [
    {
      id: "abc12345abc12345abc12345",
      slug: "pulo-extra",
      title: "pulo-extra",
      description: "Ensina um pulo mais alto.",
      origin: "Claude",
      installed: false,
      importable: true,
      blockedReason: null,
    },
  ],
  computer: [{ id: "blender", label: "Blender", available: false }],
};

beforeEach(() => {
  gameStudio.mockResolvedValue(studioSnapshot);
  importMachineSkill.mockResolvedValue({
    slug: "pulo-extra",
    status: "installed",
    relativePath: "skills/pulo-extra/SKILL.md",
  });
});

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

it("importa uma skill encontrada no computador sem pedir terminal", async () => {
  list.mockResolvedValue({ entries: [], warnings: [] });

  renderComponent();

  await screen.findByText("pulo-extra");
  expect(screen.getByText("Ensina um pulo mais alto.")).toBeTruthy();
  expect(screen.getByText(/Blender:\s*ausente/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Importar" }));

  await waitFor(() =>
    expect(importMachineSkill).toHaveBeenCalledWith({
      discoveryId: "abc12345abc12345abc12345",
    }),
  );
});
