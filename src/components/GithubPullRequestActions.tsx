import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, GitPullRequestArrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { showError, showSuccess } from "@/lib/toast";

/**
 * Pull request da branch atual (REQ-31): abrir e mesclar sem sair do app.
 *
 * Fica ao lado do gerenciador de branches porque é o próximo passo natural do
 * trabalho: a branch existe, o commit foi feito, falta subir e pedir revisão.
 * Sem repositório vinculado ou sem conta conectada o componente não aparece —
 * a integração já explica o que falta, e um botão desabilitado seria um beco
 * sem saída.
 */
export function GithubPullRequestActions({
  appId,
  branch,
}: {
  appId: number;
  branch: string | null;
}) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [title, setTitle] = useState("");

  const pullRequestQuery = useQuery({
    queryKey: queryKeys.github.pullRequest(appId),
    queryFn: () => ipc.github.getPullRequest({ appId }),
    enabled: Boolean(branch),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.github.pullRequest(appId),
    });

  const createMutation = useMutation({
    mutationFn: (params: { title: string }) =>
      ipc.github.createPullRequest({ appId, title: params.title }),
    onSuccess: async (pullRequest) => {
      await invalidate();
      setShowCreateDialog(false);
      setTitle("");
      showSuccess(`Pull request #${pullRequest.number} aberto.`);
    },
    onError: (error) => showError(error),
  });

  const mergeMutation = useMutation({
    mutationFn: (params: { number: number }) =>
      ipc.github.mergePullRequest({
        appId,
        number: params.number,
        method: "squash",
      }),
    onSuccess: async () => {
      await invalidate();
      setShowMergeConfirm(false);
      showSuccess("Pull request mesclado.");
    },
    onError: (error) => showError(error),
  });

  // Sem branch conhecida ou sem GitHub pronto, a linha simplesmente não existe.
  if (!branch || pullRequestQuery.isError) {
    return null;
  }

  const pullRequest = pullRequestQuery.data;

  return (
    <div className="flex items-center gap-2" data-testid="pull-request-actions">
      {pullRequest ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void ipc.system.openExternalUrl(pullRequest.url).catch(() => {})
            }
            aria-label="Ver pull request no GitHub"
            data-testid="open-pull-request-link"
          >
            <GitPullRequestArrow className="mr-2 h-4 w-4" />
            {`PR #${pullRequest.number} aberto`}
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowMergeConfirm(true)}
            disabled={mergeMutation.isPending}
            data-testid="merge-pull-request-button"
          >
            {mergeMutation.isPending
              ? "Mesclando..."
              : "Mesclar na branch principal"}
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTitle(branch);
            setShowCreateDialog(true);
          }}
          disabled={pullRequestQuery.isLoading}
          data-testid="create-pull-request-button"
        >
          <GitPullRequestArrow className="mr-2 h-4 w-4" />
          Abrir pull request
        </Button>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir pull request</DialogTitle>
            <DialogDescription>
              {`A revisão vai comparar a branch ${branch} com a branch principal do repositório.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pull-request-title">Título</Label>
            <Input
              id="pull-request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="O que mudou nesta tarefa"
              data-testid="pull-request-title-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate({ title })}
              disabled={createMutation.isPending || !title.trim()}
              data-testid="confirm-create-pull-request"
            >
              {createMutation.isPending ? "Abrindo..." : "Abrir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mesclar na branch principal?</AlertDialogTitle>
            <AlertDialogDescription>
              {pullRequest
                ? `O pull request #${pullRequest.number} (${pullRequest.head} → ${pullRequest.base}) será mesclado no GitHub. Isso altera o repositório remoto.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mergeMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={() =>
                pullRequest &&
                mergeMutation.mutate({ number: pullRequest.number })
              }
              disabled={mergeMutation.isPending}
              data-testid="confirm-merge-pull-request"
            >
              {mergeMutation.isPending ? "Mesclando..." : "Mesclar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
