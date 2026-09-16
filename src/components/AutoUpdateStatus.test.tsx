import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const ipcMock = vi.hoisted(() => ({
  getUpdateStatus: vi.fn(),
  onAutoUpdateStatus: vi.fn<
    (callback: (status: unknown) => void) => () => void
  >(() => () => {}),
}));

vi.mock("@/ipc/types", () => ({
  ipc: {
    system: { getUpdateStatus: ipcMock.getUpdateStatus },
    events: { system: { onAutoUpdateStatus: ipcMock.onAutoUpdateStatus } },
  },
}));
vi.mock("@/hooks/useAppVersion", () => ({
  useAppVersion: () => "1.14.0-beta.1",
}));

import { AutoUpdateStatus, formatCheckedAt } from "./AutoUpdateStatus";

const STATUS = {
  enabled: true,
  phase: "up-to-date" as const,
  lastCheckedAt: "2026-09-08T12:00:00.000Z",
  version: null,
  message: null,
};

function renderStatus() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AutoUpdateStatus />
    </QueryClientProvider>,
  );
}

function textOf(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("mostra a versão instalada e o resultado da última verificação", async () => {
  ipcMock.getUpdateStatus.mockResolvedValue(STATUS);

  renderStatus();

  // O elemento existe antes da resposta do main: espera o texto chegar.
  await screen.findByText(/Nenhuma atualização disponível\./);
  expect(textOf("auto-update-version")).toContain(
    "Versão instalada: 1.14.0-beta.1",
  );
  expect(textOf("auto-update-last-check")).toContain("Última verificação:");
});

it("anuncia atualização baixada com a versão nova", async () => {
  ipcMock.getUpdateStatus.mockResolvedValue({
    ...STATUS,
    phase: "downloaded",
    version: "1.15.0",
  });

  renderStatus();

  await screen.findByText(/Atualização baixada\. Reinicie para aplicar\./);
  expect(textOf("auto-update-phase")).toContain("(1.15.0)");
});

it("mostra o motivo quando a verificação falha", async () => {
  ipcMock.getUpdateStatus.mockResolvedValue({
    ...STATUS,
    phase: "error",
    message: "getaddrinfo ENOTFOUND update.electronjs.org",
  });

  renderStatus();

  await screen.findByTestId("auto-update-error");
  expect(textOf("auto-update-error")).toContain("ENOTFOUND");
});

it("diz que a verificação está desligada quando não há updater ativo", async () => {
  ipcMock.getUpdateStatus.mockResolvedValue({
    enabled: false,
    phase: "disabled",
    lastCheckedAt: null,
    version: null,
    message: null,
  });

  renderStatus();

  await screen.findByTestId("auto-update-phase");
  expect(textOf("auto-update-phase")).toContain(
    "Atualização automática desligada.",
  );
  expect(screen.queryByTestId("auto-update-last-check")).toBeNull();
});

it("atualiza a tela quando o main empurra um novo estado", async () => {
  ipcMock.getUpdateStatus.mockResolvedValue(STATUS);
  let emit: ((status: unknown) => void) | null = null;
  ipcMock.onAutoUpdateStatus.mockImplementation((callback) => {
    emit = callback;
    return () => {};
  });

  renderStatus();
  await screen.findByTestId("auto-update-phase");

  emit!({
    ...STATUS,
    phase: "downloaded",
    version: "1.15.0",
  });

  await vi.waitFor(() =>
    expect(textOf("auto-update-phase")).toContain(
      "Atualização baixada. Reinicie para aplicar. (1.15.0)",
    ),
  );
});

it("formata o horário e não quebra com valor inesperado", () => {
  expect(formatCheckedAt("2026-09-08T12:00:00.000Z")).toContain("08/09/2026");
  expect(formatCheckedAt("não é data")).toBe("não é data");
});
