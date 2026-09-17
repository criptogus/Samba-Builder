import { getActiveWindowSessionId } from "@/window_infrastructure/chat_tab_session_storage";
import { lazy, Suspense, useState } from "react";
import {
  AudioLines,
  ChevronDown,
  Compass,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ProductCoachDialog = lazy(
  () => import("@/components/ProductCoachDialog"),
);
const NativeAgentsDialog = lazy(
  () => import("@/components/NativeAgentsDialog"),
);
const MeetingBriefingDialog = lazy(
  () => import("@/components/MeetingBriefingDialog"),
);

type CreateTool = "product" | "agents" | "meeting";

/**
 * Uma única entrada para as ferramentas de criação que preparam o pedido
 * (PM, agentes locais, briefing de reunião) em vez de três botões competindo
 * pelos mesmos pixels acima do input. O menu mantém os mesmos fluxos.
 */
export function CreateWithMenu({
  draftKey,
  idea,
  appId,
  disabled = false,
  onProductBrief,
  onMeetingBrief,
}: {
  draftKey: string;
  idea: string;
  appId?: number;
  disabled?: boolean;
  onProductBrief: (brief: string) => void;
  onMeetingBrief: (prompt: string) => void;
}) {
  const [openTool, setOpenTool] = useState<CreateTool | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          Criar com…
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setOpenTool("product")}>
            <Compass className="size-4" aria-hidden="true" />
            Planejar com PM
          </DropdownMenuItem>
          {appId !== undefined && (
            <DropdownMenuItem onClick={() => setOpenTool("agents")}>
              <TerminalSquare className="size-4" aria-hidden="true" />
              Agentes locais
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setOpenTool("meeting")}>
            <AudioLines className="size-4" aria-hidden="true" />
            Briefing de reunião
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {openTool === "product" && (
        <Suspense
          fallback={<span role="status">Abrindo descoberta guiada...</span>}
        >
          <ProductCoachDialog
            key={draftKey}
            draftKey={`${getActiveWindowSessionId()}:${draftKey}`}
            idea={idea}
            onClose={() => setOpenTool(null)}
            onPrepared={(brief) => {
              onProductBrief(brief);
              setOpenTool(null);
            }}
          />
        </Suspense>
      )}
      {openTool === "agents" && appId !== undefined && (
        <Suspense fallback={<span role="status">Abrindo agentes...</span>}>
          <NativeAgentsDialog appId={appId} onClose={() => setOpenTool(null)} />
        </Suspense>
      )}
      {openTool === "meeting" && (
        <Suspense fallback={<span role="status">Abrindo importador...</span>}>
          <MeetingBriefingDialog
            onClose={() => setOpenTool(null)}
            onPrepared={(prompt) => {
              onMeetingBrief(prompt);
              setOpenTool(null);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
