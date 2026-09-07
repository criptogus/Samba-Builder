import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { Button } from "@/components/ui/button";

export function DeliveryTestEvidence({
  appId,
  reviewCommit,
}: {
  appId: number;
  reviewCommit: string;
}) {
  const query = useQuery({
    queryKey: ["delivery-test-evidence", appId],
    queryFn: () => ipc.delivery.testEvidence({ appId }),
    refetchOnWindowFocus: false,
  });
  return (
    <section
      aria-label="Testes executados"
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Testes executados pelo Samba</h3>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Atualizar execuções
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Resultados registrados pelo executor, separados da revisão manual. Um
        teste aprovado cobre apenas os casos executados.
      </p>
      {query.isPending && <p role="status">Carregando execuções…</p>}
      {query.error && (
        <p role="alert">
          Não foi possível carregar o histórico. Tente atualizar.
        </p>
      )}
      {query.data?.length === 0 && (
        <p className="text-sm">
          Nenhuma execução registrada. Execute os testes no painel Tests ou pelo
          agente.
        </p>
      )}
      {query.data?.map((run) => (
        <div key={run.id} className="space-y-1 border-t pt-3 text-sm">
          <p className="font-medium">
            {run.status === "passed"
              ? "Aprovado"
              : run.status === "failed"
                ? "Falhou"
                : "Inconclusivo"}{" "}
            · {new Date(run.startedAt).toLocaleString()}
          </p>
          <p>
            {run.passed} aprovados · {run.failed} falhas · {run.inconclusive}{" "}
            inconclusivos · {run.files} arquivos ·{" "}
            {Math.round((run.finishedAt - run.startedAt) / 1000)} s
          </p>
          <p className="text-muted-foreground">
            {run.commit
              ? `Versão ${run.commit.slice(0, 10)}${reviewCommit === run.commit ? " · corresponde à versão em revisão" : " · não vinculada à revisão atual"}`
              : "Sem versão verificável: alterações locais ou Git indisponível durante a execução."}
          </p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Últimas 30 execuções. Histórico local, sem logs ou dados de clientes.
        Testes externos e execuções anteriores a esta atualização não são
        importados automaticamente.
      </p>
    </section>
  );
}
