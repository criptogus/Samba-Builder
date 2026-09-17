import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSummarizeInNewChat } from "./SummarizeInNewChatButton";

const CONTEXT_LIMIT_THRESHOLD = 40_000;
const LONG_CONTEXT_THRESHOLD = 200_000;
/** Abaixo disto o sistema resume sozinho: nao da para confiar em caber mais um turno. */
const AUTO_SUMMARIZE_REMAINING_TOKENS = 20_000;

interface ContextLimitBannerProps {
  totalTokens?: number | null;
  contextWindow?: number;
  /** Dispensa o aviso. Sem isto, o banner nao oferece sair. */
  onDismiss?: () => void;
}

/** Check if the context limit banner should be shown */
export function shouldShowContextLimitBanner({
  totalTokens,
  contextWindow,
}: ContextLimitBannerProps): boolean {
  if (!totalTokens || !contextWindow) {
    return false;
  }
  // Show if long context (costs extra)
  if (totalTokens > LONG_CONTEXT_THRESHOLD) {
    return true;
  }
  // Show if close to context limit
  const tokensRemaining = contextWindow - totalTokens;
  return tokensRemaining <= CONTEXT_LIMIT_THRESHOLD;
}

/**
 * Decide se o resumo automatico deve disparar.
 *
 * Ligado quando resta menos de `AUTO_SUMMARIZE_REMAINING_TOKENS` de janela: o
 * proximo turno pode nao caber, e um turno que estoura perde trabalho do
 * usuario. Puro, para poder ser testado sem UI.
 */
export function shouldAutoSummarize({
  totalTokens,
  contextWindow,
}: ContextLimitBannerProps): boolean {
  if (!totalTokens || !contextWindow) {
    return false;
  }
  return contextWindow - totalTokens <= AUTO_SUMMARIZE_REMAINING_TOKENS;
}

export function ContextLimitBanner({
  totalTokens,
  contextWindow,
  onDismiss,
}: ContextLimitBannerProps) {
  const { t } = useTranslation("chat");
  const { handleSummarize } = useSummarizeInNewChat();

  if (!shouldShowContextLimitBanner({ totalTokens, contextWindow })) {
    return null;
  }

  const tokensRemaining = contextWindow! - totalTokens!;
  const isNearLimit = tokensRemaining <= CONTEXT_LIMIT_THRESHOLD;
  const message = isNearLimit
    ? t("contextLimitRunningOut")
    : t("contextLimitLongCostsExtra");

  return (
    <div
      className="mx-auto max-w-3xl px-3 py-1.5 rounded-t-2xl border-t border-l border-r border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3 text-xs text-amber-600 dark:text-amber-500"
      data-testid="context-limit-banner"
    >
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{message}</span>
      </span>
      <span className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                onClick={handleSummarize}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 hover:border-amber-500/60"
              />
            }
          >
            {t("contextLimitSummarize")}
            <ArrowRight className="h-3 w-3 ml-1" />
          </TooltipTrigger>
          <TooltipContent>{t("contextLimitSummarizeTooltip")}</TooltipContent>
        </Tooltip>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20"
            aria-label={t("contextLimitDismiss")}
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </span>
    </div>
  );
}
