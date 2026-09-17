import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ClipboardList,
  Download,
  Factory,
  Fingerprint,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoadApps } from "@/hooks/useLoadApps";
import { ipc } from "@/ipc/types";
import { factoryClient, type FactoryAction } from "@/ipc/types/factory";
import { queryKeys } from "@/lib/queryKeys";
import { GovernancePanel } from "@/components/GovernancePanel";
import { chatInputValuesByIdAtom } from "@/atoms/chatAtoms";
import { useSetAtom } from "jotai";
import {
  PlanSchema,
  type FactoryPlan,
  type FactoryProject,
  type FactoryMode,
} from "../../../packages/samba-factory/src/schema";
import {
  buildBlockers,
  engineMode,
  MODE_LABELS,
  releaseBlockers,
} from "../../../packages/samba-factory/src/policy";
import { getSkills } from "../../../packages/samba-factory/src/skills";
import "./factory.css";

const tabs = [
  "Briefing",
  "Plano",
  "Design",
  "Studio",
  "Segurança",
  "Entrega",
] as const;
type Tab = (typeof tabs)[number];
const errorToast = (error: Error) => toast.error(error.message);

export function FactoryPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [appId, setAppId] = useState("");
  const { apps } = useLoadApps();
  const query = useQuery({
    queryKey: queryKeys.factory.all,
    queryFn: () => factoryClient.list(),
    refetchInterval: 5000,
  });
  const projects = query.data ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.factory.all });
  const enroll = useMutation({
    mutationFn: () => factoryClient.enroll({ appId: Number(appId), client }),
    onSuccess: async (project) => {
      setSelected(project.appId);
      setClient("");
      setAppId("");
      await refresh();
    },
    onError: errorToast,
  });
  const current = projects.find((project) => project.appId === selected);
  const filtered = projects.filter((project) =>
    `${project.client} ${project.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main className="samba-factory">
      <header className="factory-header">
        <div>
          <div className="factory-eyebrow">
            <Factory size={16} /> SAMBA BUILDER / FACTORY OS
          </div>
          <h1>Do briefing à entrega.</h1>
          <p>Projetos de clientes, decisões e evidências em um só lugar.</p>
        </div>
        <span className="factory-local">
          <span /> Workspace local
        </span>
      </header>
      <section className="factory-metrics" aria-label="Resumo da fábrica">
        <Metric label="Projetos na fábrica" value={projects.length} />
        <Metric
          label="Clientes"
          value={new Set(projects.map((project) => project.client)).size}
        />
        <Metric
          label="Planos aprovados"
          value={projects.filter((project) => project.approval).length}
        />
        <Metric
          label="Verificações pendentes"
          value={
            projects.filter(
              (project) =>
                !project.scan ||
                releaseBlockers(project, project.scan.digest).length > 0,
            ).length
          }
        />
      </section>
      <div className="factory-layout">
        <aside className="factory-projects">
          <div className="factory-section-title">
            <h2>Portfólio</h2>
            <span>{projects.length}</span>
          </div>
          <Input
            aria-label="Buscar cliente ou projeto"
            placeholder="Buscar cliente ou projeto…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {query.isPending && <p role="status">Carregando projetos…</p>}
          {query.isError && <p role="alert">{query.error.message}</p>}
          <div className="factory-project-list">
            {filtered.map((project) => (
              <button
                key={project.appId}
                className={`factory-project ${selected === project.appId ? "is-selected" : ""}`}
                onClick={() => setSelected(project.appId)}
              >
                <span>{project.client}</span>
                <strong>{project.name}</strong>
                <small>
                  {project.approval ? "Plano aprovado" : "Aguardando plano"}
                  <ArrowUpRight size={14} />
                </small>
              </button>
            ))}
          </div>
          <form
            className="factory-enroll"
            onSubmit={(event) => {
              event.preventDefault();
              enroll.mutate();
            }}
          >
            <h3>
              <Plus size={16} /> Adicionar à fábrica
            </h3>
            <label>
              Cliente
              <Input
                required
                maxLength={120}
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder="Nome do cliente"
              />
            </label>
            <label>
              Aplicativo existente
              <select
                required
                value={appId}
                onChange={(event) => setAppId(event.target.value)}
              >
                <option value="">Selecione um aplicativo</option>
                {apps
                  .filter(
                    (app) =>
                      !projects.some((project) => project.appId === app.id),
                  )
                  .map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
              </select>
            </label>
            <Button
              disabled={enroll.isPending || !appId || !client.trim()}
              type="submit"
            >
              Adicionar projeto
            </Button>
            <Link to="/">
              Criar ou importar aplicativo <ArrowUpRight size={13} />
            </Link>
          </form>
        </aside>
        <section className="factory-workspace">
          {current ? (
            <ProjectWorkspace
              key={current.appId}
              project={current}
              refresh={refresh}
            />
          ) : (
            <div className="factory-empty">
              <div className="factory-empty-icon">
                <ClipboardList size={32} />
              </div>
              <div className="factory-eyebrow">
                SEU PRÓXIMO PROJETO COMEÇA AQUI
              </div>
              <h2>Uma entrega. Todas as etapas.</h2>
              <p>
                Adicione um aplicativo ao cliente e transforme o briefing em um
                plano com critérios de aceite, identidade visual e verificações
                de release.
              </p>
              <div className="factory-journey">
                Briefing <span>→</span> Plano <span>→</span> Build{" "}
                <span>→</span> Entrega
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{String(value).padStart(2, "0")}</strong>
    </div>
  );
}
function ProjectWorkspace({
  project,
  refresh,
}: {
  project: FactoryProject;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("Briefing");
  const navigate = useNavigate();
  const { apps } = useLoadApps();
  const currentApp = apps.find((app) => app.id === project.appId);
  const appPath = currentApp?.path ?? "";
  const setChatInputValues = useSetAtom(chatInputValuesByIdAtom);

  const update = useMutation({
    mutationFn: ({
      action,
      revision,
    }: {
      action: FactoryAction;
      revision?: number;
    }) =>
      factoryClient.update({
        appId: project.appId,
        revision: revision ?? project.revision,
        action,
      }),
    onSuccess: refresh,
    onError: errorToast,
  });
  const openStudio = useMutation({
    mutationFn: async (mode: FactoryMode) => {
      await factoryClient.update({
        appId: project.appId,
        revision: project.revision,
        action: { type: "mode", mode },
      });
      await refresh();
      const chatId = await ipc.chat.createChat({
        appId: project.appId,
        initialChatMode: engineMode(mode),
      });

      // Injeta contexto do briefing, cliente e modo no chat recém-criado
      const skills = getSkills(mode)
        .map((s) => `/${s.id.replace("skill-", "")}`)
        .join(" ");
      const initialPrompt =
        [
          `[Fábrica OS · ${MODE_LABELS[mode]}]`,
          skills ? `Skills recomendadas: ${skills}` : "",
          `Cliente: ${project.client}`,
          `Projeto: ${project.name}`,
          project.brief ? `Briefing: ${project.brief}` : "",
          project.knowledge
            ? `Conhecimento do projeto: ${project.knowledge}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n") + "\n\nComo posso ajudar nesta etapa?";

      setChatInputValues((prev) => new Map(prev).set(chatId, initialPrompt));
      return chatId;
    },
    onSuccess: (chatId) => navigate({ to: "/chat", search: { id: chatId } }),
    onError: errorToast,
  });
  const busy = update.isPending || openStudio.isPending;
  return (
    <>
      <div className="factory-project-header">
        <div>
          <div className="factory-eyebrow">{project.client}</div>
          <h2>{project.name}</h2>
        </div>
        <span className="factory-badge">{MODE_LABELS[project.mode]}</span>
      </div>
      <nav className="factory-tabs" aria-label="Etapas do projeto">
        {tabs.map((item, index) => (
          <button
            key={item}
            aria-current={tab === item ? "page" : undefined}
            onClick={() => setTab(item)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item}
          </button>
        ))}
      </nav>
      <div className="factory-tab-content">
        {tab === "Briefing" && (
          <BriefEditor
            project={project}
            busy={busy}
            save={(action, revision) => update.mutate({ action, revision })}
            open={() => openStudio.mutate("discover")}
          />
        )}
        {tab === "Plano" && (
          <PlanEditor
            project={project}
            busy={busy}
            save={(action, revision) => update.mutate({ action, revision })}
            open={() => openStudio.mutate("plan")}
          />
        )}
        {tab === "Design" && (
          <BrandEditor
            project={project}
            busy={busy}
            save={(action, revision) => update.mutate({ action, revision })}
          />
        )}
        {tab === "Studio" && (
          <>
            <PanelHeading
              title="O time virtual da Samba"
              description="Cada modo carrega seus skills. Discover, Plan, Design, Secure, Review e Ask usam ferramentas de leitura do runtime existente."
            />
            <div className="factory-mode-grid">
              {(Object.keys(MODE_LABELS) as FactoryMode[]).map((mode) => (
                <button
                  key={mode}
                  disabled={
                    busy ||
                    ((mode === "build" || mode === "fix") &&
                      buildBlockers(project).length > 0)
                  }
                  onClick={() => openStudio.mutate(mode)}
                >
                  <Sparkles size={18} />
                  <strong>{MODE_LABELS[mode]}</strong>
                  <small>
                    {getSkills(mode)
                      .map((skill) => skill.id.replace("skill-", ""))
                      .join(" · ") || "Consultar o código"}
                  </small>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            {buildBlockers(project).map((reason) => (
              <p className="factory-notice" key={reason}>
                {reason}
              </p>
            ))}
            <ScopeRequests
              project={project}
              busy={busy}
              save={(action, revision) => update.mutate({ action, revision })}
            />
          </>
        )}
        {tab === "Segurança" && (
          <div className="space-y-6">
            <SecurityPanel project={project} refresh={refresh} />
            {appPath && (
              <div className="border border-border rounded-xl p-5 bg-card mt-6">
                <PanelHeading
                  title="Governança e Portões de Segurança"
                  description="Aprovações, vetações e papéis do projeto com registro de hash encadeado."
                />
                <GovernancePanel appPath={appPath} />
              </div>
            )}
          </div>
        )}
        {tab === "Entrega" && (
          <div className="space-y-6">
            <ReleasePanel project={project} />
            {appPath && (
              <div className="border border-border rounded-xl p-5 bg-card mt-6">
                <PanelHeading
                  title="Governança de Release"
                  description="Verifique e aprove a etapa final do contrato antes de liberar a entrega."
                />
                <GovernancePanel appPath={appPath} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
function PanelHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="factory-panel-heading">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
type EditorProps = {
  project: FactoryProject;
  busy: boolean;
  save: (action: FactoryAction, revision?: number) => void;
};
// Bind editable fields to the snapshot the operator saw, not a later polling response.
function useDraftRevision(currentRevision: number, matchesSaved: boolean) {
  const [revision, setRevision] = useState(currentRevision);
  useEffect(() => {
    if (matchesSaved) setRevision(currentRevision);
  }, [currentRevision, matchesSaved]);
  return revision;
}
function BriefEditor({
  project,
  busy,
  save,
  open,
}: EditorProps & { open: () => void }) {
  const [brief, setBrief] = useState(project.brief);
  const [knowledge, setKnowledge] = useState(project.knowledge);
  const draftRevision = useDraftRevision(
    project.revision,
    brief === project.brief && knowledge === project.knowledge,
  );
  return (
    <>
      <PanelHeading
        title="Antes do código, o contexto."
        description="Registre o problema, os usuários, os resultados esperados e as restrições do contrato. Alterar o briefing exige nova aprovação do plano."
      />
      <form
        className="factory-form"
        onSubmit={(event) => {
          event.preventDefault();
          save({ type: "brief", brief, knowledge }, draftRevision);
        }}
      >
        <label>
          Briefing do cliente
          <Textarea
            required
            maxLength={30000}
            rows={10}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="O que precisamos resolver? Para quem? Como vamos saber que deu certo?"
          />
        </label>
        <label>
          Conhecimento do projeto
          <Textarea
            rows={4}
            maxLength={20000}
            value={knowledge}
            onChange={(event) => setKnowledge(event.target.value)}
            placeholder="Vocabulário do cliente, stack, integrações e decisões já tomadas."
          />
        </label>
        <div className="factory-actions">
          <Button disabled={busy || !brief.trim()}>Salvar briefing</Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !project.brief}
            onClick={open}
          >
            Abrir Discovery <ArrowUpRight />
          </Button>
        </div>
      </form>
    </>
  );
}
const newTask = () => ({
  id: crypto.randomUUID(),
  title: "",
  priority: "must" as const,
  acceptance: "",
  status: "todo" as const,
});
function PlanEditor({
  project,
  busy,
  save,
  open,
}: EditorProps & { open: () => void }) {
  const [draft, setDraft] = useState<FactoryPlan>(
    project.plan ?? {
      problem: "",
      users: "",
      stack: "React + TypeScript strict + Tailwind + Supabase",
      outOfScope: "",
      risks: "",
      tasks: [newTask()],
    },
  );
  const [actor, setActor] = useState("");
  const [json, setJson] = useState("");
  const planContent = (plan: FactoryPlan | null) =>
    plan
      ? {
          ...plan,
          tasks: plan.tasks.map(({ status: _status, ...task }) => task),
        }
      : null;
  const dirty =
    JSON.stringify(planContent(draft)) !==
    JSON.stringify(planContent(project.plan));
  const draftRevision = useDraftRevision(project.revision, !dirty);
  const updateField = (
    field: keyof Omit<FactoryPlan, "tasks">,
    value: string,
  ) => setDraft({ ...draft, [field]: value });
  return (
    <>
      <PanelHeading
        title="Um plano que pode ser aprovado."
        description="Defina Must / Should / Could e critérios verificáveis. Salvar alterações invalida a aprovação anterior."
      />
      <Button variant="outline" disabled={busy} onClick={open}>
        Planejar com o agente <ArrowUpRight />
      </Button>
      <details className="factory-details">
        <summary>Importar plano JSON produzido pelo agente</summary>
        <Textarea
          aria-label="JSON do plano"
          rows={5}
          value={json}
          onChange={(event) => setJson(event.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            try {
              const parsed: unknown = JSON.parse(json);
              const plan = PlanSchema.parse(parsed);
              setDraft(plan);
              setJson("");
              toast.success(
                "Plano importado para revisão. Salve antes de aprovar.",
              );
            } catch {
              toast.error(
                "JSON inválido. Use o formato do skill-prd, com IDs UUID nas tarefas.",
              );
            }
          }}
        >
          Importar para revisão
        </Button>
      </details>
      <form
        className="factory-form"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = PlanSchema.safeParse(draft);
          if (!parsed.success) {
            toast.error("Preencha todos os campos e critérios de aceite.");
            return;
          }
          save(
            {
              type: "plan",
              plan: {
                ...parsed.data,
                tasks: parsed.data.tasks.map((task) => ({
                  ...task,
                  status:
                    project.plan?.tasks.find(
                      (existing) => existing.id === task.id,
                    )?.status ?? "todo",
                })),
              },
            },
            draftRevision,
          );
        }}
      >
        <div className="factory-two-cols">
          {(
            [
              ["problem", "Problema"],
              ["users", "Usuários"],
              ["stack", "Stack"],
              ["outOfScope", "Fora de escopo"],
              ["risks", "Riscos e dependências"],
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              {label}
              <Textarea
                required
                rows={2}
                maxLength={2000}
                value={draft[field]}
                onChange={(event) => updateField(field, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="factory-section-title">
          <h3>Tarefas e critérios de aceite</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={draft.tasks.length >= 100}
            onClick={() =>
              setDraft({ ...draft, tasks: [...draft.tasks, newTask()] })
            }
          >
            <Plus /> Tarefa
          </Button>
        </div>
        <div className="factory-tasks">
          {draft.tasks.map((task, index) => (
            <div className="factory-task" key={task.id}>
              <div className="factory-task-line">
                <select
                  aria-label={`Prioridade da tarefa ${index + 1}`}
                  value={task.priority}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      tasks: draft.tasks.map((entry) =>
                        entry.id === task.id
                          ? {
                              ...entry,
                              priority: event.target
                                .value as typeof task.priority,
                            }
                          : entry,
                      ),
                    })
                  }
                >
                  <option value="must">Must</option>
                  <option value="should">Should</option>
                  <option value="could">Could</option>
                </select>
                <Input
                  required
                  maxLength={2000}
                  aria-label={`Título da tarefa ${index + 1}`}
                  placeholder="O que será entregue?"
                  value={task.title}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      tasks: draft.tasks.map((entry) =>
                        entry.id === task.id
                          ? { ...entry, title: event.target.value }
                          : entry,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remover tarefa ${index + 1}`}
                  disabled={draft.tasks.length === 1}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      tasks: draft.tasks.filter(
                        (entry) => entry.id !== task.id,
                      ),
                    })
                  }
                >
                  Remover
                </Button>
              </div>
              <Textarea
                required
                maxLength={2000}
                aria-label={`Aceite da tarefa ${index + 1}`}
                placeholder="Dado… Quando… Então…"
                value={task.acceptance}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tasks: draft.tasks.map((entry) =>
                      entry.id === task.id
                        ? { ...entry, acceptance: event.target.value }
                        : entry,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
        <Button disabled={busy || !dirty}>Salvar plano para revisão</Button>
      </form>
      <div className="factory-approval">
        <Fingerprint size={22} />
        <div>
          <strong>
            {project.approval
              ? `Aprovado por ${project.approval.actor}`
              : "Aprovação do plano"}
          </strong>
          <p>A identidade é declarada pelo operador local.</p>
        </div>
        <Input
          aria-label="Responsável pela aprovação do plano"
          placeholder="Seu nome"
          value={actor}
          onChange={(event) => setActor(event.target.value)}
        />
        <Button
          disabled={busy || dirty || !project.plan || actor.trim().length < 2}
          onClick={() => save({ type: "approve-plan", actor })}
        >
          <Check /> Aprovar
        </Button>
      </div>
      {project.approval && (
        <div className="factory-status-board">
          <h3>Execução do plano aprovado</h3>
          {project.plan?.tasks.map((task) => (
            <label key={task.id}>
              <span>
                {task.priority.toUpperCase()} · {task.title}
              </span>
              <select
                aria-label={`Status: ${task.title}`}
                disabled={busy}
                value={task.status}
                onChange={(event) =>
                  save({
                    type: "task",
                    taskId: task.id,
                    status: event.target.value as typeof task.status,
                  })
                }
              >
                <option value="todo">A fazer</option>
                <option value="doing">Em andamento</option>
                <option value="done">Concluída</option>
              </select>
            </label>
          ))}
        </div>
      )}
    </>
  );
}
const directions = [
  {
    name: "Samba · Editorial",
    primary: "#a54325",
    background: "#faf8f4",
    foreground: "#262720",
    radius: "4" as const,
    font: "Geist" as const,
  },
  {
    name: "Samba · Operações",
    primary: "#246353",
    background: "#f5f8f6",
    foreground: "#172b26",
    radius: "8" as const,
    font: "Inter" as const,
  },
  {
    name: "Samba · Produto",
    primary: "#314d85",
    background: "#f6f7fb",
    foreground: "#202936",
    radius: "16" as const,
    font: "system-ui" as const,
  },
];
function BrandEditor({ project, busy, save }: EditorProps) {
  const [brand, setBrand] = useState(project.brand ?? directions[0]);
  const draftRevision = useDraftRevision(
    project.revision,
    JSON.stringify(brand) === JSON.stringify(project.brand),
  );
  const [actor, setActor] = useState("");
  return (
    <>
      <PanelHeading
        title="Uma direção visual, uma fonte de verdade."
        description="Explore três presets de tokens, personalize a marca e confirme antes do Build. Estes são presets locais; não são telas geradas por IA."
      />
      <div className="factory-brand-grid">
        {directions.map((direction) => (
          <button
            key={direction.name}
            className={brand.name === direction.name ? "is-selected" : ""}
            onClick={() => setBrand(direction)}
            style={{
              background: direction.background,
              color: direction.foreground,
            }}
          >
            <span className="factory-brand-preview">
              <i
                style={{
                  background: direction.primary,
                  borderRadius: `${direction.radius}px`,
                }}
              />
              <span />
              <span />
            </span>
            <strong>{direction.name}</strong>
            <small>
              {direction.font} · {direction.radius}px
            </small>
          </button>
        ))}
      </div>
      <form
        className="factory-form"
        onSubmit={(event) => {
          event.preventDefault();
          save({ type: "brand", brand, actor }, draftRevision);
        }}
      >
        <label>
          Nome da direção
          <Input
            value={brand.name}
            onChange={(event) =>
              setBrand({ ...brand, name: event.target.value })
            }
            required
          />
        </label>
        <div className="factory-two-cols">
          {(
            [
              ["primary", "Cor principal"],
              ["background", "Fundo"],
              ["foreground", "Texto"],
            ] as const
          ).map(([field, label]) => (
            <label className="factory-color" key={field}>
              {label}
              <input
                type="color"
                value={brand[field]}
                onChange={(event) =>
                  setBrand({ ...brand, [field]: event.target.value })
                }
              />
              <code>{brand[field]}</code>
            </label>
          ))}
          <label>
            Responsável
            <Input
              required
              minLength={2}
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              placeholder="Seu nome"
            />
          </label>
        </div>
        <div
          className="factory-live-brand"
          style={{
            background: brand.background,
            color: brand.foreground,
            borderRadius: `${brand.radius}px`,
            fontFamily: `${brand.font}, system-ui, sans-serif`,
          }}
        >
          <small>PREVIEW DOS TOKENS</small>
          <h3>Bem-vindo ao seu workspace.</h3>
          <p>Informação clara. Uma ação de cada vez.</p>
          <span
            style={{
              background: brand.primary,
              color: "white",
              borderRadius: `${brand.radius}px`,
            }}
          >
            Criar projeto
          </span>
        </div>
        <Button disabled={busy || actor.trim().length < 2}>
          Confirmar tokens de marca
        </Button>
        {project.brandApproval && (
          <p>Confirmado por {project.brandApproval.actor}.</p>
        )}
      </form>
    </>
  );
}
function ScopeRequests({ project, busy, save }: EditorProps) {
  const [request, setRequest] = useState("");
  const [actor, setActor] = useState("");
  const [taskId, setTaskId] = useState("");
  return (
    <section className="factory-scope">
      <PanelHeading
        title="Scope Guard"
        description="Registre novos pedidos antes de construir. Pedidos pendentes bloqueiam Build; classifique como tarefa contratada, change request ou rejeição."
      />
      <form
        className="factory-form"
        onSubmit={(event) => {
          event.preventDefault();
          save({ type: "request", request });
        }}
      >
        <label>
          Novo pedido
          <Textarea
            required
            maxLength={2000}
            value={request}
            onChange={(event) => setRequest(event.target.value)}
          />
        </label>
        <Button disabled={busy || !request.trim()}>Registrar pedido</Button>
      </form>
      <div className="factory-two-cols">
        <label>
          Responsável pela classificação
          <Input
            value={actor}
            onChange={(event) => setActor(event.target.value)}
          />
        </label>
        <label>
          Tarefa contratada
          <select
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
          >
            <option value="">Escolher tarefa</option>
            {project.plan?.tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {project.changes.map((change) => (
        <article className="factory-task" key={change.id}>
          <strong>{change.request}</strong>
          <p>{change.status}</p>
          <div className="factory-actions">
            {(
              [
                ["in-scope", "Dentro do escopo"],
                ["change-request", "Change request"],
                ["rejected", "Rejeitar"],
              ] as const
            ).map(([status, label]) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                disabled={
                  busy ||
                  actor.trim().length < 2 ||
                  (status === "in-scope" && !taskId)
                }
                onClick={() =>
                  save({
                    type: "resolve-request",
                    id: change.id,
                    status,
                    taskId: status === "in-scope" ? taskId : null,
                    actor,
                  })
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
function SecurityPanel({
  project,
  refresh,
}: {
  project: FactoryProject;
  refresh: () => Promise<void>;
}) {
  const scan = useMutation({
    mutationFn: () =>
      factoryClient.scan({ appId: project.appId, revision: project.revision }),
    onSuccess: refresh,
    onError: errorToast,
  });
  return (
    <>
      <PanelHeading
        title="Segurança com evidência."
        description="Verifica secrets, CORS e RLS nas fontes locais, executa typecheck e test:smoke do projeto e consulta npm audit. O scan básico não substitui revisão AppSec."
      />
      <p className="factory-notice">
        Ao verificar, o Builder executa os scripts typecheck (ou ts) e
        test:smoke deste projeto na sua máquina e consulta o registry npm.
        Limite de 2 minutos por script.
      </p>
      <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
        <ShieldCheck />
        {scan.isPending
          ? "Verificando projeto…"
          : "Executar verificação de release"}
      </Button>
      {scan.isPending && (
        <p role="status">
          Executando verificações. O resultado será salvo mesmo se você trocar
          de etapa.
        </p>
      )}
      {project.scan ? (
        <>
          <div className="factory-checks">
            {(
              [
                ["Typecheck", project.scan.typecheck],
                ["Smoke test", project.scan.smoke],
                ["Dependências", project.scan.dependencies],
              ] as const
            ).map(([name, status]) => (
              <div key={name}>
                <span>{name}</span>
                <strong data-result={status}>
                  {status === "passed"
                    ? "Aprovado"
                    : status === "failed"
                      ? "Falhou"
                      : "Não verificado"}
                </strong>
              </div>
            ))}
          </div>
          <p className="factory-muted">
            Última execução: {new Date(project.scan.at).toLocaleString("pt-BR")}
          </p>
          <div className="factory-findings">
            {project.scan.findings.map((finding) => (
              <article key={finding.id}>
                <span
                  className="factory-severity"
                  data-severity={finding.severity}
                >
                  {finding.severity}
                </span>
                <strong>{finding.message}</strong>
                <code>
                  {finding.file}:{finding.line}
                </code>
                <p>{finding.remediation}</p>
              </article>
            ))}
          </div>
          {project.scan.findings.length === 0 && (
            <p>
              Nenhum achado nas regras locais executadas. Confira a cobertura e
              as limitações abaixo.
            </p>
          )}
          <details className="factory-details">
            <summary>Cobertura e limitações</summary>
            {project.scan.limitations.map((limitation) => (
              <p key={limitation}>{limitation}</p>
            ))}
          </details>
        </>
      ) : (
        <div className="factory-inline-empty">
          <ShieldCheck size={24} />
          <p>Este projeto ainda não tem evidências de verificação.</p>
        </div>
      )}
    </>
  );
}
function ReleasePanel({ project }: { project: FactoryProject }) {
  const gate = useQuery({
    queryKey: queryKeys.factory.gate(project.appId),
    queryFn: () => factoryClient.gate({ appId: project.appId }),
    refetchInterval: 5000,
  });
  const exported = useMutation({
    mutationFn: () =>
      factoryClient.export({
        appId: project.appId,
        revision: project.revision,
      }),
    onSuccess: (files) =>
      toast.success(
        `${files.length} artefatos exportados para docs/ e samba/.`,
      ),
    onError: errorToast,
  });
  return (
    <>
      <PanelHeading
        title="Entregar é mais que publicar."
        description="Revise os bloqueios, exporte o handoff e use as integrações existentes para GitHub e deploy. O gate é revalidado no processo principal."
      />
      <div
        className={`factory-release-gate ${gate.data?.length === 0 && !gate.isError ? "is-ready" : ""}`}
      >
        <ShieldCheck size={24} />
        <div>
          <strong>
            {gate.isPending
              ? "Verificando código atual…"
              : gate.isError
                ? "Não foi possível verificar"
                : gate.data?.length
                  ? "Publicação bloqueada"
                  : "Verificações locais aprovadas"}
          </strong>
          <p>
            {gate.isError
              ? gate.error.message
              : "Git push, criação Vercel e deploy Coolify consultam o gate para projetos da Fábrica."}
          </p>
        </div>
      </div>
      {gate.data?.map((reason) => (
        <p className="factory-notice" key={reason}>
          {reason}
        </p>
      ))}
      <div className="factory-actions">
        <Button disabled={exported.isPending} onClick={() => exported.mutate()}>
          <Download /> Exportar / atualizar handoff
        </Button>
        <Button
          variant="outline"
          disabled={exported.isPending}
          onClick={async () => {
            try {
              await exported.mutateAsync();
              toast.success(
                "Aprendizado do projeto compilado em samba/learning-report.md e pronto para absorção pelo Córtex!",
              );
            } catch (err) {
              errorToast(err as Error);
            }
          }}
        >
          <BookOpen size={16} /> Registrar aprendizado no Córtex
        </Button>
        <Link to="/app-details" search={{ appId: project.appId }}>
          Abrir GitHub e deploy <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="factory-muted">
        Exporta briefing, plano, escopo, tokens, relatório de segurança,
        checklist de handoff, skills.lock e histórico. Aprovações locais não são
        substituídas por arquivos do repositório.
      </p>
      <details className="factory-details">
        <summary>
          Histórico de decisões · {project.audit.length} eventos
        </summary>
        <ol className="factory-audit">
          {[...project.audit].reverse().map((event, index) => (
            <li key={`${event.revision}-${index}`}>
              <strong>{event.action}</strong>
              <span>
                {event.actor} · {new Date(event.at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
