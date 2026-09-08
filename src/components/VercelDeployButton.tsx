import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";

export function VercelDeployButton({ appId }: { appId: number }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<"preview" | "production">("preview");
  const deploy = useMutation({
    mutationFn: () => ipc.vercel.deploy({ appId, target }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.vercel.deployments({ appId }),
      }),
  });
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm">
        Publicar a versão enviada ao GitHub na branch vinculada. Envie suas
        alterações ao GitHub antes de publicar.
      </p>
      <div className="flex gap-2" aria-label="Destino Vercel">
        <Button
          variant="outline"
          aria-pressed={target === "preview"}
          disabled={deploy.isPending}
          onClick={() => setTarget("preview")}
        >
          Preview para testar
        </Button>
        <Button
          variant="outline"
          aria-pressed={target === "production"}
          disabled={deploy.isPending}
          onClick={() => setTarget("production")}
        >
          Produção — site público
        </Button>
      </div>
      <Button disabled={deploy.isPending} onClick={() => deploy.mutate()}>
        {deploy.isPending
          ? "Solicitando publicação…"
          : target === "production"
            ? "Publicar em produção na Vercel"
            : "Criar preview na Vercel"}
      </Button>
      {deploy.error && (
        <p role="alert" className="text-sm text-destructive">
          {deploy.error.message}
        </p>
      )}
      {deploy.data && (
        <p role="status" className="text-sm">
          Publicação solicitada ({deploy.data.state}).{" "}
          <button
            className="underline"
            onClick={() => ipc.system.openExternalUrl(deploy.data!.url)}
          >
            Abrir URL
          </button>
        </p>
      )}
    </div>
  );
}
