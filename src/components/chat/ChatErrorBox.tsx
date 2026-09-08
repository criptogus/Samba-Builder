import { ipc } from "@/ipc/types";
import { useFreeAgentQuota } from "@/hooks/useFreeAgentQuota";
import { X, MessageSquarePlus, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

// Samba Builder: sem plano Pro/assinatura — erros de quota free, créditos e
// upgrade (herança do Dyad) foram removidos. O usuário vê o erro real e ações
// úteis (switch de modo, novo chat), nunca um link de assinatura.

export function ChatErrorBox({
  onDismiss,
  error,
  isDyadProEnabled,
  onStartNewChat,
  onSwitchToBuildMode,
}: {
  onDismiss: () => void;
  error: string;
  isDyadProEnabled: boolean;
  onStartNewChat?: () => void;
  onSwitchToBuildMode?: () => void;
}) {
  const fallbackPrefix = "Fallbacks=[{";
  const normalizedError = error.includes(fallbackPrefix)
    ? error.split(fallbackPrefix)[0]
    : error;
  const freeAgentQuotaError = parseFreeAgentQuotaError(normalizedError);
  const { messagesLimit, resetTime } = useFreeAgentQuota();

  // Quota diária do modo Basic Agent (quando aplicável) — informativo, sem
  // upgrade: o usuário espera o reset ou muda de modo.
  if (freeAgentQuotaError) {
    const authoritativeResetTime = freeAgentQuotaError.resetTime ?? resetTime;
    const resetText = authoritativeResetTime
      ? ` Your quota resets at ${new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date(authoritativeResetTime))}.`
      : "";

    return (
      <ChatErrorContainer onDismiss={onDismiss}>
        You have used all {messagesLimit} free Basic Agent messages for today.
        {resetText} This message was not sent. Switch to Build mode (or wait for
        the reset) to continue.
        {onSwitchToBuildMode && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSwitchToBuildMode}
              className="gap-1.5"
            >
              Switch to Build
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </ChatErrorContainer>
    );
  }

  return (
    <ChatErrorContainer onDismiss={onDismiss}>
      <div className="max-h-64 overflow-y-auto scrollbar-on-hover">
        <ErrorMarkdown>{error}</ErrorMarkdown>
      </div>
      {isDyadProEnabled && onStartNewChat && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger
              onClick={onStartNewChat}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
            >
              <span>Start new chat</span>
              <MessageSquarePlus size={18} />
            </TooltipTrigger>
            <TooltipContent>
              Starting a new chat can fix some issues
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </ChatErrorContainer>
  );
}

function parseFreeAgentQuotaError(
  error: string,
): { resetTime?: number | null } | null {
  try {
    const parsed: unknown = JSON.parse(error);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      parsed.type === "FREE_AGENT_QUOTA_EXCEEDED"
    ) {
      const resetTime = "resetTime" in parsed ? parsed.resetTime : undefined;
      return {
        resetTime:
          typeof resetTime === "number" && Number.isFinite(resetTime)
            ? resetTime
            : null,
      };
    }
  } catch {
    // Fall through to the legacy string marker check below.
  }
  return error.includes("FREE_AGENT_QUOTA_EXCEEDED") ? {} : null;
}

function ChatErrorContainer({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode | string;
}) {
  return (
    <div
      data-testid="chat-error-box"
      className="relative mt-2 bg-red-50 border border-red-200 rounded-md shadow-sm p-2 mx-4"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2.5 left-2 p-1 hover:bg-red-100 rounded"
      >
        <X size={14} className="text-red-500" />
      </button>
      <div className="pl-8 py-1 text-sm">
        <div className="text-red-700 text-wrap">
          {typeof children === "string" ? (
            <ErrorMarkdown>{children}</ErrorMarkdown>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children: linkChildren, ...props }) => (
          <a
            {...props}
            onClick={(e) => {
              e.preventDefault();
              if (props.href) {
                ipc.system.openExternalUrl(props.href);
              }
            }}
            className="text-blue-500 hover:text-blue-700"
          >
            {linkChildren}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
