import { beforeEach, expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn());
vi.mock("@/ipc/utils/buffered_process", () => ({ runBufferedProcess: run }));
import { cloudCommand } from "./aws_cli";
beforeEach(() => {
  vi.restoreAllMocks();
  run.mockReset();
  run.mockResolvedValue({
    code: 0,
    stdout: "{}",
    stderr: "",
    stdoutTruncated: false,
  });
});
it("uses direct executable argv on Windows, including paths containing spaces or percent signs", async () => {
  vi.spyOn(process, "platform", "get").mockReturnValue("win32");
  await cloudCommand(
    "aws",
    [
      "ecs",
      "create-express-gateway-service",
      "--cli-input-json",
      "file://C:/Path & %/service.json",
    ],
    "C:/Path & %",
  );
  expect(run.mock.calls[0][0]).toMatchObject({
    command: "aws.exe",
    shell: false,
    args: [
      "ecs",
      "create-express-gateway-service",
      "--cli-input-json",
      "file://C:/Path & %/service.json",
    ],
  });
});
it("redacts arbitrary provider output while preserving the error category", async () => {
  run.mockResolvedValue({
    code: 1,
    stderr: "An error occurred (RepositoryNotFoundException) secret-token",
    stdout: "password",
  });
  try {
    await cloudCommand("aws", ["ecr", "describe-repositories"], "/tmp");
    throw new Error("expected rejection");
  } catch (error) {
    expect(error).toMatchObject({
      providerCode: "RepositoryNotFoundException",
    });
    expect((error as Error).message).not.toContain("secret-token");
  }
});
it("accepts truncated successful Docker build logs but rejects truncated API JSON", async () => {
  run.mockResolvedValue({ code: 0, stdout: "bounded", stdoutTruncated: true });
  await expect(cloudCommand("docker", ["build", "."], "/tmp")).resolves.toBe(
    "bounded",
  );
  await expect(
    cloudCommand("aws", ["sts", "get-caller-identity"], "/tmp"),
  ).rejects.toThrow("limite");
});
