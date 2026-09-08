import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import {
  TEAM_TEMPLATE_REPO,
  TEAM_TEMPLATE_URL,
} from "@/shared/project_templates";
import { Button } from "./ui/button";
export function TeamTemplatesRepository() {
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: () => ipc.template.syncTeamTemplates(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all }),
  });
  return (
    <div className="my-6 rounded-lg border p-4 space-y-2">
      <h2 className="text-lg font-semibold">
        Repositório de templates da equipe
      </h2>
      <p className="text-sm text-muted-foreground">
        {TEAM_TEMPLATE_REPO} · Salve um projeto pelo menu de opções → Salvar
        como template.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={sync.isPending}
          onClick={() => sync.mutate()}
        >
          {sync.isPending ? "Atualizando..." : "Atualizar templates da equipe"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => ipc.system.openExternalUrl(TEAM_TEMPLATE_URL)}
        >
          Abrir repositório
        </Button>
      </div>
      {sync.data && (
        <p role="status" className="text-sm">
          {sync.data.count} templates sincronizados · repositório{" "}
          {sync.data.private ? "privado" : "público"}.
        </p>
      )}
      {sync.error && (
        <p role="alert" className="text-sm text-destructive">
          {sync.error.message} O catálogo anterior foi preservado. Use uma conta
          GitHub com acesso ao repositório.
        </p>
      )}
    </div>
  );
}
