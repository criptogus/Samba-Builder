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
  importAudio: vi.fn(),
  cancelAudio: vi.fn(),
  listServers: vi.fn(),
  addFromCatalog: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/ipc/types", () => ({ ipc: { meetings: api, mcp: api } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => api.navigate }));
import MeetingBriefingDialog from "./MeetingBriefingDialog";
import { GRANOLA_URL } from "@/shared/meeting_briefing";
beforeEach(() => {
  vi.clearAllMocks();
  api.cancelAudio.mockResolvedValue(undefined);
  api.listServers.mockResolvedValue([]);
});
afterEach(cleanup);
function mount() {
  const prepared = vi.fn();
  const close = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MeetingBriefingDialog onClose={close} onPrepared={prepared} />
    </QueryClientProvider>,
  );
  return { prepared, close };
}
it("prepares a reviewed transcript without sending it automatically", async () => {
  const { prepared } = mount();
  expect(api.listServers).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Nome da gravação ou reunião"), {
    target: { value: "Cliente A" },
  });
  fireEvent.change(screen.getByLabelText("Transcrição para revisar"), {
    target: { value: "[00:05] Ana: Precisamos de agendamento online." },
  });
  expect(prepared).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Usar no chat" }));
  expect(prepared).toHaveBeenCalledWith(
    expect.stringContaining("agendamento online"),
  );
  expect(api.importAudio).not.toHaveBeenCalled();
});
it("puts transcription results into the review form", async () => {
  api.importAudio.mockResolvedValue({
    filename: "cliente.mp3",
    text: "[0:15] Quero um portal.",
  });
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Selecionar áudio e transcrever" }),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Transcrição para revisar") as HTMLTextAreaElement)
        .value,
    ).toBe("[0:15] Quero um portal."),
  );
  expect(
    (screen.getByLabelText("Nome da gravação ou reunião") as HTMLInputElement)
      .value,
  ).toBe("cliente.mp3");
});
it("ignores a transcription that completes after cancellation", async () => {
  let resolve!: (value: { filename: string; text: string }) => void;
  api.importAudio.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  mount();
  fireEvent.click(
    screen.getByRole("button", { name: "Selecionar áudio e transcrever" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Cancelar importação" }),
  );
  resolve({ filename: "stale.mp3", text: "late transcript" });
  await waitFor(() => expect(api.cancelAudio).toHaveBeenCalled());
  expect(
    (screen.getByLabelText("Transcrição para revisar") as HTMLTextAreaElement)
      .value,
  ).toBe("");
});
it("routes Granola setup through the existing plugin authentication surface", async () => {
  api.addFromCatalog.mockResolvedValue({ id: 42 });
  const { close } = mount();
  fireEvent.change(screen.getByLabelText("Origem do briefing"), {
    target: { value: "granola" },
  });
  const configure = await screen.findByRole("button", {
    name: "Configurar Granola",
  });
  await waitFor(() => expect(configure.hasAttribute("disabled")).toBe(false));
  fireEvent.click(configure);
  await waitFor(() =>
    expect(api.navigate).toHaveBeenCalledWith({
      to: "/plugins/$serverId",
      params: { serverId: 42 },
    }),
  );
  expect(api.addFromCatalog).toHaveBeenCalledWith({ slug: "samba-granola" });
  expect(close).toHaveBeenCalled();
});
it("reuses an existing Granola connector and prepares a scoped request", async () => {
  api.listServers.mockResolvedValue([
    {
      id: 5,
      transport: "http",
      url: GRANOLA_URL,
      oauthConnected: true,
      enabled: true,
    },
  ]);
  const { prepared } = mount();
  fireEvent.change(screen.getByLabelText("Origem do briefing"), {
    target: { value: "granola" },
  });
  await screen.findByText("Conta Granola vinculada. Informe a reunião abaixo.");
  fireEvent.change(screen.getByLabelText("Título, data ou link da reunião"), {
    target: { value: "Kickoff Cliente A em 05/09" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar no chat" }));
  expect(prepared).toHaveBeenCalledWith(
    expect.stringContaining("Kickoff Cliente A em 05\\u002f09"),
  );
  expect(api.addFromCatalog).not.toHaveBeenCalled();
});
