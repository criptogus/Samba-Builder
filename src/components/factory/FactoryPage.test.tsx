import { act } from "react";
import { queryKeys } from "@/lib/queryKeys";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSchema } from "../../../packages/samba-factory/src/schema";
const api = vi.hoisted(() => ({
  list: vi.fn(),
  enroll: vi.fn(),
  update: vi.fn(),
  scan: vi.fn(),
  gate: vi.fn(),
  export: vi.fn(),
}));
vi.mock("@/ipc/types/factory", () => ({ factoryClient: api }));
vi.mock("@/ipc/types", () => ({ ipc: { chat: { createChat: vi.fn() } } }));
vi.mock("@/hooks/useLoadApps", () => ({
  useLoadApps: () => ({ apps: [{ id: 1, name: "Portal B2B" }] }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}));
import { FactoryPage } from "./FactoryPage";
const project = ProjectSchema.parse({
  appId: 1,
  client: "Acme",
  name: "Portal B2B",
  brief: "Um portal",
  revision: 0,
  mode: "ask",
  plan: null,
  approval: null,
  brand: null,
  brandApproval: null,
  scan: null,
  changes: [],
  audit: [],
});
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue([project]);
  api.update.mockResolvedValue(project);
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <FactoryPage />
    </QueryClientProvider>,
  );
  return client;
}

describe("factory workspace", () => {
  it("keeps an edited draft bound to its observed revision after another window saves", async () => {
    const client = mount();
    fireEvent.click(
      await screen.findByRole("button", { name: /Acme Portal B2B/ }),
    );
    fireEvent.change(screen.getByLabelText("Briefing do cliente"), {
      target: { value: "Meu rascunho" },
    });
    await act(async () => {
      client.setQueryData(queryKeys.factory.all, [
        { ...project, revision: 1, brief: "Salvo em outra janela" },
      ]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar briefing" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith({
        appId: 1,
        revision: 0,
        action: { type: "brief", brief: "Meu rascunho", knowledge: "" },
      }),
    );
  });
  it("opens a client project, saves a briefing and gates writable modes", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: /Acme Portal B2B/ }),
    );
    const brief = screen.getByLabelText("Briefing do cliente");
    fireEvent.change(brief, { target: { value: "Briefing revisado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar briefing" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith({
        appId: 1,
        revision: 0,
        action: { type: "brief", brief: "Briefing revisado", knowledge: "" },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /04\s*Studio/ }));
    expect(
      (screen.getByRole("button", { name: /^Build/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /^Ask/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("enrolls an existing app without inventing portfolio data", async () => {
    api.list.mockResolvedValue([]);
    api.enroll.mockResolvedValue(project);
    mount();
    fireEvent.change(screen.getByLabelText("Cliente"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByLabelText("Aplicativo existente"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar projeto" }));
    await waitFor(() =>
      expect(api.enroll).toHaveBeenCalledWith({ appId: 1, client: "Acme" }),
    );
  });
});
