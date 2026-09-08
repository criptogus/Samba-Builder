import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  status: vi.fn(),
  start: vi.fn(),
  login: vi.fn(),
  read: vi.fn(),
  respond: vi.fn(),
  cancel: vi.fn(),
  selectExecutable: vi.fn(),
}));
vi.mock("@/ipc/types", () => ({ ipc: { nativeAgents: api } }));
import NativeAgentsDialog from "./NativeAgentsDialog";
beforeEach(() => {
  vi.clearAllMocks();
  api.status.mockResolvedValue([
    { provider: "codex", installed: true, path: "/fake/codex" },
  ]);
  api.cancel.mockResolvedValue(undefined);
});
afterEach(cleanup);
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <NativeAgentsDialog appId={42} onClose={() => {}} />
    </QueryClientProvider>,
  );
}
it("starts only on request, forwards approval and cancels when unmounted", async () => {
  const state = {
    id: "session",
    provider: "codex",
    kind: "task",
    phase: "approval",
    output: "Analisando",
    approval: {
      id: "approval",
      title: "Alterar arquivo?",
      detail: "index.html",
      question: false,
    },
  };
  api.start.mockResolvedValue(state);
  api.read.mockResolvedValue(state);
  api.respond.mockResolvedValue(undefined);
  const view = mount();
  await screen.findByText(/Programa encontrado/);
  expect(api.start).not.toHaveBeenCalled();
  expect(api.login).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Tarefa para o projeto"), {
    target: { value: "Criar página" },
  });
  fireEvent.click(screen.getByText("Executar no projeto"));
  await screen.findByText("Alterar arquivo?");
  expect(api.start).toHaveBeenCalledWith({
    provider: "codex",
    appId: 42,
    prompt: "Criar página",
  });
  fireEvent.click(screen.getByText("Permitir uma vez"));
  await waitFor(() =>
    expect(api.respond).toHaveBeenCalledWith({
      id: "session",
      approvalId: "approval",
      allow: true,
      text: "",
    }),
  );
  view.unmount();
  expect(api.cancel).toHaveBeenCalledWith({ id: "session" });
});
it("cancels a start accepted after the panel is unmounted", async () => {
  let accept!: (run: unknown) => void;
  api.login.mockReturnValue(
    new Promise((resolve) => {
      accept = resolve;
    }),
  );
  const view = mount();
  await screen.findByText(/Programa encontrado/);
  fireEvent.click(screen.getByText("Entrar pelo programa oficial"));
  await waitFor(() => expect(api.login).toHaveBeenCalled());
  view.unmount();
  accept({ id: "late", phase: "starting" });
  await waitFor(() => expect(api.cancel).toHaveBeenCalledWith({ id: "late" }));
});
