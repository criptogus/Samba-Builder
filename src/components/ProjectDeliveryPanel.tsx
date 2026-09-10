import { EngineeringPanel } from "./EngineeringPanel";
import { DeliveryTestEvidence } from "./DeliveryTestEvidence";
import { EvidenceGates } from "./EvidenceGates";
import { FoundationReview } from "./FoundationReview";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductCoachButton } from "./ProductCoachButton";
import { MeetingBriefingButton } from "./MeetingBriefingButton";
import {
  DeliveryPlanSchema,
  deliveryBlockers,
  deliveryStages,
  qualityAreas,
  taskHandoff,
  type DeliveryPlan,
} from "@/delivery/model";
import { useSelectChat } from "@/hooks/useSelectChat";
import { showError, showSuccess } from "@/lib/toast";
import { getActiveWindowSessionId } from "@/window_infrastructure/chat_tab_session_storage";

const stageNames = {
  briefing: "Briefing",
  development: "Desenvolvimento",
  review: "Em revisão",
  approved: "Aprovado",
  delivered: "Entregue",
};
const checkNames = {
  flows: "Fluxos essenciais e testes",
  security: "Segurança e permissões",
  accessibility: "Acessibilidade",
  responsive: "Telas menores e responsividade",
};
export function ProjectDeliveryPanel({ appId }: { appId: number }) {
  const query = useQuery({
    queryKey: ["project-delivery", appId],
    queryFn: () => ipc.delivery.get({ appId }),
  });
  if (query.isPending) return <p role="status">Carregando plano de entrega…</p>;
  if (query.error)
    return (
      <div role="alert">
        <p>Não foi possível carregar o plano.</p>
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
      </div>
    );
  return <DeliveryEditor key={appId} record={query.data} />;
}
function DeliveryEditor({
  record,
}: {
  record: { appId: number; revision: number; plan: DeliveryPlan };
}) {
  const { appId } = record;
  const draftKey = `samba.delivery:${getActiveWindowSessionId()}:${appId}`;
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw);
        const parsed = DeliveryPlanSchema.safeParse(saved.plan);
        if (parsed.success && Number.isInteger(saved.revision))
          return { plan: parsed.data, revision: saved.revision, dirty: true };
      }
    } catch {}
    return { ...record, dirty: false };
  });
  const [plan, setPlan] = useState(initial.plan);
  const [revision, setRevision] = useState(initial.revision);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(initial.dirty);
  useEffect(() => {
    if (!dirty) {
      setPlan(record.plan);
      setRevision(record.revision);
    }
  }, [record.plan, record.revision, dirty]);
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { selectChat } = useSelectChat();
  const update = (next: DeliveryPlan) => {
    if (
      plan.approvalCommit &&
      JSON.stringify({ ...plan, stage: undefined }) !==
        JSON.stringify({ ...next, stage: undefined })
    )
      next = {
        ...next,
        approvalCommit: "",
        reviewer: "",
        approvalNote: "",
        stage: "review",
      };
    setPlan(next);
    setDirty(true);
    try {
      localStorage.setItem(draftKey, JSON.stringify({ revision, plan: next }));
    } catch {
      setError(
        "Não foi possível proteger o rascunho local. Salve o plano antes de sair.",
      );
    }
  };
  const field = (
    key:
      | "client"
      | "owner"
      | "dueDate"
      | "brief"
      | "scope"
      | "acceptance"
      | "decisions"
      | "reviewer"
      | "approvalNote",
    value: string,
  ) => update({ ...plan, [key]: value });
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await ipc.delivery.save({ appId, revision, plan });
      queryClient.setQueryData(["project-delivery", appId], result);
      setRevision(result.revision);
      setPlan(result.plan);
      setDirty(false);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      await queryClient.invalidateQueries({ queryKey: ["delivery-attention"] });
      showSuccess("Plano de entrega salvo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const handoff = async (id: string) => {
    setBusy(true);
    try {
      const chatId = await ipc.chat.createChat({ appId });
      selectChat({ chatId, appId, prefillInput: taskHandoff(plan, id) });
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  const addTask = () => {
    if (!taskTitle.trim() || plan.tasks.length >= 150) return;
    update({
      ...plan,
      tasks: [
        ...plan.tasks,
        {
          id: crypto.randomUUID(),
          kind: "task",
          title: taskTitle.trim(),
          owner: plan.owner,
          acceptance: "",
          evidence: "",
          status: "todo",
        },
      ],
    });
    setTaskTitle("");
  };
  const approvals = useQuery({
    queryKey: ["delivery-approvals", appId],
    queryFn: () => ipc.delivery.approvals({ appId }),
  });
  const usage = useQuery({
    queryKey: ["delivery-usage", appId],
    queryFn: () => ipc.delivery.usage({ appId }),
    refetchOnWindowFocus: true,
  });
  const blockers = deliveryBlockers(plan);
  return (
    <section
      aria-labelledby="delivery-plan-title"
      className="my-6 rounded-xl border border-border bg-card p-5 sm:p-7 space-y-6"
    >
      <div className="sticky top-9 z-10 -mx-5 flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-2 sm:-mx-7 sm:px-7">
        <div>
          <h2
            id="delivery-plan-title"
            className="text-base font-semibold tracking-tight"
          >
            Plano de entrega
          </h2>
          <p className="text-xs text-muted-foreground">
            {dirty
              ? "Alterações protegidas neste dispositivo · salve para confirmar"
              : "Salvo no aplicativo"}
          </p>
        </div>
        <Button disabled={busy || !dirty} onClick={() => void save()}>
          {busy ? "Aguarde…" : "Salvar plano"}
        </Button>
      </div>
      {record.revision !== revision && (
        <p role="alert" className="text-sm">
          Existe uma versão mais recente salva. Seu rascunho foi preservado.{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPlan(record.plan);
              setRevision(record.revision);
              setDirty(false);
              try {
                localStorage.removeItem(draftKey);
              } catch {}
            }}
          >
            Descartar rascunho e carregar versão salva
          </Button>
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="whitespace-pre-wrap text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["client", "Cliente"],
              ["owner", "Responsável"],
              ["dueDate", "Prazo"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <Input
                type={key === "dueDate" ? "date" : "text"}
                value={plan[key]}
                onChange={(e) => field(key, e.target.value)}
              />
            </label>
          ))}
          <label className="space-y-1 text-sm">
            <span>Etapa</span>
            <select
              aria-label="Etapa"
              className="h-9 w-full rounded-md border bg-background px-2"
              value={plan.stage}
              onChange={(e) =>
                update({
                  ...plan,
                  stage: e.target.value as DeliveryPlan["stage"],
                })
              }
            >
              {deliveryStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stageNames[stage]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Tabs defaultValue="brief" className="gap-4">
          <TabsList
            aria-label="Etapas do plano de entrega"
            className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 pb-3"
          >
            <TabsTrigger value="brief" className="gap-2">
              <ClipboardList className="size-4" />
              Briefing
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListChecks className="size-4" />
              Tarefas{" "}
              <span className="text-xs text-muted-foreground">
                {plan.tasks.filter((t) => t.status === "done").length}/
                {plan.tasks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="engineering" className="gap-2">
              Engenharia
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <ShieldCheck className="size-4" />
              Revisão
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <BookOpen className="size-4" />
              Memória
            </TabsTrigger>
          </TabsList>
          <TabsContent value="brief" className="mt-0">
            <h3 className="text-sm font-medium">
              Defina o resultado antes de construir
            </h3>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <ProductCoachButton
                  draftKey={`delivery:${appId}`}
                  idea={plan.brief}
                  onPrepared={(brief) => field("brief", brief)}
                />
                <MeetingBriefingButton
                  onPrepared={(brief) =>
                    field("brief", plan.brief + "\n\n" + brief)
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["brief", "Briefing do cliente"],
                    ["scope", "Escopo da entrega"],
                    ["acceptance", "Critérios de aceite"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="block space-y-2 text-sm first:md:col-span-2"
                  >
                    <span>{label}</span>
                    <Textarea
                      value={plan[key]}
                      onChange={(e) => field(key, e.target.value)}
                      rows={3}
                    />
                  </label>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!plan.acceptance.trim() || plan.tasks.length > 0}
                onClick={() => {
                  const criteria = plan.acceptance
                    .split("\n")
                    .map((s) => s.replace(/^\s*[-*\d.)]+\s*/, "").trim())
                    .filter(Boolean)
                    .slice(0, 150);
                  update({
                    ...plan,
                    tasks: criteria.map((criterion) => ({
                      id: crypto.randomUUID(),
                      kind: "task",
                      title: criterion.slice(0, 300),
                      owner: plan.owner,
                      acceptance: criterion,
                      evidence: "",
                      status: "todo",
                    })),
                  });
                }}
              >
                Criar tarefas a partir dos critérios
              </Button>
              <p className="text-xs text-muted-foreground">
                Cada linha vira uma tarefa para revisão. O sistema não estima
                esforço nem inicia a IA automaticamente.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="tasks" className="mt-0">
            <h3 className="text-sm font-medium">
              Tarefas e bloqueios ·{" "}
              {plan.tasks.filter((t) => t.status === "done").length}/
              {plan.tasks.length}
            </h3>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  aria-label="Nova tarefa"
                  placeholder="Qual resultado precisa ser entregue?"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  maxLength={300}
                />
                <Button
                  variant="outline"
                  disabled={!taskTitle.trim() || plan.tasks.length >= 150}
                  onClick={addTask}
                >
                  Adicionar
                </Button>
              </div>
              {plan.tasks.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Adicione uma tarefa ou transforme os critérios do briefing em
                  tarefas.
                </p>
              )}
              {plan.tasks.map((task) => (
                <details
                  data-task-id={task.id}
                  key={task.id}
                  className="group rounded-lg border border-border"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                    <ListChecks className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {task.title}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {
                        {
                          todo: "A fazer",
                          doing: "Em andamento",
                          blocked: "Bloqueada",
                          done: "Concluída",
                        }[task.status]
                      }
                    </span>
                    <span className="text-xs text-muted-foreground group-open:hidden">
                      Editar
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Input
                        aria-label="Título da tarefa"
                        maxLength={300}
                        value={task.title}
                        onChange={(e) =>
                          update({
                            ...plan,
                            tasks: plan.tasks.map((t) =>
                              t.id === task.id
                                ? { ...t, title: e.target.value }
                                : t,
                            ),
                          })
                        }
                      />
                      <select
                        aria-label={`Tipo de ${task.title}`}
                        className="rounded border bg-background p-1 text-xs"
                        value={task.kind ?? "task"}
                        onChange={(e) =>
                          update({
                            ...plan,
                            tasks: plan.tasks.map((t) =>
                              t.id === task.id
                                ? {
                                    ...t,
                                    kind: e.target.value as
                                      | "task"
                                      | "feature"
                                      | "bug",
                                  }
                                : t,
                            ),
                          })
                        }
                      >
                        <option value="task">Tarefa</option>
                        <option value="feature">Funcionalidade</option>
                        <option value="bug">Correção</option>
                      </select>
                      <select
                        aria-label={`Status de ${task.title}`}
                        className="rounded border bg-background p-1 text-xs"
                        value={task.status}
                        onChange={(e) =>
                          update({
                            ...plan,
                            tasks: plan.tasks.map((t) =>
                              t.id === task.id
                                ? {
                                    ...t,
                                    status: e.target.value as typeof t.status,
                                  }
                                : t,
                            ),
                          })
                        }
                      >
                        {Object.entries({
                          todo: "A fazer",
                          doing: "Em andamento",
                          blocked: "Bloqueada",
                          done: "Concluída",
                        }).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(
                      [
                        ["owner", "Responsável pela tarefa"],
                        ["acceptance", "Aceite da tarefa"],
                        ["evidence", "Evidências ou bloqueio"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block text-xs space-y-1">
                        <span>{label}</span>
                        <Textarea
                          rows={1}
                          value={task[key]}
                          onChange={(e) =>
                            update({
                              ...plan,
                              tasks: plan.tasks.map((t) =>
                                t.id === task.id
                                  ? { ...t, [key]: e.target.value }
                                  : t,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="block text-xs space-y-1">
                      <span>
                        Requisitos de produto (ex.: REQ-01, REQ-02 — ver
                        PRODUCT_MEMORY.md)
                      </span>
                      <Input
                        aria-label={`Requisitos de ${task.title}`}
                        value={(task.requirementIds ?? []).join(", ")}
                        placeholder="REQ-01, REQ-02"
                        onChange={(e) => {
                          const ids = e.target.value
                            .split(/[,\s]+/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          update({
                            ...plan,
                            tasks: plan.tasks.map((t) =>
                              t.id === task.id
                                ? {
                                    ...t,
                                    requirementIds: ids.length
                                      ? ids
                                      : undefined,
                                  }
                                : t,
                            ),
                          });
                        }}
                      />
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={dirty}
                      onClick={() => void handoff(task.id)}
                    >
                      Preparar execução no chat
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update({
                          ...plan,
                          tasks: plan.tasks.filter((t) => t.id !== task.id),
                        })
                      }
                    >
                      Remover tarefa
                    </Button>
                  </div>
                </details>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="engineering">
            <EngineeringPanel appId={appId} plan={plan} onChange={update} />
          </TabsContent>
          <TabsContent value="review" className="mt-0">
            <h3 className="text-sm font-medium">
              Qualidade e aprovação por versão
            </h3>
            <div className="mt-3 space-y-4">
              {/* Estado da aprovação em destaque: o que falta, não um muro de campos. */}
              <div
                className={cn(
                  "rounded-lg border p-3",
                  blockers.length
                    ? "border-amber-500/40 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-950/20"
                    : "border-emerald-600/40 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/20",
                )}
              >
                <div className="flex items-center gap-2">
                  {blockers.length ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <p className="text-sm font-medium">
                    {blockers.length
                      ? "Para aprovar, falta:"
                      : "Tudo pronto para aprovar"}
                  </p>
                </div>
                {blockers.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={dirty}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const chatId = await ipc.chat.createChat({ appId });
                    selectChat({
                      chatId,
                      appId,
                      prefillInput:
                        "Revise esta entrega usando as ferramentas disponíveis. Verifique fluxos essenciais, segurança e permissões, acessibilidade e responsividade. Execute os testes existentes relevantes; informe o que foi executado, resultados e limitações. Não declare aprovação nem publique. Critérios: " +
                        plan.acceptance +
                        "\nEscopo: " +
                        plan.scope,
                    });
                  } catch (e) {
                    showError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Preparar validação no chat
              </Button>

              <details
                className="rounded-lg border p-3"
                open={blockers.some((b) => b.includes("Evidência"))}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Controles exigidos pelo perfil de risco
                </summary>
                <div className="mt-3">
                  <EvidenceGates plan={plan} onChange={update} />
                </div>
              </details>

              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Verificações registradas
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Registre verificações realmente executadas e seus
                    resultados. Este formulário não executa testes nem substitui
                    a aprovação do cliente.
                  </p>
                  <DeliveryTestEvidence
                    appId={appId}
                    reviewCommit={plan.reviewCommit}
                  />
                  <FoundationReview
                    appId={appId}
                    plan={plan}
                    onChange={update}
                  />
                  {qualityAreas.map((area) => (
                    <label key={area} className="block space-y-1 text-sm">
                      <span>{checkNames[area]}</span>
                      <Textarea
                        value={plan.checks[area]}
                        onChange={(e) =>
                          update({
                            ...plan,
                            checks: { ...plan.checks, [area]: e.target.value },
                          })
                        }
                        placeholder="Teste realizado, resultado e referência da evidência"
                      />
                    </label>
                  ))}
                </div>
              </details>

              <details className="rounded-lg border p-3" open>
                <summary className="cursor-pointer text-sm font-medium">
                  Aprovação por versão
                </summary>
                <div className="mt-3 space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const commit = await ipc.delivery.snapshot({ appId });
                        update({
                          ...plan,
                          reviewCommit: commit,
                          approvalCommit: "",
                          reviewer: "",
                          approvalNote: "",
                          stage: "review",
                        });
                      } catch (e) {
                        showError(e);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Vincular versão Git atual
                  </Button>
                  <p className="break-all text-xs text-muted-foreground">
                    Versão revisada: {plan.reviewCommit || "Nenhuma"}
                  </p>
                  {(
                    [
                      ["reviewer", "Nome de quem aprovou"],
                      ["approvalNote", "Evidência da aprovação recebida"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-sm space-y-1">
                      <span>{label}</span>
                      <Textarea
                        rows={2}
                        value={plan[key]}
                        onChange={(e) => field(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <Button
                    variant={blockers.length === 0 ? "default" : "outline"}
                    size="sm"
                    disabled={
                      blockers.length > 0 ||
                      !plan.reviewer.trim() ||
                      !plan.approvalNote.trim()
                    }
                    onClick={() =>
                      update({
                        ...plan,
                        approvalCommit: plan.reviewCommit,
                        stage: "approved",
                      })
                    }
                  >
                    Registrar aprovação desta versão
                  </Button>
                  {approvals.data && approvals.data.length > 0 && (
                    <div className="space-y-2 text-xs">
                      <h4 className="font-medium">
                        Últimos registros de aprovação
                      </h4>
                      {approvals.data.map((item) => (
                        <div key={item.id} className="rounded border p-2">
                          <p>
                            {item.reviewer} ·{" "}
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                          <p className="break-all">{item.commit}</p>
                          <p className="whitespace-pre-wrap">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            </div>
          </TabsContent>
          <TabsContent value="knowledge" className="mt-0">
            <h3 className="text-sm font-medium">
              Decisões e memória do projeto
            </h3>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              disabled={dirty || !plan.decisions.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await ipc.prompt.create({
                    slug: undefined,
                    title:
                      "Padrões de entrega — " +
                      (plan.client || "Projeto " + appId),
                    description:
                      "Decisões reutilizáveis registradas no projeto " + appId,
                    content: plan.decisions,
                  });
                  showSuccess("Decisões salvas na biblioteca de prompts.");
                } catch (e) {
                  showError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Salvar decisões na biblioteca
            </Button>
            <label className="mt-3 block text-sm space-y-1">
              <span>Decisões técnicas, padrões e aprendizados</span>
              <Textarea
                rows={4}
                value={plan.decisions}
                onChange={(e) => field("decisions", e.target.value)}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              As decisões acompanham cada tarefa preparada no chat. Para
              compartilhar padrões entre projetos, use a biblioteca de skills e
              templates.
            </p>
          </TabsContent>
        </Tabs>
      </fieldset>
      <details className="rounded-lg border p-3 space-y-2">
        <summary className="cursor-pointer text-sm font-medium">
          Consumo e limite dos subagentes
        </summary>

        <p className="text-xs text-muted-foreground">
          {usage.data
            ? (
                usage.data.inputTokens + usage.data.outputTokens
              ).toLocaleString() + " tokens registrados"
            : usage.error
              ? "Consumo indisponível"
              : "Carregando consumo…"}
          . Inclui apenas subagentes internos, conforme informado pelo provedor;
          não é o custo total do projeto.
        </p>
        <label className="block text-xs">
          Limite de tokens dos subagentes (0 = sem limite)
          <Input
            type="number"
            min={0}
            max={1000000000}
            value={plan.subagentTokenBudget}
            disabled={busy}
            onChange={(e) =>
              update({
                ...plan,
                subagentTokenBudget: Math.max(
                  0,
                  Math.floor(Number(e.target.value) || 0),
                ),
              })
            }
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Novas etapas param ao atingir o limite registrado. Chamadas em
          andamento podem ultrapassá-lo; consumo não informado pelo provedor não
          pode ser contabilizado.
        </p>
      </details>
    </section>
  );
}
