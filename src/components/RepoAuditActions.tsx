import { useState } from "react";
import { repoAuditActions } from "@/lib/repo_audit_actions";
import { useStreamChat } from "@/hooks/useStreamChat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Gauge,
  Microscope,
  Network,
  Palette,
  Rocket,
  ScanSearch,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const auditIcons: Record<string, LucideIcon> = {
  ScanSearch,
  Microscope,
  Network,
  Palette,
  ShieldCheck,
  FlaskConical,
  Gauge,
  Rocket,
};

const VISIBLE_BY_DEFAULT = 4;

/**
 * Ações iniciais para repositórios recém-importados: auditorias guiadas pelos
 * skills do Samba Builder. Uma recomendada em destaque (para quem não sabe por
 * onde começar), descrição visível em cada uma (não só tooltip) e as demais
 * reveladas sob demanda — uma escolha clara em vez de oito iguais.
 */
export function RepoAuditActions({
  chatId,
  appId,
  onTriggered,
}: {
  chatId: number;
  appId: number;
  onTriggered?: () => void;
}) {
  const { streamMessage } = useStreamChat();
  const [showAll, setShowAll] = useState(false);

  const ordered = [
    ...repoAuditActions.filter((a) => a.recommended),
    ...repoAuditActions.filter((a) => !a.recommended),
  ];
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_BY_DEFAULT);
  const hiddenCount = ordered.length - visible.length;

  return (
    <div className="flex w-full flex-col gap-2">
      {visible.map((action) => {
        const Icon = auditIcons[action.icon] ?? ScanSearch;
        return (
          <button
            key={action.id}
            type="button"
            title={action.description}
            onClick={async () => {
              const ok = await streamMessage({
                prompt: action.prompt,
                chatId,
                appId,
              });
              if (ok) onTriggered?.();
            }}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              action.recommended
                ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                : "border-border hover:bg-accent/50",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                action.recommended ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                {action.label}
                {action.recommended && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium"
                  >
                    Recomendado
                  </Badge>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {action.description}
              </span>
            </span>
          </button>
        );
      })}
      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-xs text-muted-foreground"
          onClick={() => setShowAll(true)}
        >
          Ver todas as auditorias ({ordered.length})
        </Button>
      )}
    </div>
  );
}
