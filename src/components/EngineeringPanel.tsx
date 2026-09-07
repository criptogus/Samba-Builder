import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { qualityKinds, type QualityKind } from "@/delivery/quality";
import type { DeliveryPlan } from "@/delivery/model";
const labels = {
  secrets: "Segredos",
  dependencies: "Dependências",
  accessibility: "Acessibilidade",
  performance: "Desempenho",
  visual: "Comparação visual",
};
const defaults = {
  version: 1 as const,
  profile: "public" as const,
  requirements: [],
  peakUsers: 100,
  availabilityPercent: 99,
  recoveryMinutes: 240,
  dataLossMinutes: 60,
  monthlyBudgetUSD: 100,
  maxLcpMs: 2500,
  maxCls: 0.1,
  architectureEvidence: "",
  usabilityEvidence: "",
};
export function EngineeringPanel({
  appId,
  plan,
  onChange,
}: {
  appId: number;
  plan: DeliveryPlan;
  onChange: (plan: DeliveryPlan) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const runs = useQuery({
    queryKey: ["quality-runs", appId],
    queryFn: () => ipc.delivery.qualityRuns({ appId }),
    refetchOnWindowFocus: false,
  });
  const tests = useQuery({
    queryKey: ["delivery-test-evidence", appId],
    queryFn: () => ipc.delivery.testEvidence({ appId }),
    refetchOnWindowFocus: false,
  });
  const policy = plan.engineeringPolicy;
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await runs.refetch();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const run = (kind: QualityKind) =>
    action(() =>
      ipc.delivery.runQuality({
        appId,
        kind,
        maxLcpMs: policy?.maxLcpMs ?? 2500,
        maxCls: policy?.maxCls ?? 0.1,
      }),
    );
  return (
    <section
      aria-label="Engenharia e qualidade"
      className="space-y-4 rounded-lg border p-4"
    >
      <h3 className="font-medium">Engenharia e qualidade</h3>
      <p className="text-sm text-muted-foreground">
        Conecte critérios do PRD, tarefas e testes. As metas abaixo precisam ser
        definidas para este produto; valores sugeridos não são decisões
        aprovadas.
      </p>
      {!policy ? (
        <Button
          onClick={() =>
            onChange({
              ...plan,
              engineeringRequired: true,
              engineeringPolicy: defaults,
            })
          }
        >
          Definir política de engenharia
        </Button>
      ) : (
        <>
          <label className="block text-sm">
            Perfil de risco
            <select
              aria-label="Perfil de risco"
              className="ml-2 rounded border bg-background p-2"
              value={policy.profile}
              onChange={(e) =>
                onChange({
                  ...plan,
                  engineeringPolicy: {
                    ...policy,
                    profile: e.target.value as typeof policy.profile,
                  },
                })
              }
            >
              <option value="public">Site público</option>
              <option value="private">Contas e dados privados</option>
              <option value="critical">Operação crítica ou pagamentos</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["peakUsers", "Usuários simultâneos"],
                ["availabilityPercent", "Disponibilidade alvo (%)"],
                ["recoveryMinutes", "Tempo de recuperação (min)"],
                ["dataLossMinutes", "Perda máxima de dados (min)"],
                ["monthlyBudgetUSD", "Orçamento mensal (USD)"],
                ["maxLcpMs", "LCP máximo no laboratório (ms)"],
                ["maxCls", "CLS máximo"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <Input
                  aria-label={label}
                  type="number"
                  step="any"
                  min="0"
                  value={policy[key]}
                  onChange={(e) =>
                    onChange({
                      ...plan,
                      engineeringPolicy: {
                        ...policy,
                        [key]: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            Evidências de arquitetura, carga e recuperação
            <Textarea
              aria-label="Evidências de arquitetura"
              value={policy.architectureEvidence}
              onChange={(e) =>
                onChange({
                  ...plan,
                  engineeringPolicy: {
                    ...policy,
                    architectureEvidence: e.target.value,
                  },
                })
              }
              placeholder="Cite ADRs, cenários de carga, testes de restauração e limitações. Justifique itens não aplicáveis."
            />
          </label>
          <label className="block text-sm">
            Revisão humana de UX e acessibilidade
            <Textarea
              aria-label="Evidências de usabilidade"
              value={policy.usabilityEvidence}
              onChange={(e) =>
                onChange({
                  ...plan,
                  engineeringPolicy: {
                    ...policy,
                    usabilityEvidence: e.target.value,
                  },
                })
              }
              placeholder="Quem testou quais jornadas? Registre teclado, recuperação, mobile e pontos em aberto."
            />
          </label>
          {policy.requirements.map((req, index) => (
            <div key={index} className="space-y-2 border-t pt-3">
              <select
                aria-label={`Categoria do requisito ${index + 1}`}
                className="w-full rounded border bg-background p-2"
                value={req.category ?? "journey"}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              category: e.target.value as typeof req.category,
                            }
                          : r,
                      ),
                    },
                  })
                }
              >
                <option value="journey">Jornada funcional</option>
                <option value="authorization">Permissões e isolamento</option>
                <option value="recovery">Recuperação e restauração</option>
                <option value="load">Carga e concorrência</option>
              </select>
              <Input
                aria-label={`Arquivos do requisito ${index + 1}`}
                placeholder="src/agenda.ts, e2e-tests/agenda.spec.ts"
                value={req.codePaths?.join(", ") ?? ""}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              codePaths: e.target.value
                                .split(",")
                                .map((v) => v.trim())
                                .filter(Boolean),
                            }
                          : r,
                      ),
                    },
                  })
                }
              />
              <Input
                aria-label={`ID do requisito ${index + 1}`}
                value={req.id}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.map((r, i) =>
                        i === index ? { ...r, id: e.target.value } : r,
                      ),
                    },
                  })
                }
              />
              <Input
                aria-label={`Título do requisito ${index + 1}`}
                value={req.title}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.map((r, i) =>
                        i === index ? { ...r, title: e.target.value } : r,
                      ),
                    },
                  })
                }
              />
              <Textarea
                aria-label={`Aceite do requisito ${index + 1}`}
                value={req.acceptance}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.map((r, i) =>
                        i === index ? { ...r, acceptance: e.target.value } : r,
                      ),
                    },
                  })
                }
              />
              <select
                aria-label={`Teste do requisito ${index + 1}`}
                className="w-full rounded border bg-background p-2 text-sm"
                value={req.testExecutionId ?? ""}
                onChange={(e) =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.map((r, i) =>
                        i === index
                          ? {
                              ...r,
                              testExecutionId: e.target.value || undefined,
                            }
                          : r,
                      ),
                    },
                  })
                }
              >
                <option value="">
                  Selecione uma execução que verifica este requisito
                </option>
                {tests.data
                  ?.filter((t) => t.status === "passed" && t.commit)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {new Date(t.startedAt).toLocaleString()} ·{" "}
                      {t.commit?.slice(0, 8)} · {t.passed} aprovados
                    </option>
                  ))}
              </select>
              <Button
                variant="outline"
                onClick={() =>
                  onChange({
                    ...plan,
                    engineeringPolicy: {
                      ...policy,
                      requirements: policy.requirements.filter(
                        (_, i) => i !== index,
                      ),
                    },
                  })
                }
              >
                Remover requisito
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              onChange({
                ...plan,
                engineeringPolicy: {
                  ...policy,
                  requirements: [
                    ...policy.requirements,
                    {
                      id: `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                      title: "",
                      acceptance: "",
                    },
                  ],
                },
              })
            }
          >
            Adicionar requisito do PRD
          </Button>
          {plan.tasks.map((task) => (
            <label key={task.id} className="block text-sm">
              Requisitos de “{task.title}”
              <Input
                aria-label={`Requisitos de ${task.title}`}
                value={task.requirementIds?.join(", ") ?? ""}
                placeholder="REQ-1, REQ-2"
                onChange={(e) =>
                  onChange({
                    ...plan,
                    tasks: plan.tasks.map((t) =>
                      t.id === task.id
                        ? {
                            ...t,
                            requirementIds: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          }
                        : t,
                    ),
                  })
                }
              />
            </label>
          ))}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Ferramentas sob demanda, com versões fixadas. Dependências consulta
        nomes e versões públicas na OSV. As verificações visuais usam a página
        inicial da preview local; não substituem testes das demais jornadas.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          variant="outline"
          onClick={() => void action(() => ipc.delivery.installQuality())}
        >
          Instalar ferramentas
        </Button>
        {qualityKinds.map((kind) => (
          <Button
            key={kind}
            disabled={busy}
            variant="outline"
            onClick={() => void run(kind)}
          >
            {labels[kind]}
          </Button>
        ))}
        {busy && (
          <Button
            variant="outline"
            onClick={() => void ipc.delivery.cancelQuality()}
          >
            Cancelar
          </Button>
        )}
      </div>
      {busy && <p role="status">Verificação ou instalação em andamento…</p>}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {runs.data?.map((r) => (
        <div key={r.id} className="space-y-1 border-t pt-2 text-sm">
          <p className="font-medium">
            {labels[r.kind as QualityKind]} ·{" "}
            {r.report.status === "passed"
              ? "Passou"
              : r.report.status === "failed"
                ? "Falhou"
                : "Inconclusivo"}{" "}
            · {r.commit?.slice(0, 8) ?? "sem versão verificável"}
          </p>
          <p>{r.report.summary}</p>
          {r.report.findings.map((f, i) => (
            <p key={i}>
              {f.file}
              {f.line ? `:${f.line}` : ""} · {f.rule}
            </p>
          ))}
          {r.kind === "visual" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  void action(() =>
                    ipc.delivery.qualityArtifacts({
                      appId,
                      id: r.id,
                      approve: false,
                    }),
                  )
                }
              >
                Abrir imagens
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void action(() =>
                    ipc.delivery.qualityArtifacts({
                      appId,
                      id: r.id,
                      approve: true,
                    }),
                  )
                }
              >
                Aprovar referência visual
              </Button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
