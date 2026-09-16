import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppVersion } from "@/hooks/useAppVersion";
import { ipc } from "@/ipc/types";
import type { AutoUpdateStatusSnapshot } from "@/ipc/types/system";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Versão instalada + o que aconteceu na última verificação de atualização.
 *
 * Sem isso o switch de auto-update é uma promessa sem retorno: a pessoa liga e
 * não tem como saber se o app verificou, se está atualizado ou se falhou.
 */

const PHASE_LABEL: Record<AutoUpdateStatusSnapshot["phase"], string> = {
  disabled: "Atualização automática desligada.",
  checking: "Verificando atualizações…",
  "up-to-date": "Nenhuma atualização disponível.",
  "update-available": "Atualização encontrada; baixando…",
  downloading: "Baixando atualização…",
  downloaded: "Atualização baixada. Reinicie para aplicar.",
  error: "A última verificação falhou.",
};

export function formatCheckedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AutoUpdateStatus() {
  const appVersion = useAppVersion();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: queryKeys.system.updateStatus,
    queryFn: () => ipc.system.getUpdateStatus(),
    meta: { showErrorToast: true },
  });

  // O main empurra cada mudança de estado; o evento só atualiza o que já está
  // em cache, então a tela nunca fica com um retrato velho na mão.
  useEffect(() => {
    return ipc.events.system.onAutoUpdateStatus((status) => {
      queryClient.setQueryData(queryKeys.system.updateStatus, status);
    });
  }, [queryClient]);

  const phase = data?.phase ?? "disabled";

  return (
    <div
      className="space-y-0.5 text-sm text-gray-500 dark:text-gray-400"
      data-testid="auto-update-status"
    >
      <p data-testid="auto-update-version">
        Versão instalada: {appVersion ?? "—"}
      </p>
      <p data-testid="auto-update-phase">
        {PHASE_LABEL[phase]}
        {data?.version ? ` (${data.version})` : ""}
      </p>
      {data?.lastCheckedAt && (
        <p data-testid="auto-update-last-check">
          Última verificação: {formatCheckedAt(data.lastCheckedAt)}
        </p>
      )}
      {phase === "error" && data?.message && (
        <p data-testid="auto-update-error" className="break-words">
          {data.message}
        </p>
      )}
    </div>
  );
}
