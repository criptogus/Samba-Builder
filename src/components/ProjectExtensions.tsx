import { useAtomValue } from "jotai";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { ExtensionEntry, ExtensionKind } from "@/shared/extensions";

const KIND_LABELS: Record<ExtensionKind, string> = {
  skill: "Skills",
  command: "Comandos",
  agent: "Agentes",
};

const KIND_ORDER: ExtensionKind[] = ["skill", "command", "agent"];

const SCOPE_LABELS = {
  project: "Projeto",
  user: "Usuário",
} as const;

function ExtensionCard({ entry }: { entry: ExtensionEntry }) {
  return (
    <article className="space-y-2 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">
        {SCOPE_LABELS[entry.scope]} · {entry.relativePath}
      </p>
      <h4 className="font-mono text-sm font-semibold">{entry.slug}</h4>
      <p className="text-sm">
        {entry.description || "Sem descrição — informe o que ela faz."}
      </p>
      {(entry.modes.length > 0 || entry.agent) && (
        <p className="text-xs text-muted-foreground">
          {entry.modes.length > 0 && `Modos: ${entry.modes.join(", ")}`}
          {entry.modes.length > 0 && entry.agent && " · "}
          {entry.agent && `Usa o agente: ${entry.agent}`}
        </p>
      )}
    </article>
  );
}

/**
 * Lista as extensões declarativas que o Samba descobre no projeto e no
 * computador do usuário (`plans/kilocode-parity-plan.md`, REQ-01).
 */
export function ProjectExtensions() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const appId = selectedAppId ?? undefined;
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: queryKeys.extensions.list({ appId }),
    queryFn: () => ipc.extensions.list({ appId }),
    meta: { showErrorToast: true },
  });

  const entries = data?.entries ?? [];
  const warnings = data?.warnings ?? [];

  return (
    <section aria-label="Extensões declarativas" className="mb-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Extensões do projeto</h2>
          <p className="text-sm text-muted-foreground">
            Arquivos que o Samba descobre sozinho. No projeto, em{" "}
            <code>.samba/skills</code>, <code>.samba/commands</code> e{" "}
            <code>.samba/agents</code>; no seu computador, na pasta{" "}
            <code>extensions</code> da área de dados do Samba.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Procurando extensões...</p>
      )}

      {isError && (
        <p className="text-sm">
          Não foi possível ler as extensões agora. Confira as pastas e clique em
          Atualizar.
        </p>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma extensão encontrada. Para criar uma skill, salve{" "}
          <code>.samba/skills/revisar-login/SKILL.md</code> começando com{" "}
          <code>---</code> e uma linha <code>description:</code>, depois clique
          em Atualizar.
        </p>
      )}

      {KIND_ORDER.map((kind) => {
        const group = entries.filter((entry) => entry.kind === kind);
        if (group.length === 0) return null;
        return (
          <div key={kind} className="space-y-3">
            <h3 className="text-sm font-medium">{KIND_LABELS[kind]}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.map((entry) => (
                <ExtensionCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        );
      })}

      {warnings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Avisos</h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.relativePath}-${index}`}>
                {warning.relativePath}: {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
