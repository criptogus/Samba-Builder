import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const github = vi.hoisted(() => ({
  getPullRequest: vi.fn(),
  createPullRequest: vi.fn(),
  mergePullRequest: vi.fn(),
  openExternalUrl: vi.fn(),
}));
const toast = vi.hoisted(() => ({ showSuccess: vi.fn(), showError: vi.fn() }));

vi.mock("@/ipc/types", () => ({
  ipc: {
    github: {
      getPullRequest: github.getPullRequest,
      createPullRequest: github.createPullRequest,
      mergePullRequest: github.mergePullRequest,
    },
    system: { openExternalUrl: github.openExternalUrl },
  },
}));
vi.mock("@/lib/toast", () => ({
  showSuccess: toast.showSuccess,
  showError: toast.showError,
}));

import { GithubPullRequestActions } from "./GithubPullRequestActions";

function renderActions(branch: string | null = "feature/login") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <GithubPullRequestActions appId={1} branch={branch} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("não aparece quando não há branch selecionada", () => {
  renderActions(null);

  expect(screen.queryByTestId("pull-request-actions")).toBeNull();
  expect(github.getPullRequest).not.toHaveBeenCalled();
});

it("não aparece quando a integração ainda não está pronta", async () => {
  github.getPullRequest.mockRejectedValue(new Error("Not authenticated"));

  renderActions();

  await screen.findByTestId("pull-request-actions");
  await vi.waitFor(() =>
    expect(screen.queryByTestId("pull-request-actions")).toBeNull(),
  );
});

it("abre um pull request com o título informado", async () => {
  github.getPullRequest.mockResolvedValue(null);
  github.createPullRequest.mockResolvedValue({
    number: 12,
    url: "https://github.com/acme/app/pull/12",
    title: "Revisa o login",
    state: "open",
    head: "feature/login",
    base: "main",
    draft: false,
  });

  renderActions();

  // O botão só habilita depois que a consulta de PR resolve.
  const createButton = await screen.findByTestId("create-pull-request-button");
  await vi.waitFor(() =>
    expect((createButton as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(createButton);
  fireEvent.change(await screen.findByTestId("pull-request-title-input"), {
    target: { value: "Revisa o login" },
  });
  fireEvent.click(screen.getByTestId("confirm-create-pull-request"));

  await vi.waitFor(() =>
    expect(github.createPullRequest).toHaveBeenCalledWith({
      appId: 1,
      title: "Revisa o login",
    }),
  );
  await vi.waitFor(() =>
    expect(toast.showSuccess).toHaveBeenCalledWith("Pull request #12 aberto."),
  );
});

it("mostra o pull request aberto e mescla depois da confirmação", async () => {
  github.getPullRequest.mockResolvedValue({
    number: 7,
    url: "https://github.com/acme/app/pull/7",
    title: "Revisa o login",
    state: "open",
    head: "feature/login",
    base: "main",
    draft: false,
  });
  github.mergePullRequest.mockResolvedValue({
    merged: true,
    message: "Pull Request successfully merged",
    sha: "abc123",
  });

  renderActions();

  expect(await screen.findByText("PR #7 aberto")).toBeTruthy();
  fireEvent.click(screen.getByTestId("merge-pull-request-button"));

  expect(screen.getByText(/feature\/login → main/)).toBeTruthy();

  fireEvent.click(screen.getByTestId("confirm-merge-pull-request"));

  await vi.waitFor(() =>
    expect(github.mergePullRequest).toHaveBeenCalledWith({
      appId: 1,
      number: 7,
      method: "squash",
    }),
  );
  await vi.waitFor(() =>
    expect(toast.showSuccess).toHaveBeenCalledWith("Pull request mesclado."),
  );
});

it("mostra no aviso o erro devolvido pelo GitHub", async () => {
  github.getPullRequest.mockResolvedValue(null);
  github.createPullRequest.mockRejectedValue(
    new Error("A pull request from feature/login is already open."),
  );

  renderActions();

  const createButton = await screen.findByTestId("create-pull-request-button");
  await vi.waitFor(() =>
    expect((createButton as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(createButton);
  fireEvent.change(await screen.findByTestId("pull-request-title-input"), {
    target: { value: "Revisa o login" },
  });
  fireEvent.click(screen.getByTestId("confirm-create-pull-request"));

  await vi.waitFor(() =>
    expect(toast.showError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "A pull request from feature/login is already open.",
      }),
    ),
  );
});
