vi.mock("@/ipc/utils/git_utils", () => ({
  isGitStatusClean: vi.fn(async () => true),
  gitCurrentBranch: vi.fn(async () => "main"),
}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSchema } from "../../../packages/samba-factory/src/schema";
const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
  readStore: vi.fn(),
  readSources: vi.fn(),
  findApp: vi.fn(),
}));
vi.mock("@/db", () => ({
  db: { query: { apps: { findFirst: mocks.findApp } } },
}));
vi.mock("@/db/schema", () => ({ apps: { id: "id" } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/paths/paths", () => ({ getSambaAppPath: (value: string) => value }));
vi.mock("@/ipc/services/factory/store", () => ({
  getFactoryProject: mocks.getProject,
  readFactoryStore: mocks.readStore,
}));
vi.mock("@/ipc/services/factory/files", () => ({
  readFactorySources: mocks.readSources,
}));
import {
  assertFactoryChat,
  assertFactoryRelease,
  factoryReleaseBlockers,
  getFactoryPrompt,
} from "@/ipc/services/factory/guards";
const project = () =>
  ProjectSchema.parse({
    appId: 1,
    client: "Cliente A",
    name: "Portal",
    brief: "Contrato",
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
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getProject.mockResolvedValue(project());
  mocks.findApp.mockResolvedValue({ id: 1, path: "/app" });
  mocks.readSources.mockResolvedValue({ digest: "current" });
});
describe("main-process policy boundary", () => {
  it("blocks publication when the scanned working tree has uncommitted changes", async () => {
    const { isGitStatusClean } = await import("@/ipc/utils/git_utils");
    vi.mocked(isGitStatusClean).mockResolvedValueOnce(false);
    expect((await factoryReleaseBlockers(1)).join(" ")).toContain(
      "Faça commit",
    );
  });
  it("blocks Agent and legacy Build without approval", async () => {
    await expect(assertFactoryChat(1, "local-agent")).rejects.toThrow(/plano/);
    await expect(assertFactoryChat(1, "build")).rejects.toThrow(/plano/);
  });
  it("allows read-only discovery", async () => {
    await expect(assertFactoryChat(1, "ask")).resolves.toBeUndefined();
  });
  it("rejects any cross-app context for a managed client", async () => {
    await expect(assertFactoryChat(1, "ask", [2])).rejects.toThrow(
      /outros aplicativos/,
    );
  });
  it("rejects pulling a managed client's context into an unmanaged app", async () => {
    mocks.getProject.mockImplementation(async (id: number) =>
      id === 2 ? project() : undefined,
    );
    await expect(assertFactoryChat(1, "ask", [2])).rejects.toThrow(
      /outro aplicativo/,
    );
  });
  it("preserves unmanaged app behavior", async () => {
    mocks.getProject.mockResolvedValue(undefined);
    await expect(assertFactoryChat(1, "local-agent")).resolves.toBeUndefined();
    await expect(assertFactoryRelease(1)).resolves.toBeUndefined();
    expect(mocks.readSources).not.toHaveBeenCalled();
  });
  it("fails before publish for an unverified managed project", async () => {
    await expect(assertFactoryRelease(1)).rejects.toThrow(/Security Gate/);
  });
  it("assembles only current project context", async () => {
    const prompt = await getFactoryPrompt(1);
    expect(prompt).toContain("Cliente A");
    expect(prompt).not.toContain("Cliente B");
  });
});
