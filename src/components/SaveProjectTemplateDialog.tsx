import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import {
  TEAM_TEMPLATE_REPO,
  TemplateDraftInputSchema,
  type TemplateDraft,
} from "@/shared/project_templates";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

export default function SaveProjectTemplateDialog({
  appId,
  name,
  onClose,
}: {
  appId: number;
  name: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(name);
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<TemplateDraft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  const busy = useRef(false);
  const draftId = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (draftId.current)
        void ipc.template
          .discardTemplateDraft({ id: draftId.current })
          .catch(() => {});
    };
  }, []);
  const prepare = useMutation({
    mutationFn: async () => {
      if (busy.current) return;
      busy.current = true;
      setError("");
      try {
        const input = TemplateDraftInputSchema.parse({
          appId,
          title,
          description,
        });
        const result = await ipc.template.prepareProjectTemplate(input);
        if (!active.current) {
          await ipc.template.discardTemplateDraft({ id: result.id });
          return;
        }
        draftId.current = result.id;
        setDraft(result);
      } finally {
        busy.current = false;
      }
    },
    onError: (error: Error) => setError(error.message),
  });
  const publish = useMutation({
    mutationFn: async () => {
      if (busy.current || !draft || !confirmed) return;
      busy.current = true;
      setError("");
      try {
        await ipc.template.publishProjectTemplate({ id: draft.id });
        draftId.current = null;
        await queryClient.invalidateQueries({
          queryKey: queryKeys.templates.all,
        });
        if (active.current) {
          onClose();
          navigate({ to: "/templates" });
        }
      } finally {
        busy.current = false;
      }
    },
    onError: (error: Error) => setError(error.message),
  });
  const pending = prepare.isPending || publish.isPending;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy.current) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Salvar como template</DialogTitle>
          <DialogDescription>
            Publique uma base reutilizável para a equipe em {TEAM_TEMPLATE_REPO}
            , na pasta samba-templates.
          </DialogDescription>
        </DialogHeader>
        {!draft ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="template-title">Nome do template</Label>
              <Input
                id="template-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-description">
                Descrição e uso recomendado
              </Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                disabled={pending}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Serão copiados os arquivos atuais salvos no disco. Histórico de
              chat e Git, node_modules, builds, arquivos .env e credenciais
              conhecidas ficam de fora. Conexões de banco e deploy precisam ser
              configuradas no novo projeto.
            </p>
          </>
        ) : (
          <>
            <h3 className="font-semibold">{draft.title}</h3>
            <p className="text-sm">
              {draft.files.length} arquivos ·{" "}
              {(
                draft.files.reduce((sum, file) => sum + file.size, 0) /
                1_000_000
              ).toFixed(2)}{" "}
              MB · {draft.excluded} itens/pastas excluídos
            </p>
            <ul
              aria-label="Arquivos do template"
              className="max-h-48 overflow-y-auto rounded border p-3 text-xs font-mono"
            >
              {draft.files.map((file) => (
                <li key={file.path}>{file.path}</li>
              ))}
            </ul>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={pending}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Revisei os arquivos e posso compartilhá-los com quem tem acesso ao
              repositório. Removi dados de clientes e segredos escritos no
              código.
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          {draft ? (
            <Button
              disabled={pending || !confirmed}
              onClick={() => publish.mutate()}
            >
              {publish.isPending ? "Publicando..." : "Publicar template"}
            </Button>
          ) : (
            <Button
              disabled={pending || !title.trim() || !description.trim()}
              onClick={() => prepare.mutate()}
            >
              {prepare.isPending ? "Preparando cópia..." : "Revisar arquivos"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
