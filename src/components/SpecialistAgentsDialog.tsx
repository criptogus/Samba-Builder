import { useState } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import {
  specialistAgents,
  type SpecialistAgent,
} from "@/lib/specialist_agents";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Send,
  Users,
  Building2,
  ClipboardList,
  Cloud,
  FlaskConical,
  Gauge,
  Network,
  Palette,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { nativeSkills } from "@/shared/native_skills";

const agentIcons: Record<string, LucideIcon> = {
  Network,
  ShieldCheck,
  Palette,
  FlaskConical,
  Gauge,
  Building2,
  ClipboardList,
  ScanSearch,
  Smartphone,
  Cloud,
};

/** Nome amigável do skill (título do catálogo) em vez do slug técnico. */
function skillLabel(slug: string): string {
  return nativeSkills.find((s) => s.slug === slug)?.title ?? slug;
}

/** Ícone do agente, consistente com a iconografia do app (lucide). */
function AgentIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = agentIcons[icon] ?? Users;
  return <Icon className={className} aria-hidden="true" />;
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
    const prompt =
      agent.skills.length > 0
        ? `${agent.skills.map((s) => `/${s}`).join(" ")} ${text}`
        : `Atue como especialista em ${agent.name} (${agent.tagline}). ${text}`;
    await sendPrompt(prompt);
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
                <AgentIcon icon={agent.icon} className="h-4 w-4" /> {agent.name}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
            {specialistAgents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAgent(a)}
                className="flex items-start gap-3 rounded-md border p-3 text-left hover:bg-accent/50 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <AgentIcon
                    icon={a.icon}
                    className="h-4.5 w-4.5 text-muted-foreground"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.tagline}
                  </span>
                </span>
              </button>
            ))}
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
                Ou descreva sua própria tarefa para o {agent.name}
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
