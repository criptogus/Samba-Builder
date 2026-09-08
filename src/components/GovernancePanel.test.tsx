import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GovernancePanel } from "./GovernancePanel";
import type {
  GovernanceRunResult,
  GovernanceStatus,
} from "@/ipc/types/governance";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  run: vi.fn(),
}));
vi.mock("@/ipc/types", () => ({
  governanceClient: { get: mocks.get, run: mocks.run },
}));

const governedDraft = (
  overrides: Partial<GovernanceStatus> = {},
): GovernanceStatus => ({
  mode: "governed",
  stage: "draft",
  vetos: 0,
  roles: { owner: ["ana@corp.com"], tech: [], reviewer: [], admin: [] },
  lastAudit: null,
  actingAs: "ana@corp.com",
  gateAvailable: true,
  gateError: null,
  ...overrides,
});

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderPanel = (client: QueryClient) =>
  render(
    <QueryClientProvider client={client}>
      <GovernancePanel appPath="/projects/demo" />
    </QueryClientProvider>,
  );

describe("GovernancePanel", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.run.mockReset();
  });

  it("renders a governed project's cycle state and action buttons", async () => {
    mocks.get.mockResolvedValue(
      governedDraft({ stage: "in_review", vetos: 1 }),
    );
    renderPanel(makeQueryClient());

    expect(await screen.findByText("governed")).toBeTruthy();
    expect(screen.getByText(/In review/)).toBeTruthy();
    expect(screen.getByText(/1 veto/)).toBeTruthy();

    const approve = screen.getByRole("button", {
      name: "Approve",
    }) as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
    const submit = screen.getByRole("button", {
      name: "Submit",
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("runs submit through the governance handler and surfaces the result", async () => {
    mocks.get.mockResolvedValue(governedDraft());
    const runResult: GovernanceRunResult = {
      ok: true,
      exitCode: 0,
      output: "Projeto submetido para aprovação (in_review)",
      status: governedDraft({ stage: "in_review" }),
    };
    mocks.run.mockResolvedValue(runResult);
    renderPanel(makeQueryClient());

    fireEvent.click(await screen.findByRole("button", { name: "Submit" }));

    await vi.waitFor(() =>
      expect(mocks.run).toHaveBeenCalledWith({
        appPath: "/projects/demo",
        action: "submit",
        by: undefined,
      }),
    );
    expect(await screen.findByText(/submetido/i)).toBeTruthy();
  });
});
