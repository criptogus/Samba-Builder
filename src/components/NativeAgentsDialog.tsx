import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import {
  NATIVE_AGENTS,
  type NativeAgent,
  type NativeRun,
} from "@/shared/native_agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const active = (run?: NativeRun) =>
  !!run && !["completed", "cancelled", "failed"].includes(run.phase);
const phases: Record<NativeRun["phase"], string> = {
  starting: "Iniciando",
  running: "Em execução",
  approval: "Aguardando sua resposta",
  cancelling: "Encerrando processos",
  completed: "Concluído",
  cancelled: "Cancelado",
  failed: "Falhou",
};
export default function NativeAgentsDialog({
  appId,
  onClose,
}: {
  appId: number;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<NativeAgent>("codex");
  const [prompt, setPrompt] = useState("");
  const [runId, setRunId] = useState<string>();
  const [answer, setAnswer] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const current = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  const cache = useQueryClient();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (current.current)
        void ipc.nativeAgents.cancel({ id: current.current }).catch(() => {});
    };
  }, []);
  const status = useQuery({
    queryKey: queryKeys.nativeAgents.status,
    queryFn: () => ipc.nativeAgents.status(),
  });
  const runQuery = useQuery({
    queryKey: queryKeys.nativeAgents.run(runId),
    queryFn: () => ipc.nativeAgents.read({ id: runId! }),
    enabled: !!runId,
    refetchInterval: (query) => (active(query.state.data) ? 500 : false),
    gcTime: 0,
  });
  const run = runQuery.data;
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
  });
  const busy = active(run) || mutation.isPending;
  const installed = status.data?.find((item) => item.provider === provider);
  const agent = NATIVE_AGENTS.find((item) => item.id === provider)!;
  const start = (kind: "login" | "task") =>
    mutation.mutate(async () => {
      const result =
        kind === "login"
          ? await ipc.nativeAgents.login({ provider })
          : await ipc.nativeAgents.start({ provider, appId, prompt });
      current.current = result.id;
      if (!mounted.current) {
        await ipc.nativeAgents.cancel({ id: result.id });
        return;
      }
      cache.setQueryData(queryKeys.nativeAgents.run(result.id), result);
      setRunId(result.id);
      setAnswer("");
    });
  const respond = (allow: boolean) =>
    mutation.mutate(async () => {
      if (!run?.approval) return;
      await ipc.nativeAgents.respond({
        id: run.id,
        approvalId: run.approval.id,
        allow,
        text: answer,
      });
      setAnswer("");
      await runQuery.refetch();
    });
  const error = mutation.error ?? runQuery.error ?? status.error;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agentes locais</DialogTitle>
          <DialogDescription>
            Use os programas oficiais no projeto aberto. O login pertence ao
            provedor; os modelos rodam na nuvem e seguem os limites da sua
            conta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="Escolher agente">
            {NATIVE_AGENTS.map((item) => (
              <Button
                key={item.id}
                variant={provider === item.id ? "default" : "outline"}
                disabled={busy}
                aria-pressed={provider === item.id}
                onClick={() => setProvider(item.id)}
              >
                {item.name}
              </Button>
            ))}
          </div>
          <p className="text-sm">
            {status.isPending
              ? "Procurando programa oficial..."
              : installed?.installed
                ? "Programa encontrado. O login será verificado pelo agente ao executar."
                : "Programa não encontrado. Instale o CLI oficial ou selecione seu executável."}
          </p>
          {installed?.path && (
            <p className="text-xs break-all text-muted-foreground">
              {installed.path}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                mutation.mutate(async () => {
                  await ipc.nativeAgents.selectExecutable({ provider });
                  await status.refetch();
                })
              }
            >
              Selecionar executável
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                mutation.mutate(() =>
                  ipc.system.openExternalUrl(agent.installUrl),
                )
              }
            >
              Como instalar
            </Button>
            <Button
              disabled={busy || !installed?.installed}
              onClick={() => start("login")}
            >
              Entrar pelo programa oficial
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Se já fez login no CLI, pode executar diretamente. A autenticação e
            as credenciais ficam sob controle do programa oficial. Fechar esta
            janela encerra a execução. Cada tarefa inicia uma sessão
            independente.
          </p>
          <label className="block space-y-2">
            <span>Tarefa para o projeto</span>
            <Textarea
              aria-label="Tarefa para o projeto"
              value={prompt}
              maxLength={100000}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={busy}
              placeholder="Descreva o que o agente deve analisar ou alterar neste projeto..."
            />
          </label>
          <div className="flex gap-2">
            <Button
              disabled={busy || !installed?.installed || !prompt.trim()}
              onClick={() => start("task")}
            >
              Executar no projeto
            </Button>
            {active(run) && (
              <Button
                variant="outline"
                disabled={mutation.isPending || run?.phase === "cancelling"}
                onClick={() =>
                  mutation.mutate(async () => {
                    await ipc.nativeAgents.cancel({ id: run!.id });
                    await runQuery.refetch();
                  })
                }
              >
                Cancelar execução
              </Button>
            )}
          </div>
          {run && (
            <section className="space-y-3" aria-label="Execução do agente">
              <p role="status">
                {NATIVE_AGENTS.find((item) => item.id === run.provider)?.name}:{" "}
                {phases[run.phase]}
              </p>
              {run.output && (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border p-3 text-xs">
                  {run.output}
                </pre>
              )}
              {run.approval && (
                <div className="space-y-2 rounded border p-3">
                  <h3 className="font-semibold">{run.approval.title}</h3>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {run.approval.detail}
                  </pre>
                  {run.approval.question && (
                    <Textarea
                      aria-label="Resposta ao agente"
                      value={answer}
                      maxLength={10000}
                      onChange={(event) => setAnswer(event.target.value)}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      disabled={
                        mutation.isPending ||
                        (run.approval.question && !answer.trim())
                      }
                      onClick={() => respond(true)}
                    >
                      {run.approval.question
                        ? "Enviar resposta"
                        : "Permitir uma vez"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => respond(false)}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              )}
              {run.kind === "login" && active(run) && (
                <div className="space-y-2">
                  <p className="text-sm">
                    Siga o endereço e o código exibidos pelo programa. Se ele
                    pedir uma entrada no terminal, envie abaixo.
                  </p>
                  <Input
                    aria-label="Entrada para o login oficial"
                    value={loginInput}
                    maxLength={4000}
                    onChange={(event) => setLoginInput(event.target.value)}
                  />
                  <Button
                    disabled={mutation.isPending || !loginInput.trim()}
                    onClick={() =>
                      mutation.mutate(async () => {
                        await ipc.nativeAgents.loginInput({
                          id: run.id,
                          text: loginInput,
                        });
                        setLoginInput("");
                      })
                    }
                  >
                    Enviar ao login
                  </Button>
                </div>
              )}
              {run.error && (
                <p
                  role="alert"
                  className="text-destructive whitespace-pre-wrap"
                >
                  {run.error}
                </p>
              )}
              {run.phase === "completed" && run.kind === "task" && (
                <p className="text-sm">
                  Revise as alterações do projeto antes de publicar. O agente
                  não cria uma versão no Git automaticamente pelo Samba.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                O painel mantém apenas os últimos 200 mil caracteres da execução
                atual.
              </p>
            </section>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error instanceof Error
                ? error.message
                : "Não foi possível concluir a operação."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
