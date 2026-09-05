import { useEffect, useState } from "react";
import { nativeSkills } from "@/shared/native_skills";
import { loadNativeSkill } from "@/shared/load_native_skill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ipc } from "@/ipc/types";

export function NativeSkillsLibrary() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
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
    <section aria-label="Skills nativas" className="mb-8 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Skills nativas do Samba</h2>
        <p className="text-sm text-muted-foreground">
          Comece a mensagem com um comando, como /samba-design. Combine até 3.
          As instruções são carregadas ao usar; os modos e permissões continuam
          valendo.
        </p>
      </div>
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
            <Button
              variant="outline"
              aria-expanded={selected === skill.slug}
              onClick={() =>
                setSelected(selected === skill.slug ? null : skill.slug)
              }
            >
              {selected === skill.slug
                ? "Fechar instruções"
                : `Ver ${skill.title}`}
            </Button>
            {selected === skill.slug && (
              <div className="space-y-3">
                <pre
                  className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm font-sans"
                  aria-label="Instruções da skill"
                >
                  {body || "Carregando..."}
                </pre>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`/${skill.slug} `);
                      setStatus("Comando copiado. Cole no início da mensagem.");
                    } catch {
                      setStatus(`Copie manualmente: /${skill.slug}`);
                    }
                  }}
                >
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
