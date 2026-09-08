import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const fake = vi.hoisted(() => ({ root: "", aws: vi.fn(), command: vi.fn() }));
vi.mock("@/paths/paths", () => ({ getUserDataPath: () => fake.root }));
vi.mock("./aws_cli", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./aws_cli")>()),
  awsCommand: fake.aws,
  cloudCommand: fake.command,
}));
import { deployAws, expressServiceInput, readAwsState } from "./aws_deploy";
import { prepareAwsSource } from "./aws_source";
import { AwsConfigSchema } from "@/ipc/types/aws";
const config = AwsConfigSchema.parse({
  serviceName: "test-site",
  executionRoleArn: "arn:aws:iam::123456789012:role/execute",
  infrastructureRoleArn: "arn:aws:iam::123456789012:role/infra",
});
const serviceArn =
  "arn:aws:ecs:us-east-1:123456789012:service/default/test-site";
let source: string;
let inputs: Record<string, unknown>[];
let tokenFile: string;
beforeEach(async () => {
  vi.clearAllMocks();
  inputs = [];
  tokenFile = "";
  fake.root = await fs.mkdtemp(path.join(os.tmpdir(), "aws-deploy-test-"));
  source = path.join(fake.root, "source");
  await fs.mkdir(source);
  await fs.writeFile(path.join(source, "Dockerfile"), "FROM scratch");
  fake.command.mockImplementation(async (_command, args, _cwd, env) => {
    if (args[0] === "context") return "unix:///tmp/docker.sock";
    if (args[0] === "push") {
      tokenFile = path.join(env.DOCKER_CONFIG, "config.json");
      expect(await fs.readFile(tokenFile, "utf8")).toContain("private-token");
      expect(env.DOCKER_HOST).toBe("unix:///tmp/docker.sock");
    }
    return "";
  });
  fake.aws.mockImplementation(async (_config, args) => {
    if (args[0] === "sts")
      return {
        Account: "123456789012",
        Arn: "arn:aws:iam::123456789012:user/test",
      };
    if (args[1] === "describe-repositories")
      return {
        repositories: [
          {
            repositoryUri:
              "123456789012.dkr.ecr.us-east-1.amazonaws.com/samba/test-site",
          },
        ],
      };
    if (args[1] === "get-authorization-token")
      return {
        authorizationData: [
          {
            proxyEndpoint:
              "https://123456789012.dkr.ecr.us-east-1.amazonaws.com",
            authorizationToken: "private-token",
          },
        ],
      };
    if (args[0] === "ecs") {
      inputs.push(JSON.parse(await fs.readFile(args[3].slice(7), "utf8")));
      return { service: { serviceArn } };
    }
    throw new Error("unexpected AWS call");
  });
});
afterEach(async () => {
  await fs.rm(fake.root, { recursive: true, force: true });
});
describe("AWS publication", () => {
  it("creates then updates the same service and removes temporary credentials", async () => {
    const { sourceDigest } = await prepareAwsSource(source);
    const result = await deployAws(
      1,
      config,
      source,
      "123456789012",
      sourceDigest,
    );
    expect(result.phase).toBe("submitted");
    expect(result.serviceArn).toBe(serviceArn);
    expect(inputs[0]).toMatchObject({
      serviceName: "test-site",
      infrastructureRoleArn: config.infrastructureRoleArn,
    });
    await expect(fs.stat(tokenFile)).rejects.toThrow();
    expect(JSON.stringify(await readAwsState(1))).not.toContain(
      "private-token",
    );
    await deployAws(1, config, source, "123456789012", sourceDigest);
    expect(inputs[1]).toMatchObject({ serviceArn });
    expect(inputs[1]).not.toHaveProperty("infrastructureRoleArn");
  });
  it("refuses an account change before creating resources or running Docker", async () => {
    await expect(
      deployAws(1, config, source, "999999999999", "0".repeat(64)),
    ).rejects.toThrow("conta AWS mudou");
    expect(fake.command).not.toHaveBeenCalled();
    expect(fake.aws).toHaveBeenCalledTimes(1);
  });
  it("rejects edits made after review before any cloud writes", async () => {
    await expect(
      deployAws(1, config, source, "123456789012", "0".repeat(64)),
    ).rejects.toThrow("arquivos mudaram");
    expect(fake.aws.mock.calls.every((call) => call[1][0] === "sts")).toBe(
      true,
    );
    expect((await readAwsState(1))?.phase).toBe("failed");
  });
  it("bounds scaling and preserves secret references", () => {
    expect(expressServiceInput(config, "image")).toMatchObject({
      cpu: "256",
      memory: "512",
      scalingTarget: { minTaskCount: 1, maxTaskCount: 2 },
    });
  });
});
