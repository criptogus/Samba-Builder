import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { getUserDataPath } from "@/paths/paths";
import { AwsStateSchema, type AwsConfig, type AwsState } from "@/ipc/types/aws";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { withLock } from "@/ipc/utils/lock_utils";
import { awsCommand, cloudCommand, CloudCommandError } from "./aws_cli";
import { prepareAwsSource } from "./aws_source";

const active = new Set<number>();
const statePath = (id: number) =>
  path.join(getUserDataPath(), "cloud-deployments", `aws-${id}.json`);
export async function readAwsState(appId: number): Promise<AwsState | null> {
  let state;
  try {
    state = AwsStateSchema.parse(
      JSON.parse(await fs.readFile(statePath(appId), "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (
    !active.has(appId) &&
    ["preparing", "building", "uploading", "deploying"].includes(state.phase)
  )
    return {
      ...state,
      phase: "interrupted",
      message:
        "A execução local foi interrompida. Confira o serviço AWS antes de publicar novamente.",
    };
  return state;
}
async function saveState(appId: number, state: AwsState) {
  const target = statePath(appId);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(state), { mode: 0o600 });
    await fs.rename(tmp, target);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}
export async function awsIdentity(config: AwsConfig, root: string) {
  const identity = await awsCommand(
    config,
    ["sts", "get-caller-identity"],
    root,
  );
  if (!/^\d{12}$/.test(identity.Account) || typeof identity.Arn !== "string")
    throw new CloudCommandError("Identidade AWS inválida.");
  for (const arn of [
    config.executionRoleArn,
    config.infrastructureRoleArn,
    ...config.secrets.map((s) => s.valueFrom),
  ]) {
    if (arn.split(":")[4] !== identity.Account)
      throw new DyadError(
        "As roles e os segredos devem pertencer à conta AWS selecionada.",
        DyadErrorKind.Precondition,
      );
  }
  return {
    accountId: identity.Account as string,
    identity: identity.Arn as string,
  };
}
export function expressServiceInput(
  config: AwsConfig,
  image: string,
  serviceArn?: string,
) {
  return {
    ...(serviceArn
      ? { serviceArn }
      : {
          serviceName: config.serviceName,
          infrastructureRoleArn: config.infrastructureRoleArn,
        }),
    executionRoleArn: config.executionRoleArn,
    healthCheckPath: config.healthCheckPath,
    primaryContainer: {
      image,
      containerPort: config.port,
      secrets: config.secrets,
    },
    cpu: "256",
    memory: "512",
    scalingTarget: {
      minTaskCount: 1,
      maxTaskCount: 2,
      autoScalingMetric: "AVERAGE_CPU",
      autoScalingTargetValue: 70,
    },
  };
}
export async function deployAws(
  appId: number,
  config: AwsConfig,
  root: string,
  accountId: string,
  sourceDigest: string,
): Promise<AwsState> {
  // Called with app-path, repository, and provider claims. Serialize Docker
  // builds across apps as well, to avoid parallel build memory spikes.
  return withLock("samba-aws-deploy", async () => {
    const identity = await awsIdentity(config, root);
    if (identity.accountId !== accountId)
      throw new DyadError(
        "A conta AWS mudou. Revise a publicação novamente.",
        DyadErrorKind.Precondition,
      );
    const previous = await readAwsState(appId);
    if (
      previous?.serviceArn &&
      (previous.accountId !== accountId ||
        previous.config.region !== config.region ||
        previous.config.serviceName !== config.serviceName ||
        previous.config.infrastructureRoleArn !== config.infrastructureRoleArn)
    )
      throw new DyadError(
        "Este projeto já está vinculado a outro destino AWS. Mantenha conta, região, nome e role de infraestrutura para atualizá-lo.",
        DyadErrorKind.Precondition,
      );
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "samba-aws-"));
    let state: AwsState = {
      config,
      accountId,
      serviceArn: previous?.serviceArn,
      phase: "preparing",
      message: "Preparando contexto Docker",
      updatedAt: new Date().toISOString(),
    };
    let dockerEnv: NodeJS.ProcessEnv = process.env;
    active.add(appId);
    const progress = async (phase: AwsState["phase"], message: string) => {
      state = { ...state, phase, message, updatedAt: new Date().toISOString() };
      await saveState(appId, state);
    };
    try {
      await progress("preparing", "Preparando contexto Docker");
      const context = path.join(workspace, "source");
      await fs.mkdir(context);
      const source = await prepareAwsSource(root, context);
      if (source.sourceDigest !== sourceDigest)
        throw new DyadError(
          "Os arquivos mudaram desde a revisão. Revise novamente antes de publicar.",
          DyadErrorKind.Precondition,
        );
      const dockerHost = (
        process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT
          ? process.env.DOCKER_HOST
          : await cloudCommand(
              "docker",
              ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
              root,
            )
      ).trim();
      if (!/^(unix:\/\/|npipe:\/\/)/.test(dockerHost))
        throw new DyadError(
          "Use um contexto Docker local (Docker Desktop) para esta publicação.",
          DyadErrorKind.Precondition,
        );
      dockerEnv = { ...process.env, DOCKER_HOST: dockerHost };
      delete dockerEnv.DOCKER_CONTEXT;
      const repositoryName = `samba/${config.serviceName}`;
      // Discover first; only create on the specific not-found error.
      let repository;
      try {
        repository = (
          await awsCommand(
            config,
            [
              "ecr",
              "describe-repositories",
              "--repository-names",
              repositoryName,
            ],
            root,
          )
        ).repositories?.[0];
      } catch (error) {
        if (
          !(error instanceof CloudCommandError) ||
          error.providerCode !== "RepositoryNotFoundException"
        )
          throw error;
        repository = (
          await awsCommand(
            config,
            [
              "ecr",
              "create-repository",
              "--repository-name",
              repositoryName,
              "--image-scanning-configuration",
              "scanOnPush=true",
            ],
            root,
          )
        ).repository;
      }
      const registry = `${accountId}.dkr.ecr.${config.region}.amazonaws.com`;
      if (repository?.repositoryUri !== `${registry}/${repositoryName}`)
        throw new CloudCommandError("Destino ECR inesperado.");
      const image = `${repository.repositoryUri}:${randomUUID()}`;
      state.image = image;
      await progress(
        "building",
        "Compilando frontend e backend em uma imagem Linux",
      );
      await cloudCommand(
        "docker",
        ["build", "--platform", "linux/amd64", "--tag", image, context],
        root,
        dockerEnv,
        20 * 60_000,
      );
      await progress("uploading", "Enviando imagem ao ECR");
      const auth = (
        await awsCommand(config, ["ecr", "get-authorization-token"], root)
      ).authorizationData?.find(
        (item: { proxyEndpoint?: string }) =>
          item.proxyEndpoint === `https://${registry}`,
      );
      if (!auth?.authorizationToken)
        throw new CloudCommandError(
          "AWS não retornou autenticação para o ECR selecionado.",
        );
      const dockerConfig = path.join(workspace, "docker");
      await fs.mkdir(dockerConfig, { mode: 0o700 });
      await fs.writeFile(
        path.join(dockerConfig, "config.json"),
        JSON.stringify({
          auths: { [registry]: { auth: auth.authorizationToken } },
        }),
        { mode: 0o600 },
      );
      await cloudCommand(
        "docker",
        ["push", image],
        root,
        { ...dockerEnv, DOCKER_CONFIG: dockerConfig },
        20 * 60_000,
      );
      await progress("deploying", "Solicitando publicação no ECS Express Mode");
      const input = expressServiceInput(config, image, state.serviceArn);
      const inputFile = path.join(workspace, "service.json");
      await fs.writeFile(inputFile, JSON.stringify(input), { mode: 0o600 });
      const result = await awsCommand(
        config,
        [
          "ecs",
          state.serviceArn
            ? "update-express-gateway-service"
            : "create-express-gateway-service",
          "--cli-input-json",
          `file://${inputFile}`,
        ],
        root,
      );
      const arn = result.service?.serviceArn;
      if (
        typeof arn !== "string" ||
        !arn.startsWith(`arn:aws:ecs:${config.region}:${accountId}:service/`)
      )
        throw new CloudCommandError(
          "A resposta não contém o serviço esperado. Confira o console AWS antes de repetir.",
        );
      state.serviceArn = arn;
      await progress(
        "submitted",
        "Publicação solicitada. Acompanhe a disponibilidade do serviço.",
      );
      return state;
    } catch (error) {
      await progress(
        "failed",
        error instanceof DyadError
          ? error.message
          : "Falha na publicação. Confira o console AWS antes de repetir.",
      );
      throw error instanceof DyadError
        ? error
        : new CloudCommandError(state.message);
    } finally {
      active.delete(appId);
      if (state.image)
        await cloudCommand(
          "docker",
          ["image", "rm", state.image],
          root,
          dockerEnv,
        ).catch(() => undefined);
      await fs.rm(workspace, { recursive: true, force: true });
    }
  });
}
export async function refreshAws(appId: number, root: string) {
  const state = await readAwsState(appId);
  if (!state?.serviceArn)
    throw new DyadError(
      "Não há serviço AWS vinculado.",
      DyadErrorKind.Precondition,
    );
  const identity = await awsIdentity(state.config, root);
  if (identity.accountId !== state.accountId)
    throw new DyadError(
      "O perfil AWS aponta para outra conta.",
      DyadErrorKind.Precondition,
    );
  const { service } = await awsCommand(
    state.config,
    [
      "ecs",
      "describe-express-gateway-service",
      "--service-arn",
      state.serviceArn,
    ],
    root,
  );
  const endpoints: string[] = [];
  for (const configuration of service?.activeConfigurations ?? [])
    for (const ingress of configuration.ingressPaths ?? []) {
      const endpoint = ingress.endpoint;
      if (typeof endpoint === "string") {
        const candidate = endpoint.startsWith("https://")
          ? endpoint
          : `https://${endpoint}`;
        try {
          const url = new URL(candidate);
          if (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            !url.port
          )
            endpoints.push(url.href);
        } catch {
          /* ignore malformed provider URLs */
        }
      }
    }
  return {
    status: String(service?.status?.statusCode ?? "UNKNOWN"),
    endpoints: [...new Set(endpoints)],
  };
}
