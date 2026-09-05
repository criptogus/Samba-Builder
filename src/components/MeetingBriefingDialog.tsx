import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  buildMeetingBriefing,
  GRANOLA_CATALOG_ENTRY,
  GRANOLA_URL,
  MAX_BRIEFING_TEXT_CHARS,
} from "@/shared/meeting_briefing";
import { useMeetingImport } from "@/meeting_briefing/controller";

export default function MeetingBriefingDialog({
  onClose,
  onPrepared,
}: {
  onClose: () => void;
  onPrepared: (prompt: string) => void;
}) {
  const [source, setSource] = useState<"transcript" | "granola">("transcript");
  const [reference, setReference] = useState("");
  const [client, setClient] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const { state, pending, cancel, audio, importText } = useMeetingImport();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const servers = useQuery({
    queryKey: queryKeys.mcp.servers,
    queryFn: () => ipc.mcp.listServers(),
    enabled: source === "granola",
  });
  const granola = servers.data?.find(
    (server) => server.transport === "http" && server.url === GRANOLA_URL,
  );
  useEffect(() => {
    if (state.type === "ready") {
      setText(state.text);
      setReference(state.filename);
    }
  }, [state]);
  const configureGranola = async () => {
    setAdding(true);
    setError("");
    try {
      const server =
        granola ??
        (await ipc.mcp.addFromCatalog({ slug: GRANOLA_CATALOG_ENTRY.slug }));
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcp.servers });
      await queryClient.invalidateQueries({ queryKey: queryKeys.mcp.catalog });
      onClose();
      await navigate({
        to: "/plugins/$serverId",
        params: { serverId: server.id },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao configurar Granola.",
      );
    } finally {
      setAdding(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending && !adding) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        showCloseButton={!pending && !adding}
      >
        <DialogHeader>
          <DialogTitle>Briefing de reunião</DialogTitle>
          <DialogDescription>
            Transforme a conversa com o cliente em requisitos, evidências e
            perguntas de esclarecimento.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={pending || adding} className="space-y-4">
          <label className="block text-sm">
            Origem
            <select
              aria-label="Origem do briefing"
              className="mt-1 block w-full rounded border bg-background p-2"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as typeof source);
                setError("");
              }}
            >
              <option value="transcript">Áudio ou transcrição exportada</option>
              <option value="granola">Granola</option>
            </select>
          </label>
          <label className="block text-sm">
            Cliente (opcional)
            <Input
              value={client}
              onChange={(event) => setClient(event.target.value)}
              maxLength={200}
            />
          </label>
          {source === "granola" ? (
            <div className="space-y-2 rounded border p-3">
              <p className="text-sm">
                Conecte sua conta pelo navegador em Plugins. O acesso a notas e
                transcrições depende do plano e das permissões do Granola.
              </p>
              <p className="text-sm">
                {granola?.oauthConnected && granola.enabled
                  ? "Conta Granola vinculada. Informe a reunião abaixo."
                  : "Configure ou reconecte sua conta para consultar reuniões."}
              </p>
              <Button
                variant="outline"
                disabled={servers.isPending || servers.isError || adding}
                onClick={configureGranola}
              >
                {adding ? "Configurando..." : "Configurar Granola"}
              </Button>
              {servers.isError && (
                <p role="alert">
                  Não foi possível consultar os conectores.{" "}
                  <button onClick={() => void servers.refetch()}>
                    Tentar novamente
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Importe arquivos exportados do Zoom, Teams, Meet, Fathom, Otter,
                Plaud ou outro gravador. Para transcrições prontas, use TXT, MD,
                SRT ou VTT.
              </p>
              <label className="block text-sm">
                Importar transcrição
                <Input
                  aria-label="Importar transcrição"
                  type="file"
                  accept=".txt,.md,.srt,.vtt"
                  onChange={(event) => {
                    void importText(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <Button variant="outline" onClick={audio}>
                Selecionar áudio e transcrever
              </Button>
              <p className="text-xs text-muted-foreground">
                O áudio selecionado será enviado à OpenAI usando sua chave em
                Settings → AI Providers → OpenAI, com cobrança pela sua conta.
                Até 24 MB; MP3, M4A, WAV, WEBM, MP4, MPEG ou MPGA. A transcrição
                ficará aqui para revisão.
              </p>
            </div>
          )}
          <label className="block text-sm">
            {source === "granola"
              ? "Título, data ou link da reunião"
              : "Nome da gravação ou reunião"}
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={500}
            />
          </label>
          {source === "transcript" && (
            <label className="block text-sm">
              Transcrição para revisar
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={MAX_BRIEFING_TEXT_CHARS}
                className="min-h-44"
                placeholder="Cole a transcrição ou importe um arquivo. Timestamps e nomes dos participantes serão preservados."
              />
            </label>
          )}
        </fieldset>
        {pending && (
          <div role="status" className="flex items-center gap-3">
            Importando gravação...
            <Button variant="outline" onClick={cancel}>
              Cancelar importação
            </Button>
          </div>
        )}
        {(error || state.type === "error") && (
          <p role="alert" className="text-sm text-destructive">
            {error || (state.type === "error" ? state.message : "")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Ao usar no chat, o conteúdo será enviado ao modelo selecionado quando
          você enviar a mensagem. Revise informações sensíveis antes. O pedido
          prepara um briefing; não autoriza construir ou publicar o projeto.
        </p>
        <Button
          disabled={
            pending ||
            adding ||
            !reference.trim() ||
            (source === "transcript"
              ? !text.trim()
              : !granola?.oauthConnected || !granola.enabled)
          }
          onClick={() => {
            try {
              onPrepared(
                buildMeetingBriefing({ source, client, reference, text }),
              );
              onClose();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Revise os campos.",
              );
            }
          }}
        >
          Usar no chat
        </Button>
      </DialogContent>
    </Dialog>
  );
}
