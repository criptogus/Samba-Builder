import {
  deliveryAttention,
  deliveryBlockers,
  emptyDeliveryPlan,
  qualityAreas,
  type DeliveryPlan,
} from "@/delivery/model";
import type { Metrics } from "@/management/model";

export type CoachWhen = "today" | "later";

export type CoachItem = {
  id: string;
  title: string;
  why: string;
  when: CoachWhen;
};

export type CoachTipId =
  | "tokens"
  | "timeDue"
  | "timeOverdue"
  | "timeNone"
  | "architecture"
  | "commits"
  | "quality";

export type ProjectCoachBriefing = {
  stage: DeliveryPlan["stage"];
  dueDate: string;
  daysUntilDue: number | null;
  overdue: boolean;
  tokenTotal: number;
  commits: number | null;
  codeLines: number;
  hours: number;
  completedTasks: number;
  openTasks: number;
  lookAt: string[];
  today: CoachItem[];
  later: CoachItem[];
  tips: CoachTipId[];
};

const TOKEN_TIP_THRESHOLD = 150_000;
const ARCHITECTURE_FILE_THRESHOLD = 12;

export function localIsoDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00`);
  const to = Date.parse(`${toIso}T00:00:00`);
  return Math.round((to - from) / 86_400_000);
}

export function buildProjectCoachBriefing({
  plan = emptyDeliveryPlan(),
  metrics,
  today = localIsoDate(),
}: {
  plan?: DeliveryPlan;
  metrics?: Metrics | null;
  today?: string;
}): ProjectCoachBriefing {
  const tokenTotal =
    metrics?.tokens.reduce(
      (sum, row) => sum + row.inputTokens + row.outputTokens,
      0,
    ) ?? 0;
  const dueDate = plan.dueDate.trim();
  const overdue = Boolean(dueDate && dueDate < today);
  const daysUntilDue = dueDate ? daysBetween(today, dueDate) : null;
  const open = plan.tasks.filter((task) => task.status !== "done");
  const blocked = open.filter((task) => task.status === "blocked");
  const doing = open.filter((task) => task.status === "doing");
  const todos = open.filter((task) => task.status === "todo");
  const lookAt = [
    ...deliveryAttention(plan, today),
    ...deliveryBlockers(plan),
    ...qualityAreas
      .filter((area) => !plan.checks[area].trim())
      .map((area) => `Checagem de ${area} ainda sem evidência`),
  ];
  const uniqueLookAt = [...new Set(lookAt)];

  const todayItems: CoachItem[] = [];
  const laterItems: CoachItem[] = [];

  if (
    plan.stage === "briefing" &&
    (!plan.scope.trim() || !plan.acceptance.trim())
  ) {
    todayItems.push({
      id: "briefing",
      title: "Fechar briefing e aceite",
      why: "Sem escopo e critérios, o time constrói no escuro.",
      when: "today",
    });
  }
  if (plan.stage === "review") {
    todayItems.push({
      id: "review",
      title: "Conduzir a revisão e a evidência",
      why: "A entrega está parada no olhar humano — isso desbloqueia o restante.",
      when: "today",
    });
  }

  for (const task of [...blocked, ...doing]) {
    todayItems.push({
      id: task.id,
      title: task.title,
      why:
        task.status === "blocked"
          ? "Está bloqueada: resolver o impedimento rende mais do que abrir outra frente."
          : "Já está em andamento — termine antes de começar outra.",
      when: "today",
    });
  }

  const remainingSlots = Math.max(0, 2 - todayItems.length);
  for (const task of todos.slice(0, remainingSlots)) {
    todayItems.push({
      id: task.id,
      title: task.title,
      why: "Cabe no dia e desbloqueia o próximo passo da entrega.",
      when: "today",
    });
  }
  for (const task of todos.slice(remainingSlots)) {
    laterItems.push({
      id: task.id,
      title: task.title,
      why: "Importa, mas não precisa competir com o foco de hoje.",
      when: "later",
    });
  }

  if (
    plan.stage === "development" &&
    (metrics?.codeFiles ?? 0) >= ARCHITECTURE_FILE_THRESHOLD
  ) {
    laterItems.push({
      id: "architecture",
      title: "Pedir ao Neri um olhar de arquitetura",
      why: "O código já cresceu o bastante para valer uma checagem de fronteiras.",
      when: "later",
    });
  }

  const tips: CoachTipId[] = [];
  if (overdue) tips.push("timeOverdue");
  else if (daysUntilDue !== null && daysUntilDue <= 3) tips.push("timeDue");
  else if (!dueDate && plan.stage !== "delivered") tips.push("timeNone");
  if (tokenTotal >= TOKEN_TIP_THRESHOLD) tips.push("tokens");
  if (
    (metrics?.commits === 0 || metrics?.commits == null) &&
    (metrics?.codeLines ?? 0) > 0
  ) {
    tips.push("commits");
  }
  if (
    qualityAreas.some((area) => !plan.checks[area].trim()) &&
    plan.stage !== "briefing"
  ) {
    tips.push("quality");
  }
  if ((metrics?.codeFiles ?? 0) >= ARCHITECTURE_FILE_THRESHOLD) {
    tips.push("architecture");
  }

  return {
    stage: plan.stage,
    dueDate,
    daysUntilDue,
    overdue,
    tokenTotal,
    commits: metrics?.commits ?? null,
    codeLines: metrics?.codeLines ?? 0,
    hours: (metrics?.minutes ?? 0) / 60,
    completedTasks:
      metrics?.completedTasks ??
      plan.tasks.filter((t) => t.status === "done").length,
    openTasks: open.length,
    lookAt: uniqueLookAt,
    today: todayItems,
    later: laterItems,
    tips,
  };
}

export function composeProjectCoachPrompt(
  briefing: ProjectCoachBriefing,
): string {
  const today = briefing.today
    .map((item) => `- ${item.title} (${item.why})`)
    .join("\n");
  const later = briefing.later.map((item) => `- ${item.title}`).join("\n");
  const look = briefing.lookAt.slice(0, 6).join("; ");
  return [
    `Estamos na etapa ${briefing.stage}.`,
    briefing.dueDate
      ? `Prazo: ${briefing.dueDate}${briefing.overdue ? " (vencido)" : ""}.`
      : "Ainda não há prazo registrado.",
    `Tokens registrados: ${briefing.tokenTotal}. Commits na janela: ${briefing.commits ?? "sem medição"}.`,
    look ? `Ainda precisamos olhar: ${look}.` : "",
    today
      ? `Fazer hoje:\n${today}`
      : "Não há um foco claro para hoje — ajude a escolher um.",
    later ? `Pode ficar para depois:\n${later}` : "",
    "Oriente o programador no passo a passo: o que fazer agora, o que deixar, e dicas de tempo, tokens e arquitetura. Seja próxima, concreta e em pt-BR.",
  ]
    .filter(Boolean)
    .join("\n");
}
