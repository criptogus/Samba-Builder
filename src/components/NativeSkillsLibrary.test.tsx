import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const load = vi.hoisted(() => vi.fn());
vi.mock("@/shared/load_native_skill", () => ({ loadNativeSkill: load }));
vi.mock("@/ipc/types", () => ({
  ipc: { system: { openExternalUrl: vi.fn() } },
}));
import { NativeSkillsLibrary } from "./NativeSkillsLibrary";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("shows metadata without loading instructions and opens only the chosen skill", async () => {
  load.mockResolvedValue("Instruções selecionadas para depurar.");
  render(<NativeSkillsLibrary />);
  expect(load).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Buscar skills nativas"), {
    target: { value: "depuração" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Ver Depuração com evidências" }),
  );
  await screen.findByText("Instruções selecionadas para depurar.");
  expect(load.mock.calls).toEqual([["samba-debug"]]);
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  fireEvent.click(screen.getByRole("button", { name: "Copiar comando" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("/samba-debug "));
  await screen.findByText("Comando copiado. Cole no início da mensagem.");
});
it("shows a resource failure without pretending the content loaded", async () => {
  load.mockRejectedValue(new Error("missing"));
  render(<NativeSkillsLibrary />);
  fireEvent.click(screen.getByRole("button", { name: "Ver Vídeos com React" }));
  await screen.findByText(
    "Não foi possível carregar esta skill. Tente novamente.",
  );
  expect(screen.getByText(/Pré-requisito: Projeto Remotion/)).toBeTruthy();
});
