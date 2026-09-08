import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useIsMutating,
} from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import {
  AwsConfigSchema,
  type AwsConfig,
  type AwsState,
} from "@/ipc/types/aws";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AwsConnector({ appId }: { appId: number }) {
  const deploying = useIsMutating({ mutationKey: queryKeys.aws.deploy(appId) });
  const state = useQuery({
    queryKey: queryKeys.aws.status(appId),
    queryFn: () => ipc.aws.status({ appId }),
    refetchInterval: (query) =>
      deploying ||
      (query.state.data &&
        ["preparing", "building", "uploading", "deploying"].includes(
          query.state.data.phase,
        ))
        ? 3000
        : false,
  });
  if (state.isPending) return <p>Carregando conexão AWS…</p>;
  if (state.error) return <p role="alert">{state.error.message}</p>;
  return (
    <AwsForm
      key={appId}
      appId={appId}
      initial={state.data?.config}
      state={state.data}
    />
  );
}
function AwsForm({
  appId,
  initial,
  state,
}: {
  appId: number;
  initial?: AwsConfig;
  state: AwsState | null;
}) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<AwsConfig>(
    initial ?? {
      profile: "default",
      region: "us-east-1",
      serviceName: `samba-app-${appId}`,
      executionRoleArn: "",
      infrastructureRoleArn: "",
      port: 3000,
      healthCheckPath: "/",
      secrets: [],
    },
  );
  const [secretsText, setSecretsText] = useState(
    JSON.stringify(config.secrets, null, 2),
  );
  const review = useMutation({
    mutationFn: async () => {
      const snapshot = AwsConfigSchema.parse({
        ...config,
        secrets: JSON.parse(secretsText),
      });
      return {
        config: snapshot,
        ...(await ipc.aws.review({ appId, config: snapshot })),
      };
    },
  });
  const deploy = useMutation({
    mutationKey: queryKeys.aws.deploy(appId),
    mutationFn: async () => {
      if (!review.data) throw new Error("Revise o destino primeiro.");
      const { config: reviewed, accountId, sourceDigest } = review.data;
      return ipc.aws.deploy({
        appId,
        config: reviewed,
        accountId,
        sourceDigest,
      });
    },
    onSettled: () => {
      review.reset();
      return queryClient.invalidateQueries({
        queryKey: queryKeys.aws.status(appId),
      });
    },
  });
  const refresh = useMutation({ mutationFn: () => ipc.aws.refresh({ appId }) });
  const busy =
    review.isPending ||
    deploy.isPending ||
    (!!state &&
      ["preparing", "building", "uploading", "deploying"].includes(
        state.phase,
      ));
  function edit<K extends keyof AwsConfig>(key: K, value: AwsConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    review.reset();
    deploy.reset();
  }
  const fields = [
    ["profile", "Perfil AWS CLI", "default"],
    ["region", "Região AWS", "us-east-1"],
    ["serviceName", "Nome do serviço", "meu-site"],
    [
      "executionRoleArn",
      "Role de execução ECS (ARN)",
      "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
    ],
    [
      "infrastructureRoleArn",
      "Role de infraestrutura ECS (ARN)",
      "arn:aws:iam::123456789012:role/ecsInfrastructureRole",
    ],
    ["healthCheckPath", "Rota de saúde", "/health"],
  ] as const;
  return (
    <div className="space-y-4" data-testid="aws-connector">
      <div>
        <h3 className="font-semibold">AWS — frontend e backend</h3>
        <p className="text-sm text-muted-foreground">
          O Dockerfile na raiz deve compilar o frontend e iniciar o backend,
          servindo a aplicação na porta abaixo. O ECS Express Mode cuida do
          endereço HTTPS e da escala.
        </p>
      </div>
      <p className="text-sm">
        Requer AWS CLI v2 com perfil autenticado, Docker em execução e as duas
        roles ECS na sua conta. Segredos são referências ao Secrets Manager ou
        SSM; arquivos .env não são enviados.
      </p>
      <fieldset disabled={busy} className="grid gap-3">
        {fields.map(([key, label, placeholder]) => (
          <label key={key} className="grid gap-1 text-sm">
            {label}
            <Input
              value={config[key]}
              placeholder={placeholder}
              onChange={(e) => edit(key, e.target.value)}
            />
          </label>
        ))}
        <label className="grid gap-1 text-sm">
          Porta do backend
          <Input
            type="number"
            min={1}
            max={65535}
            value={config.port}
            onChange={(e) => edit("port", Number(e.target.value))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Segredos opcionais — lista JSON de name e valueFrom (ARN)
          <textarea
            className="min-h-20 rounded border bg-background p-2 font-mono text-xs"
            value={secretsText}
            onChange={(e) => {
              setSecretsText(e.target.value);
              review.reset();
            }}
          />
        </label>
      </fieldset>
      <Button variant="outline" disabled={busy} onClick={() => review.mutate()}>
        {review.isPending
          ? "Verificando conta e projeto…"
          : "Revisar publicação AWS"}
      </Button>
      {review.data && (
        <div
          className="space-y-2 rounded border p-3 text-sm"
          data-testid="aws-review"
        >
          <p>
            <strong>Conta {review.data.accountId}</strong> ·{" "}
            {review.data.config.region}
          </p>
          <p>
            {review.data.config.serviceName} · {review.data.sourceFiles}{" "}
            arquivos · {(review.data.sourceBytes / 1024 / 1024).toFixed(1)} MB
          </p>
          <p>
            Será criada ou atualizada uma aplicação pública no ECS, com imagem
            no ECR, balanceador e 1 a 2 tarefas de 0,25 vCPU / 512 MB. A AWS
            cobra por esses recursos enquanto estiverem ativos. Banco de dados é
            configurado separadamente.
          </p>
          <Button disabled={busy} onClick={() => deploy.mutate()}>
            {deploy.isPending ? "Publicando…" : "Publicar nesta conta AWS"}
          </Button>
        </div>
      )}
      {deploy.isPending && (
        <p role="status">
          Publicando frontend e backend. A compilação e o envio podem levar
          alguns minutos.
        </p>
      )}
      {[review.error, deploy.error, refresh.error]
        .filter(Boolean)
        .map((error, i) => (
          <p key={i} role="alert" className="text-sm text-destructive">
            {error!.message}
          </p>
        ))}
      {state && (
        <div className="space-y-2 border-t pt-3 text-sm">
          <p>Última execução: {state.message}</p>
          {state.serviceArn && (
            <>
              <Button
                variant="outline"
                disabled={busy || refresh.isPending}
                onClick={() => refresh.mutate()}
              >
                Consultar status AWS
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  ipc.system.openExternalUrl(
                    `https://${state.config.region}.console.aws.amazon.com/ecs/v2/clusters?region=${state.config.region}`,
                  )
                }
              >
                Console AWS
              </Button>
            </>
          )}
        </div>
      )}
      {refresh.data && (
        <div role="status" className="text-sm">
          <p>Estado AWS: {refresh.data.status}</p>
          {refresh.data.endpoints.map((url) => (
            <button
              key={url}
              className="block break-all underline"
              onClick={() => ipc.system.openExternalUrl(url)}
            >
              {url}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
