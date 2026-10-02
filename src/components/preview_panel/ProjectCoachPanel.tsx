import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import { useQuery } from "@tanstack/react-query";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { SpecialistAvatar } from "@/components/SpecialistAvatar";
import { ProjectManagementPanel } from "@/components/ProjectManagementPanel";
import { Button } from "@/components/ui/button";
import { useStreamChat } from "@/hooks/useStreamChat";
import { ipc } from "@/ipc/types";
import {
  composeSpecialistTaskPrompt,
  getSpecialistAgent,
} from "@/lib/specialist_agents";
import {
  buildProjectCoachBriefing,
  composeProjectCoachPrompt,
  type CoachTipId,
} from "@/lib/project_coach";
import type { DeliveryPlan } from "@/delivery/model";
import type { TFunction } from "i18next";

function stageLabel(stage: DeliveryPlan["stage"], t: TFunction<"home">) {
  switch (stage) {
    case "development":
      return t("preview.coach.stageDevelopment");
    case "review":
      return t("preview.coach.stageReview");
    case "approved":
      return t("preview.coach.stageApproved");
    case "delivered":
      return t("preview.coach.stageDelivered");
    default:
      return t("preview.coach.stageBriefing");
  }
}

function tipCopy(tip: CoachTipId, t: TFunction<"home">, architectName: string) {
  switch (tip) {
    case "tokens":
      return t("preview.coach.tipTokens");
    case "timeDue":
      return t("preview.coach.tipTimeDue");
    case "timeOverdue":
      return t("preview.coach.tipTimeOverdue");
    case "timeNone":
      return t("preview.coach.tipTimeNone");
    case "architecture":
      return t("preview.coach.tipArchitecture", { name: architectName });
    case "commits":
      return t("preview.coach.tipCommits");
    case "quality":
      return t("preview.coach.tipQuality");
  }
}

export function ProjectCoachPanel() {
  const { t } = useTranslation("home");
  const appId = useAtomValue(selectedAppIdAtom);
  const chatId = useAtomValue(selectedChatIdAtom);
  const { streamMessage, isStreaming } = useStreamChat();
  const sol = getSpecialistAgent("pm");
  const neri = getSpecialistAgent("architect");

  const delivery = useQuery({
    queryKey: ["project-delivery", appId],
    queryFn: () => ipc.delivery.get({ appId: appId! }),
    enabled: appId != null,
  });
  const management = useQuery({
    queryKey: ["management", appId],
    queryFn: () => ipc.management.get({ appId: appId! }),
    enabled: appId != null,
  });
  const metrics = useQuery({
    queryKey: ["management-metrics", appId, ""],
    queryFn: () => ipc.management.metrics({ appId: appId! }),
    enabled: appId != null && !!management.data,
    refetchOnWindowFocus: false,
  });

  if (appId == null) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {t("preview.noAppSelected")}
      </div>
    );
  }

  const loading = delivery.isPending || management.isPending;
  const error = delivery.error ?? management.error ?? metrics.error;
  const briefing = buildProjectCoachBriefing({
    plan: delivery.data?.plan,
    metrics: metrics.data,
  });

  const talkToSol = () => {
    if (!chatId || !sol) return;
    streamMessage({
      chatId,
      prompt: composeSpecialistTaskPrompt(
        sol,
        composeProjectCoachPrompt(briefing),
      ),
    });
  };

  const callNeri = () => {
    if (!chatId || !neri) return;
    streamMessage({
      chatId,
      prompt: composeSpecialistTaskPrompt(
        neri,
        "Revise a arquitetura deste projeto: módulos, fronteiras e riscos de manutenção. Diga o que olhar agora e o que pode esperar.",
      ),
    });
  };

  return (
    <div
      className="h-full overflow-y-auto p-4"
      data-testid="project-coach-panel"
    >
      <header className="mb-4 flex items-start gap-3">
        {sol && <SpecialistAvatar agent={sol} size="lg" />}
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t("preview.coach.hello", { name: sol?.persona ?? "Sol" })}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t("preview.coach.hint")}
          </p>
        </div>
      </header>

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("preview.coach.loading")}
        </p>
      ) : error ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>{t("preview.coach.loadError")}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void delivery.refetch();
              void management.refetch();
              void metrics.refetch();
            }}
          >
            {t("preview.coach.retry")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-xl border border-primary/20 bg-primary/4 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("preview.coach.stageLabel")}
            </p>
            <p className="text-sm font-semibold">
              {stageLabel(briefing.stage, t)}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {briefing.dueDate
                ? briefing.overdue
                  ? t("preview.coach.dueOverdue", { date: briefing.dueDate })
                  : t("preview.coach.dueOn", {
                      date: briefing.dueDate,
                      count: briefing.daysUntilDue ?? 0,
                    })
                : t("preview.coach.noDue")}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label={t("preview.coach.tokens")}
              value={briefing.tokenTotal.toLocaleString()}
            />
            <Stat
              label={t("preview.coach.commits")}
              value={
                briefing.commits == null
                  ? t("preview.coach.unknown")
                  : String(briefing.commits)
              }
            />
            <Stat
              label={t("preview.coach.hours")}
              value={briefing.hours.toFixed(1)}
            />
            <Stat
              label={t("preview.coach.openTasks")}
              value={`${briefing.openTasks}`}
            />
          </dl>

          <CoachList
            title={t("preview.coach.today")}
            empty={t("preview.coach.todayEmpty")}
            items={briefing.today}
          />
          <CoachList
            title={t("preview.coach.later")}
            empty={t("preview.coach.laterEmpty")}
            items={briefing.later}
          />

          {briefing.lookAt.length > 0 && (
            <section>
              <h3 className="mb-1 text-sm font-medium">
                {t("preview.coach.lookAt")}
              </h3>
              <ul className="list-disc space-y-1 pl-4 text-[13px] text-muted-foreground">
                {briefing.lookAt.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {briefing.tips.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("preview.coach.tips")}</h3>
              {briefing.tips.map((tip) => (
                <p
                  key={tip}
                  className="rounded-lg border bg-background/70 px-3 py-2 text-[13px]"
                >
                  {tipCopy(tip, t, neri?.persona ?? "Neri")}
                </p>
              ))}
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isStreaming || !chatId}
              onClick={talkToSol}
            >
              {t("preview.coach.talk", { name: sol?.persona ?? "Sol" })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isStreaming || !chatId}
              onClick={callNeri}
            >
              {t("preview.coach.callArchitect", {
                name: neri?.persona ?? "Neri",
              })}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <ProjectManagementPanel appId={appId} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function CoachList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; why: string }[];
}) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border px-3 py-2">
              <p className="text-sm">{item.title}</p>
              <p className="text-[12px] italic text-muted-foreground">
                {item.why}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
