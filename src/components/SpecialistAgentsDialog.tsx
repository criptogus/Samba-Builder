import { useState } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import {
  composeSpecialistTaskPrompt,
  specialistAgents,
  type SpecialistAgent,
} from "@/lib/specialist_agents";
import { SpecialistAvatar } from "@/components/SpecialistAvatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Users } from "lucide-react";
import { nativeSkills } from "@/shared/native_skills";

/** Nome amigável do skill (título do catálogo) em vez do slug técnico. */
function skillLabel(slug: string): string {
  return nativeSkills.find((s) => s.slug === slug)?.title ?? slug;
}

/**
 * Agentes especialistas: skills do Samba Builder transformados em
 * especialistas com avatar. O dev escolhe o agente, depois uma tarefa
 * pré-definida (ou descreve a própria) — as opções explicam o que cada
 * especialista faz, para o dev (inclusive junior) nunca ficar sem saber o
 * que pedir. O prompt enviado ativa os skills corretos via /samba-*.
 */
export function SpecialistAgentsDialog({
  isOpen,
  onClose,
  chatId,
  appId,
}: {
  isOpen: boolean;
  onClose: () => void;
  chatId: number;
  appId: number;
}) {
  const [agent, setAgent] = useState<SpecialistAgent | null>(null);
  const [custom, setCustom] = useState("");
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("samba.specialists.recent");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  });

  const rememberAgent = (id: string) => {
    setRecentIds((current) => {
      const next = [id, ...current.filter((x) => x !== id)].slice(0, 3);
      try {
        localStorage.setItem("samba.specialists.recent", JSON.stringify(next));
      } catch {
        // persistência é conveniência; falha não bloqueia a escolha
      }
      return next;
    });
  };
  const { streamMessage } = useStreamChat();
  const [sending, setSending] = useState(false);

  const close = () => {
    setAgent(null);
    setCustom("");
    onClose();
  };

  const sendPrompt = async (prompt: string) => {
    setSending(true);
    try {
      const ok = await streamMessage({ prompt, chatId, appId });
      if (ok) close();
    } finally {
      setSending(false);
    }
  };

  const sendCustom = async () => {
    const text = custom.trim();
    if (!text || !agent) return;
    await sendPrompt(composeSpecialistTaskPrompt(agent, text));
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto flex flex-col p-0">
        <DialogHeader className="sticky top-0 bg-background border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            {agent ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAgent(null)}
                  aria-label="Voltar para a lista de especialistas"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <SpecialistAvatar agent={agent} size="sm" />
                <span>
                  {agent.persona}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {agent.name}
                  </span>
                </span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4" /> Especialistas
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {agent
              ? agent.description
              : "Escolha um especialista para criar uma tarefa no projeto. Cada um carrega os skills certos — as opções mostram o que ele faz."}
          </DialogDescription>
        </DialogHeader>

        {!agent ? (
          <div className="space-y-3 p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar especialista (ex.: segurança, mobile, dados)"
              aria-label="Buscar especialista"
              className="h-9 text-sm"
            />
            {(() => {
              const q = query.trim().toLowerCase();
              const matches = specialistAgents.filter(
                (a) =>
                  !q ||
                  `${a.persona} ${a.name} ${a.tagline} ${a.description} ${a.skills.join(" ")}`
                    .toLowerCase()
                    .includes(q),
              );
              const ordered = [
                ...matches.filter((a) => recentIds.includes(a.id)),
                ...matches.filter((a) => !recentIds.includes(a.id)),
              ];
              if (!ordered.length)
                return (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum especialista para “{query}”.
                  </p>
                );
              return (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ordered.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        rememberAgent(a.id);
                        setAgent(a);
                      }}
                      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <SpecialistAvatar agent={a} size="md" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {a.persona}
                          <span className="font-normal text-muted-foreground">
                            · {a.name}
                          </span>
                          {recentIds.includes(a.id) && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-medium"
                            >
                              Recente
                            </Badge>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.tagline}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {agent.skills.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Especialidades: {agent.skills.map(skillLabel).join(" · ")}
              </p>
            )}
            <div className="space-y-2">
              {agent.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  disabled={sending}
                  onClick={() => void sendPrompt(task.prompt)}
                  className="block w-full rounded-md border p-3 text-left hover:bg-accent/50 transition-colors disabled:opacity-50"
                >
                  <span className="block text-sm font-medium">
                    {task.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {task.description}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                Ou descreva sua própria tarefa para {agent.persona}
              </p>
              <Textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Ex.: revise o fluxo de login para permitir recuperação de senha por e-mail"
                className="min-h-[70px] text-sm"
              />
              <Button
                className="w-full"
                disabled={sending || !custom.trim()}
                onClick={() => void sendCustom()}
              >
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Enviando…" : "Criar tarefa para o especialista"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
