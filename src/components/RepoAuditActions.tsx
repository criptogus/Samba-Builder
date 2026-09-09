import { repoAuditActions } from "@/lib/repo_audit_actions";
import { useStreamChat } from "@/hooks/useStreamChat";
import { Button } from "@/components/ui/button";

/**
 * Ações iniciais para repositórios recém-importados: chips clicáveis que
 * disparam o prompt da auditoria com o(s) skill(s) nativo(s) correto(s) no
 * chat do projeto.
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
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {repoAuditActions.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto py-2"
          title={action.description}
          onClick={async () => {
            const ok = await streamMessage({
              prompt: action.prompt,
              chatId,
              appId,
            });
            if (ok) onTriggered?.();
          }}
        >
          <span className="mr-1.5">{action.emoji}</span>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
