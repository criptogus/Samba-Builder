import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { PropsWithChildren } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { emptyDeliveryPlan } from "@/delivery/model";
import { emptyManagement } from "@/management/model";
import i18n from "@/i18n";
import { ProjectCoachPanel } from "./ProjectCoachPanel";

const mocks = vi.hoisted(() => ({
  streamMessage: vi.fn(),
  getDelivery: vi.fn(),
  getManagement: vi.fn(),
  getMetrics: vi.fn(),
}));

vi.mock("@/hooks/useStreamChat", () => ({
  useStreamChat: () => ({
    streamMessage: mocks.streamMessage,
    isStreaming: false,
  }),
}));

vi.mock("@/ipc/types", () => ({
  ipc: {
    delivery: { get: mocks.getDelivery },
    management: {
      get: mocks.getManagement,
      metrics: mocks.getMetrics,
    },
  },
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});
afterAll(async () => {
  await i18n.changeLanguage("pt-BR");
});
afterEach(() => {
  cleanup();
});

function wrapper(store: ReturnType<typeof createStore>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    );
  };
}

describe("ProjectCoachPanel", () => {
  beforeEach(() => {
    mocks.streamMessage.mockReset();
    mocks.getDelivery.mockResolvedValue({
      appId: 7,
      revision: 1,
      plan: {
        ...emptyDeliveryPlan(),
        stage: "development",
        dueDate: "2026-09-20",
        client: "Acme",
        owner: "Gus",
        scope: "Pedidos",
        acceptance: "Pedido fecha",
        tasks: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            title: "Tela de login",
            owner: "Gus",
            acceptance: "Entra",
            status: "doing",
            evidence: "",
          },
        ],
      },
    });
    mocks.getManagement.mockResolvedValue({
      revision: 1,
      data: emptyManagement(),
    });
    mocks.getMetrics.mockResolvedValue({
      rates: [],
      deliveryStage: "development",
      approvalCommit: "",
      capturedAt: Date.now(),
      commit: "abc12345",
      codeLines: 800,
      codeFiles: 20,
      addedLines: 10,
      removedLines: 1,
      commits: 5,
      minutes: 120,
      laborCost: 0,
      unpricedMinutes: 0,
      tokens: [
        {
          provider: "openai",
          model: "gpt-4.1",
          source: "local-agent",
          inputTokens: 80_000,
          outputTokens: 90_000,
          calls: 4,
          unknownCalls: 0,
          estimatedCost: null,
        },
      ],
      features: [],
      completedTasks: 0,
    });
  });

  it("mostra o coach da Sol com etapa, tokens e o foco de hoje", async () => {
    const store = createStore();
    store.set(selectedAppIdAtom, 7);
    store.set(selectedChatIdAtom, 3);
    render(<ProjectCoachPanel />, { wrapper: wrapper(store) });

    expect(await screen.findByTestId("project-coach-panel")).toBeTruthy();
    expect(screen.getByText(/Sol is with you/)).toBeTruthy();
    expect(await screen.findByText("Development")).toBeTruthy();
    expect(await screen.findByText("Tela de login")).toBeTruthy();
    expect(await screen.findByText("170,000")).toBeTruthy();
  });

  it("envia o briefing da Sol no chat", async () => {
    const store = createStore();
    store.set(selectedAppIdAtom, 7);
    store.set(selectedChatIdAtom, 3);
    render(<ProjectCoachPanel />, { wrapper: wrapper(store) });

    fireEvent.click(
      await screen.findByRole("button", { name: /Talk with Sol/ }),
    );
    await waitFor(() => {
      expect(mocks.streamMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: 3,
          prompt: expect.stringContaining("/samba-pm"),
        }),
      );
    });
    expect(mocks.streamMessage.mock.calls[0][0].prompt).toContain(
      "Tela de login",
    );
  });
});
