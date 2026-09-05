import { beforeEach, expect, it, vi } from "vitest";
const call = vi.hoisted(() => vi.fn());
vi.mock("@/ipc/utils/vercel_utils", () => ({
  createVercelClient: () => ({ deployments: { createDeployment: call } }),
}));
import { submitVercelDeployment } from "./vercel_deploy";
const project = {
  id: "prj1",
  name: "website",
  teamId: "team1",
  org: "owner",
  repo: "repo",
  branch: "release",
};
beforeEach(() => {
  call.mockReset();
  call.mockResolvedValue({
    id: "dep1",
    url: "website-preview.vercel.app",
    readyState: "QUEUED",
  });
});
it("creates a preview without production target using the linked team and branch", async () => {
  await expect(
    submitVercelDeployment("private-token", project, "preview"),
  ).resolves.toMatchObject({
    url: "https://website-preview.vercel.app/",
    state: "QUEUED",
  });
  expect(call).toHaveBeenCalledWith({
    teamId: "team1",
    requestBody: {
      name: "website",
      project: "prj1",
      gitSource: { type: "github", org: "owner", repo: "repo", ref: "release" },
    },
  });
});
it("sets production only when explicitly requested", async () => {
  await submitVercelDeployment("token", project, "production");
  expect(call.mock.calls[0][0].requestBody.target).toBe("production");
});
it("does not project provider errors or misleading URLs", async () => {
  call.mockRejectedValue(new Error("Authorization Bearer private-token"));
  await expect(
    submitVercelDeployment("token", project, "preview"),
  ).rejects.toThrow("Confira o token");
  call.mockResolvedValue({ id: "id", url: "evil.example" });
  await expect(
    submitVercelDeployment("token", project, "preview"),
  ).rejects.toThrow("Confira o token");
});
