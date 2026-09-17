import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { SpecialistAvatar } from "@/components/SpecialistAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStreamChat } from "@/hooks/useStreamChat";
import type { NextStepAction } from "@/lib/schemas";
import {
  composeSpecialistTaskPrompt,
  getSpecialistAgent,
  type SpecialistAgent,
} from "@/lib/specialist_agents";
import { nextStepActionFromAttributes } from "@/lib/next_step_action";
import type { Block } from "@/lib/streamingMessageParser";

export function SpecialistNextStepHuddle({ blocks }: { blocks: Block[] }) {
  const { t } = useTranslation("chat");
  const actions = blocks
    .map((block) =>
      block.kind === "custom-tag"
        ? nextStepActionFromAttributes(block.attributes)
        : null,
    )
    .filter((action): action is NextStepAction => action !== null);
  const helpers = uniqueHelpers(actions);
  if (actions.length === 0) return null;

  return (
    <section
      className="my-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/4"
      aria-label={t("specialistHuddleTitle")}
    >
      <header className="flex items-start gap-2.5 border-b border-primary/15 px-3 py-2.5">
        {helpers.length > 0 && (
          <span className="flex shrink-0 items-center -space-x-1.5 pt-0.5">
            {helpers.map((agent) => (
              <SpecialistAvatar
                key={agent.id}
                agent={agent}
                size="sm"
                decorative
              />
            ))}
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            {t("specialistHuddleTitle")}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {t("specialistHuddleHint")}
          </span>
        </span>
      </header>
      <div className="flex flex-col gap-1 p-1.5">
        {actions.map((action, index) => (
          <NextStepButton
            key={`${action.specialist ?? "step"}-${index}-${action.prompt}`}
            action={action}
            inHuddle
          />
        ))}
      </div>
    </section>
  );
}

function uniqueHelpers(actions: NextStepAction[]): SpecialistAgent[] {
  const seen = new Set<string>();
  const helpers: SpecialistAgent[] = [];
  for (const action of actions) {
    const agent = getSpecialistAgent(action.specialist);
    if (!agent || seen.has(agent.id)) continue;
    seen.add(agent.id);
    helpers.push(agent);
  }
  return helpers;
}

export function NextStepButton({
  action,
  inHuddle = false,
}: {
  action: NextStepAction;
  inHuddle?: boolean;
}) {
  const { t } = useTranslation("chat");
  const { streamMessage, isStreaming } = useStreamChat();
  const chatId = useAtomValue(selectedChatIdAtom);
  const agent = getSpecialistAgent(action.specialist);
  const onClick = () => {
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    streamMessage({
      prompt: agent
        ? composeSpecialistTaskPrompt(agent, action.prompt, action.why)
        : action.prompt,
      chatId,
    });
  };
  const accessibleName = agent
    ? t("specialistRecommendsPrompt", {
        name: agent.persona,
        prompt: action.prompt,
      })
    : action.prompt;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            disabled={isStreaming}
            onClick={onClick}
            aria-label={accessibleName}
            className={
              inHuddle
                ? "group flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-60"
                : "group my-1 flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            }
          />
        }
      >
        {agent ? (
          <SpecialistAvatar agent={agent} size="sm" />
        ) : (
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        )}
        <span className="min-w-0 flex-1">
          {agent && (
            <span className="block text-[11px] font-medium text-muted-foreground">
              {t("specialistRecommends", { name: agent.persona })}
              <span className="font-normal"> · {agent.name}</span>
            </span>
          )}
          {action.why && (
            <span className="mt-0.5 block text-[11px] italic text-muted-foreground">
              {action.why}
            </span>
          )}
          <span className="mt-0.5 block line-clamp-2">{action.prompt}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {agent ? `${agent.persona} · ${agent.tagline}` : action.prompt}
      </TooltipContent>
    </Tooltip>
  );
}
