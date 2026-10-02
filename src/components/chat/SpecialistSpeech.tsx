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
import {
  composeSpecialistInvitePrompt,
  getSpecialistAgent,
  type SpecialistAgent,
} from "@/lib/specialist_agents";
import {
  specialistInviteFromBlock,
  specialistSayFromBlock,
  type SpecialistInvite,
  type SpecialistSay,
} from "@/lib/specialist_speech";
import type { Block } from "@/lib/streamingMessageParser";

export function SpecialistTalkHuddle({ blocks }: { blocks: Block[] }) {
  const { t } = useTranslation("chat");
  const helpers = uniqueTalkHelpers(blocks);
  if (blocks.length === 0) return null;

  return (
    <section
      className="my-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/4"
      aria-label={t("specialistTalkTitle")}
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
            {t("specialistTalkTitle")}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {t("specialistTalkHint")}
          </span>
        </span>
      </header>
      <div className="flex flex-col gap-1.5 p-1.5">
        {blocks.map((block) => {
          const say = specialistSayFromBlock(block);
          if (say) {
            return <SpecialistSayBubble key={block.id} say={say} />;
          }
          const invite = specialistInviteFromBlock(block);
          if (invite) {
            return <SpecialistInviteCard key={block.id} invite={invite} />;
          }
          return null;
        })}
      </div>
    </section>
  );
}

function uniqueTalkHelpers(blocks: Block[]): SpecialistAgent[] {
  const seen = new Set<string>();
  const helpers: SpecialistAgent[] = [];
  const push = (id: string | undefined) => {
    const agent = getSpecialistAgent(id);
    if (!agent || seen.has(agent.id)) return;
    seen.add(agent.id);
    helpers.push(agent);
  };
  for (const block of blocks) {
    const say = specialistSayFromBlock(block);
    if (say) {
      push(say.specialist);
      continue;
    }
    const invite = specialistInviteFromBlock(block);
    if (invite) {
      push(invite.from);
      push(invite.specialist);
    }
  }
  return helpers;
}

function SpecialistSayBubble({ say }: { say: SpecialistSay }) {
  const { t } = useTranslation("chat");
  const agent = getSpecialistAgent(say.specialist);
  if (!agent) return null;
  const aboutKey =
    say.about === "next"
      ? "specialistSaidAboutNext"
      : "specialistSaidAboutDone";

  return (
    <article className="flex items-start gap-2.5 rounded-lg px-2 py-2">
      <SpecialistAvatar agent={agent} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">
          {t(aboutKey, { name: agent.persona })}
          <span className="font-normal"> · {agent.name}</span>
        </p>
        <p className="mt-0.5 text-sm leading-snug">{say.body}</p>
      </div>
    </article>
  );
}

function SpecialistInviteCard({ invite }: { invite: SpecialistInvite }) {
  const { t } = useTranslation("chat");
  const { streamMessage, isStreaming } = useStreamChat();
  const chatId = useAtomValue(selectedChatIdAtom);
  const invitee = getSpecialistAgent(invite.specialist);
  const caller = getSpecialistAgent(invite.from);
  if (!invitee) return null;

  const onClick = () => {
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    streamMessage({
      prompt: composeSpecialistInvitePrompt(
        invitee,
        invite.prompt,
        invite.why,
        caller,
      ),
      chatId,
    });
  };

  const title = caller
    ? t("specialistInviteTitle", {
        from: caller.persona,
        to: invitee.persona,
      })
    : t("specialistInviteSoloTitle", { name: invitee.persona });
  const accessibleName = t("specialistInvitePrompt", {
    name: invitee.persona,
    prompt: invite.prompt,
  });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            disabled={isStreaming}
            onClick={onClick}
            aria-label={accessibleName}
            className="group flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-primary/20 bg-background/70 px-2 py-2 text-left text-sm transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          />
        }
      >
        <span className="flex shrink-0 items-center -space-x-1.5 pt-0.5">
          {caller && <SpecialistAvatar agent={caller} size="sm" decorative />}
          <SpecialistAvatar agent={invitee} size="sm" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium text-muted-foreground">
            {title}
            <span className="font-normal"> · {invitee.name}</span>
          </span>
          {invite.why && (
            <span className="mt-0.5 block text-[11px] italic text-muted-foreground">
              {invite.why}
            </span>
          )}
          <span className="mt-0.5 flex items-center gap-1">
            <span className="line-clamp-2">{invite.prompt}</span>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("specialistInviteCta", { name: invitee.persona })}
      </TooltipContent>
    </Tooltip>
  );
}
