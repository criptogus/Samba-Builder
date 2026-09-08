import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ManagementSchema,
  TimeEntrySchema,
  RateSchema,
  type Management,
} from "@/management/model";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
export function ProjectManagementPanel({ appId }: { appId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="my-6 rounded-xl border border-border bg-card p-5"
      onToggle={(e) => {
        if (e.currentTarget.open) setOpen(true);
      }}
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Gestão · sprints, esforço e custos
      </summary>
      {open && <ManagementEditor key={appId} appId={appId} />}
    </details>
  );
}
function ManagementEditor({ appId }: { appId: number }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["management", appId],
    queryFn: () => ipc.management.get({ appId }),
  });
  const [sprintId, setSprintId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [person, setPerson] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [inputRate, setInputRate] = useState("");
  const [outputRate, setOutputRate] = useState("");
  const metrics = useQuery({
    queryKey: ["management-metrics", appId, sprintId],
    refetchOnWindowFocus: false,
    queryFn: () =>
      ipc.management.metrics({ appId, ...(sprintId ? { sprintId } : {}) }),
    enabled: !!query.data,
  });
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["management", appId] });
      await qc.invalidateQueries({ queryKey: ["management-metrics", appId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  if (query.isPending) return <p role="status">Carregando gestão…</p>;
  if (query.error)
    return (
      <div role="alert">
        Não foi possível carregar a gestão.{" "}
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
      </div>
    );
  const { data, revision } = query.data;
  const active = data.sprints.find((s) => s.endedAt === null);
  const save = (next: Management) => {
    const parsed = ManagementSchema.parse(next);
    return ipc.management.save({
      appId,
      revision,
      rates: parsed.rates,
      timeEntries: parsed.timeEntries,
    });
  };
  const report = metrics.data;
  const tokens =
    report?.tokens.reduce((a, t) => a + t.inputTokens + t.outputTokens, 0) ?? 0;
  const knownTokenCost =
    report?.tokens.reduce((a, t) => a + (t.estimatedCost ?? 0), 0) ?? 0;
  const unpriced = report?.tokens.some((t) => t.estimatedCost === null);
  return (
    <div className="mt-5 space-y-6">
      <p className="text-sm text-muted-foreground">
        Horas apontadas pela equipe; código medido no último commit. Tokens
        registrados a partir desta versão nos agentes internos e no Build. CLI
        nativa, compactação, chamadas auxiliares e histórico anterior não estão
        incluídos. Custos de IA são estimativas em USD pelas tarifas informadas,
        sem reconciliação com a fatura; cache e descontos não são discriminados.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          aria-label="Período dos indicadores"
          className="rounded-md border bg-background p-2 text-sm"
          value={sprintId}
          onChange={(e) => setSprintId(e.target.value)}
        >
          <option value="">Projeto inteiro</option>
          {data.sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.endedAt === null ? "aberta" : "encerrada"}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || metrics.isFetching}
          onClick={() =>
            void run(async () => {
              await query.refetch();
              await metrics.refetch();
            })
          }
        >
          Atualizar indicadores
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!report}
          onClick={() =>
            void run(() =>
              navigator.clipboard.writeText(
                JSON.stringify(
                  {
                    projectId: appId,
                    sprint:
                      data.sprints.find((s) => s.id === sprintId)?.name ?? null,
                    currency: "USD",
                    coverage:
                      "Internal agent/build steps since instrumentation; estimates, not invoice",
                    ...report,
                  },
                  null,
                  2,
                ),
              ),
            )
          }
        >
          Copiar relatório JSON
        </Button>
      </div>
      {metrics.isFetching && (
        <p role="status" className="text-xs">
          Medindo projeto…
        </p>
      )}
      {metrics.error && (
        <p role="alert" className="text-sm">
          Não foi possível medir o código: {metrics.error.message}. O projeto
          precisa de um commit Git válido.
        </p>
      )}
      {report && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ["Horas apontadas", (report.minutes / 60).toFixed(2)],
              ["Funcionalidades concluídas", String(report.features.length)],
              [
                "Linhas de código no Git",
                report.codeLines.toLocaleString("pt-BR"),
              ],
              ["Tokens registrados", tokens.toLocaleString("pt-BR")],
              ["Custo de trabalho conhecido", money(report.laborCost)],
              ["Custo estimado de IA conhecido", money(knownTokenCost)],
              ["Tarefas concluídas", String(report.completedTasks)],
              ["Arquivos de código", String(report.codeFiles)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {report.unpricedMinutes
              ? `${(report.unpricedMinutes / 60).toFixed(2)} h sem tarifa. `
              : ""}
            {unpriced ? "Há consumo sem custo calculável. " : ""}Linhas incluem
            comentários e linhas vazias em arquivos de código versionados; não
            representam produtividade.{" "}
            {report.addedLines !== null
              ? `Variação na sprint: +${report.addedLines} / −${report.removedLines} linhas; ${report.commits} commits.`
              : ""}{" "}
            Capturado em {new Date(report.capturedAt).toLocaleString()} ·{" "}
            {report.commit.slice(0, 8)}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left mb-2 font-medium">
                Consumo por modelo
              </caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th>Modelo / origem</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Custo estimado</th>
                </tr>
              </thead>
              <tbody>
                {report.tokens.map((t) => (
                  <tr
                    key={JSON.stringify([t.provider, t.model, t.source])}
                    className="border-t"
                  >
                    <td className="py-2">
                      {t.provider} / {t.model}
                      <span className="block text-xs text-muted-foreground">
                        {t.source} · {t.calls} chamadas
                        {t.unknownCalls
                          ? ` · ${t.unknownCalls} sem uso completo`
                          : ""}
                      </span>
                    </td>
                    <td>{t.inputTokens.toLocaleString()}</td>
                    <td>{t.outputTokens.toLocaleString()}</td>
                    <td>
                      {t.estimatedCost === null
                        ? "Desconhecido"
                        : money(t.estimatedCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report.tokens.length && (
              <p className="text-xs text-muted-foreground">
                Nenhum consumo capturado neste período. Isso não comprova custo
                zero.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium">
              Funcionalidades concluídas no período
            </h3>
            <p className="text-xs text-muted-foreground">
              Marque o tipo “Funcionalidade” nas tarefas do plano de entrega e
              salve. Conclusão da tarefa não equivale à aprovação do cliente.
            </p>
            {report.features.map((f) => (
              <div key={f.id} className="mt-2 rounded border p-3 text-sm">
                <p>{f.title}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {f.evidence || "Sem evidência registrada"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-medium">Sprints</h3>
        <p className="text-xs text-muted-foreground">
          Uma sprint aberta por projeto. O fechamento guarda o relatório, as
          tarifas calculadas e as funcionalidades concluídas desde a abertura;
          não altera a aprovação da entrega. Salve o código e as tarefas antes
          de encerrar.
        </p>
        {active ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">
              {active.name} · desde{" "}
              {new Date(active.startedAt).toLocaleDateString()}
            </span>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                void run(async () => {
                  await ipc.management.close({
                    appId,
                    revision,
                    sprintId: active.id,
                  });
                  setSprintId(active.id);
                })
              }
            >
              Encerrar sprint e salvar relatório
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const next = await ipc.management.start({
                  appId,
                  revision,
                  name: sprintName,
                });
                setSprintId(next.data.sprints.at(-1)!.id);
                setSprintName("");
              });
            }}
          >
            <Input
              aria-label="Nome da sprint"
              placeholder="Sprint 01 · Área do cliente"
              value={sprintName}
              maxLength={150}
              onChange={(e) => setSprintName(e.target.value)}
              required
              className="max-w-sm"
            />
            <Button disabled={busy}>Iniciar sprint</Button>
          </form>
        )}
      </div>
      <form
        className="border-t pt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const entry = TimeEntrySchema.parse({
              id: crypto.randomUUID(),
              sprintId: active?.id ?? null,
              date,
              person,
              description,
              minutes: Math.round(Number(hours) * 60),
              hourlyRate: rate === "" ? null : Number(rate),
            });
            await save({ ...data, timeEntries: [...data.timeEntries, entry] });
            setDescription("");
            setHours("");
          });
        }}
      >
        <h3 className="text-sm font-medium">
          Apontar horas · {active?.name ?? "sem sprint"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Registre tempo efetivamente trabalhado, inclusive atividades fora do
          aplicativo. Tarifa vazia significa custo desconhecido.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs">
            Pessoa
            <Input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              required
              maxLength={150}
            />
          </label>
          <label className="text-xs">
            Data
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="text-xs">
            Horas
            <Input
              type="number"
              min="0.02"
              max="24"
              step="0.01"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </label>
          <label className="text-xs">
            USD por hora
            <Input
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-xs">
          Atividade
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={1000}
          />
        </label>
        <Button disabled={busy}>Salvar apontamento</Button>
      </form>
      <div className="space-y-2">
        {data.timeEntries
          .filter((t) => !sprintId || t.sprintId === sprintId)
          .slice(-50)
          .reverse()
          .map((t) => (
            <div
              key={t.id}
              className="flex justify-between gap-3 border-b py-2 text-sm"
            >
              <div>
                {t.person} · {(t.minutes / 60).toFixed(2)} h · {t.date}
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              {!data.sprints.find((s) => s.id === t.sprintId)?.endedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      save({
                        ...data,
                        timeEntries: data.timeEntries.filter(
                          (e) => e.id !== t.id,
                        ),
                      }),
                    )
                  }
                >
                  Remover apontamento
                </Button>
              )}
            </div>
          ))}
        <p className="text-xs text-muted-foreground">
          Exibindo até os 50 apontamentos mais recentes. Todos entram no
          cálculo.
        </p>
      </div>
      <details className="border-t pt-4">
        <summary className="cursor-pointer text-sm font-medium">
          Tarifas dos modelos · USD por milhão de tokens
        </summary>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (inputRate === "" || outputRate === "")
                throw new Error(
                  "Informe ambas as tarifas; zero deve ser explícito.",
                );
              const next = RateSchema.parse({
                provider,
                model,
                inputPerMillion: Number(inputRate),
                outputPerMillion: Number(outputRate),
              });
              await save({
                ...data,
                rates: [
                  ...data.rates.filter(
                    (r) => r.provider !== provider || r.model !== model,
                  ),
                  next,
                ],
              });
            });
          }}
        >
          <p className="text-xs text-muted-foreground">
            Use os identificadores exatos da tabela. Alterações recalculam a
            visão aberta; relatórios de sprints encerradas permanecem iguais.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs">
              Provedor
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                required
              />
            </label>
            <label className="text-xs">
              Modelo
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </label>
            <label className="text-xs">
              Entrada · USD / milhão
              <Input
                type="number"
                min="0"
                step="any"
                value={inputRate}
                onChange={(e) => setInputRate(e.target.value)}
                required
              />
            </label>
            <label className="text-xs">
              Saída · USD / milhão
              <Input
                type="number"
                min="0"
                step="any"
                value={outputRate}
                onChange={(e) => setOutputRate(e.target.value)}
                required
              />
            </label>
          </div>
          <Button disabled={busy}>Salvar tarifa</Button>
          {data.rates.map((r) => (
            <p key={JSON.stringify([r.provider, r.model])} className="text-xs">
              {r.provider}/{r.model}: entrada {money(r.inputPerMillion)}, saída{" "}
              {money(r.outputPerMillion)} por milhão.
            </p>
          ))}
        </form>
      </details>
    </div>
  );
}
