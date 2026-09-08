import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import type { DeliveryPlan } from "@/delivery/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function FoundationReview({
  appId,
  plan,
  onChange,
}: {
  appId: number;
  plan: DeliveryPlan;
  onChange: (plan: DeliveryPlan) => void;
}) {
  const query = useQuery({
    queryKey: ["delivery-foundation", appId],
    queryFn: () => ipc.delivery.foundation({ appId }),
    refetchOnWindowFocus: false,
  });
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (query.isPending) return <p role="status">Verificando base do projeto…</p>;
  if (query.error)
    return (
      <div role="alert">
        Não foi possível verificar a documentação.{" "}
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
      </div>
    );
  if (!query.data.required && !plan.foundationRequired) return null;
  return (
    <section
      aria-label="Revisão da base"
      className="space-y-3 rounded-lg border p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Base para manutenção</h3>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Atualizar documentos
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Leia os arquivos em project-docs e registre a revisão humana. Descreva
        as decisões confirmadas e justifique itens não aplicáveis. Esta revisão
        não executa testes. Alterações no documento exigem nova revisão.
      </p>
      {!query.data.required && (
        <p role="alert">Restaure a pasta project-docs deste projeto.</p>
      )}
      <Input
        aria-label="Responsável pela revisão documental"
        placeholder="Quem revisou os documentos?"
        value={reviewer}
        maxLength={150}
        onChange={(e) => setReviewer(e.target.value)}
      />
      {query.data.documents.map((document) => {
        const review = plan.foundationReviews?.find(
          (r) => r.file === document.file && r.digest === document.digest,
        );
        return (
          <div key={document.file} className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">
              {document.file} ·{" "}
              {review && !document.issue
                ? `Revisado por ${review.reviewer}`
                : "Revisão pendente"}
            </p>
            {document.issue && (
              <p role="alert" className="text-sm">
                {document.issue}
              </p>
            )}
            {review && (
              <p className="text-sm text-muted-foreground">{review.note}</p>
            )}
            <Textarea
              aria-label={`Revisão de ${document.file}`}
              placeholder="O que foi conferido e decidido?"
              maxLength={3000}
              value={notes[document.file] ?? ""}
              onChange={(e) =>
                setNotes({ ...notes, [document.file]: e.target.value })
              }
            />
            <Button
              variant="outline"
              disabled={
                !!document.issue ||
                !reviewer.trim() ||
                !notes[document.file]?.trim()
              }
              onClick={() =>
                onChange({
                  ...plan,
                  foundationReviews: [
                    ...(plan.foundationReviews ?? []).filter(
                      (r) => r.file !== document.file,
                    ),
                    {
                      file: document.file as NonNullable<
                        DeliveryPlan["foundationReviews"]
                      >[number]["file"],
                      digest: document.digest,
                      reviewer: reviewer.trim(),
                      note: notes[document.file].trim(),
                    },
                  ],
                })
              }
            >
              Registrar revisão de {document.file}
            </Button>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Use Salvar plano para persistir estas revisões.
      </p>
    </section>
  );
}
