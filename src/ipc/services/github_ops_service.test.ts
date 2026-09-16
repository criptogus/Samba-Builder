import { beforeEach, describe, expect, it, vi } from "vitest";
import { SambaErrorKind } from "@/errors/samba_error";
import { activeRecordings } from "./recording_registry";
import {
  getGithubOperationResources,
  GithubOpsService,
} from "./github_ops_service";

const handlers = vi.hoisted(() => ({
  disconnect: vi.fn<() => Promise<void>>(),
  push: vi.fn<() => Promise<void>>(),
  pull: vi.fn<() => Promise<void>>(),
  autoPullRequest: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("../handlers/github_handlers", () => ({
  handlePushToGithub: handlers.push,
  handleAbortRebase: vi.fn(),
  handleConnectToExistingRepo: vi.fn(),
  handleContinueRebase: vi.fn(),
  handleCreateRepo: vi.fn(),
  handleDisconnectGithubRepo: handlers.disconnect,
  handleGetGitState: vi.fn(),
  handleGetMergeConflicts: vi.fn(),
  handleRebaseFromGithub: vi.fn(),
  // PR automático (REQ-32): o push não pode depender dele.
  ensurePullRequestAfterPush: handlers.autoPullRequest,
}));

vi.mock("../handlers/git_branch_handlers", () => ({
  handleAbortMerge: vi.fn(),
  handleCreateBranch: vi.fn(),
  handleDeleteBranch: vi.fn(),
  handleFetchFromGithub: vi.fn(),
  handleMergeBranch: vi.fn(),
  handlePullFromGithub: handlers.pull,
  handleRenameBranch: vi.fn(),
  handleSwitchBranch: vi.fn(),
}));

describe("GithubOpsService lifecycle", () => {
  beforeEach(() => {
    activeRecordings.clear();
    handlers.disconnect.mockReset();
    handlers.pull.mockReset();
    handlers.pull.mockResolvedValue(undefined);
    handlers.autoPullRequest.mockReset();
    handlers.autoPullRequest.mockResolvedValue(null);
    handlers.push.mockReset();
  });

  it("coordinates metadata-only disconnects without claiming the repository", () => {
    expect(getGithubOperationResources({ type: "disconnect" })).toEqual([
      "metadata",
    ]);
    expect(
      getGithubOperationResources({
        type: "connect-repo",
        mode: "create",
        org: "samba",
        repo: "app",
        branch: "main",
        thenAutoPush: false,
      }),
    ).toEqual([
      { resource: "app-path", mode: "read" },
      "metadata",
      "repository",
    ]);
  });

  it("rejects queued operations after the deletion fence is raised", async () => {
    const service = new GithubOpsService();
    service.beginAppDeletion(7);

    await expect(
      service.run(7, { type: "push", mode: "normal" }),
    ).rejects.toMatchObject({ kind: SambaErrorKind.Precondition });
    expect(handlers.push).not.toHaveBeenCalled();

    service.endAppDeletion(7);
  });

  it("refuses repository operations during recording but allows metadata-only disconnect", async () => {
    const service = new GithubOpsService();
    activeRecordings.set(7, {
      appId: 7,
      stop: () => {},
      done: Promise.resolve({ envRestored: true }),
    });
    handlers.disconnect.mockResolvedValue();

    await expect(
      service.run(7, { type: "push", mode: "normal" }),
    ).rejects.toMatchObject({ kind: SambaErrorKind.Precondition });
    await expect(
      service.run(7, { type: "disconnect" }),
    ).resolves.toBeUndefined();

    expect(handlers.push).not.toHaveBeenCalled();
    expect(handlers.disconnect).toHaveBeenCalledOnce();
  });

  it("rejects every app while a full reset is fenced", async () => {
    const service = new GithubOpsService();
    service.beginReset();

    await expect(
      service.run(7, { type: "push", mode: "normal" }),
    ).rejects.toMatchObject({ kind: SambaErrorKind.Precondition });
    await expect(
      service.run(8, { type: "push", mode: "normal" }),
    ).rejects.toMatchObject({ kind: SambaErrorKind.Precondition });
    expect(handlers.push).not.toHaveBeenCalled();

    service.endReset();
    handlers.push.mockResolvedValue();
    await expect(
      service.run(7, { type: "push", mode: "normal" }),
    ).resolves.toBeUndefined();
  });

  it("keeps settlement pending until an admitted operation finishes", async () => {
    let release!: () => void;
    handlers.push.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const service = new GithubOpsService();
    const run = service.run(7, { type: "push", mode: "normal" });
    await vi.waitFor(() => expect(handlers.push).toHaveBeenCalledOnce());

    let settled = false;
    const settlement = service.settle(7).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    release();
    await expect(run).resolves.toBeUndefined();
    await settlement;
    expect(settled).toBe(true);
  });

  it("sincronizar começa baixando do remoto", async () => {
    const service = new GithubOpsService();

    await service.run(7, { type: "sync" });

    expect(handlers.pull).toHaveBeenCalledWith(undefined, { appId: 7 });
    // O push do sync é o próximo passo do composto, não desta chamada.
    expect(handlers.push).not.toHaveBeenCalled();
  });

  it("tenta o pull request automático depois do push", async () => {
    handlers.push.mockResolvedValue(undefined);
    const service = new GithubOpsService();

    await service.run(7, { type: "push", mode: "normal" });

    expect(handlers.autoPullRequest).toHaveBeenCalledWith(7);
  });

  it("no sync, o pull request automático só entra depois do push do composto", async () => {
    handlers.push.mockResolvedValue(undefined);
    const service = new GithubOpsService();

    // 1) O sync começa baixando: baixar não é motivo para abrir PR.
    await service.run(7, { type: "sync" });
    expect(handlers.pull).toHaveBeenCalledOnce();
    expect(handlers.autoPullRequest).not.toHaveBeenCalled();

    // 2) A máquina encadeia `run-op push` (compositeNext) e é esse push — um
    // push de verdade, igual ao avulso — que abre o PR.
    await service.run(7, { type: "push", mode: "normal" });
    expect(handlers.autoPullRequest).toHaveBeenCalledOnce();
    expect(handlers.autoPullRequest).toHaveBeenCalledWith(7);
  });

  it("não derruba o push quando o pull request automático falha", async () => {
    handlers.push.mockResolvedValue(undefined);
    handlers.autoPullRequest.mockRejectedValue(new Error("sem permissão"));
    const service = new GithubOpsService();

    await expect(
      service.run(7, { type: "push", mode: "normal" }),
    ).resolves.toBeUndefined();
  });
});
