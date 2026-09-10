import { useEffect, useState } from "react";
import { nativeSkills } from "@/shared/native_skills";
import { loadNativeSkill } from "@/shared/load_native_skill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ipc } from "@/ipc/types";
import { useNavigate } from "@tanstack/react-router";
import { useSelectChat } from "@/hooks/useSelectChat";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { Copy, MessageSquarePlus, Sparkles } from "lucide-react";

interface SkillRecipe {
  title: string;
  description: string;
  slugs: string[];
}

const RECOMMENDED_RECIPES: SkillRecipe[] = [
  {
    title: "Kickoff de Produto & Design",
    description:
      "Do problema real à direção de arte e especificação com critérios verificáveis.",
    slugs: ["samba-pm", "samba-art-direction", "samba-spec"],
  },
  {
    title: "Engenharia & Qualidade por Evidência",
    description:
      "Plano técnico com testes de regressão e pirâmide de qualidade comprovada.",
    slugs: ["samba-plan", "samba-tdd", "samba-quality-engineering"],
  },
  {
    title: "Revisão, Segurança & Release",
    description:
      "Auditoria estrita de segurança, governança de dados e checagem de handoff.",
    slugs: ["samba-security", "samba-governance", "samba-review"],
  },
  {
    title: "Performance & Banco de Dados",
    description:
      "Modelagem relacional, RLS e otimização de consultas e tempos de resposta.",
    slugs: ["samba-database", "samba-performance", "samba-observability"],
  },
];

export function NativeSkillsLibrary() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { selectChat } = useSelectChat();
  const navigate = useNavigate();

  const handleUseInChat = async (slugOrSlugs: string | string[]) => {
    const slugs = Array.isArray(slugOrSlugs) ? slugOrSlugs : [slugOrSlugs];
    const commandText = `${slugs.map((s) => `/${s}`).join(" ")} `;
    if (selectedAppId) {
      try {
        const chatId = await ipc.chat.createChat({ appId: selectedAppId });
        selectChat({
          chatId,
          appId: selectedAppId,
          prefillInput: commandText,
        });
        return;
      } catch {}
    }
    // If no app is active or creating chat fails, copy and route to home/apps
    try {
      await navigator.clipboard.writeText(commandText);
      setStatus(
        `Comando ${commandText.trim()} copiado! Selecione um app para iniciar.`,
      );
    } catch {
      setStatus(`Use ${commandText.trim()} no início da sua mensagem no chat.`);
    }
    navigate({ to: "/" });
  };
  useEffect(() => {
    let active = true;
    setBody("");
    setStatus("");
    if (selected) {
      void loadNativeSkill(selected).then(
        (text) => {
          if (active) setBody(text);
        },
        () => {
          if (active)
            setBody("Não foi possível carregar esta skill. Tente novamente.");
        },
      );
    }
    return () => {
      active = false;
    };
  }, [selected]);
  const skills = nativeSkills.filter((skill) =>
    `${skill.title} ${skill.slug} ${skill.category} ${skill.description}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <section aria-label="Skills nativas" className="mb-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Skills nativas do Samba</h2>
        <p className="text-sm text-muted-foreground">
          Comece a mensagem com um comando, como /samba-design. Combine até 3.
          As instruções são carregadas ao usar; os modos e permissões continuam
          valendo.
        </p>
      </div>

      {!search && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" />
            <span>Receitas Recomendadas (Combinações em 1 Clique)</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {RECOMMENDED_RECIPES.map((recipe) => (
              <div
                key={recipe.title}
                className="flex flex-col justify-between rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold">{recipe.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {recipe.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {recipe.slugs.map((slug) => (
                      <code
                        key={slug}
                        className="rounded bg-background/80 px-1 py-0.5 text-[10px] text-primary"
                      >
                        /{slug}
                      </code>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full justify-center gap-1.5 text-xs font-medium"
                  onClick={() => void handleUseInChat(recipe.slugs)}
                >
                  <MessageSquarePlus className="size-3.5" />
                  Usar Receita
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Input
        aria-label="Buscar skills nativas"
        placeholder="Buscar por tarefa ou comando"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill) => (
          <article key={skill.slug} className="rounded-lg border p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              {skill.category} · Nativa
            </p>
            <h3 className="font-semibold">{skill.title}</h3>
            <p className="text-sm">{skill.description}</p>
            <code className="block text-sm">/{skill.slug}</code>
            {skill.prerequisite && (
              <p className="text-xs text-muted-foreground">
                Pré-requisito: {skill.prerequisite}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => void handleUseInChat(skill.slug)}
              >
                <MessageSquarePlus className="size-3.5" />
                Usar no Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-expanded={selected === skill.slug}
                onClick={() =>
                  setSelected(selected === skill.slug ? null : skill.slug)
                }
              >
                {selected === skill.slug
                  ? "Fechar instruções"
                  : `Ver ${skill.title}`}
              </Button>
            </div>
            {selected === skill.slug && (
              <div className="space-y-3">
                <pre
                  className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm font-sans"
                  aria-label="Instruções da skill"
                >
                  {body || "Carregando..."}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`/${skill.slug} `);
                      setStatus("Comando copiado. Cole no início da mensagem.");
                    } catch {
                      setStatus(`Copie manualmente: /${skill.slug}`);
                    }
                  }}
                >
                  <Copy className="size-3.5" />
                  Copiar comando
                </Button>
                <p role="status" className="text-sm">
                  {status}
                </p>
                <p className="text-xs text-muted-foreground">
                  Referências consultadas; instruções adaptadas para o Samba:
                </p>
                {skill.sources.map((repo) => (
                  <button
                    key={repo}
                    className="block text-xs underline text-left break-all"
                    onClick={() =>
                      void ipc.system.openExternalUrl(
                        `https://github.com/${repo}`,
                      )
                    }
                  >
                    {repo}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      {skills.length === 0 && <p>Nenhuma skill encontrada.</p>}
    </section>
  );
}
