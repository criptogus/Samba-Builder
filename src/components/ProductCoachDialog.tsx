import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CAPABILITIES,
  UNKNOWN,
  emptyDraft,
  loadProductDraft,
  saveProductDraft,
  productQuestions,
  pendingQuestions,
  isAnswered,
  buildProductBrief,
  productReviewPrompt,
  type ProductDraft,
} from "@/product_coach/model";
export default function ProductCoachDialog({
  draftKey,
  idea,
  onClose,
  onPrepared,
}: {
  draftKey: string;
  idea: string;
  onClose: () => void;
  onPrepared: (brief: string) => void;
}) {
  const [initial] = useState(() => {
    try {
      return {
        draft: loadProductDraft(draftKey, idea, localStorage),
        error: "",
      };
    } catch {
      return {
        draft: emptyDraft(idea),
        error:
          "Não foi possível recuperar o rascunho anterior. Você pode preencher um novo briefing.",
      };
    }
  });
  const [draft, setDraft] = useState<ProductDraft>(initial.draft);
  const [storageError, setStorageError] = useState(initial.error);
  const [step, setStep] = useState("problem");
  const [review, setReview] = useState(false);
  const questions = productQuestions(draft.capabilities);
  const index = Math.max(
    0,
    questions.findIndex((q) => q.id === step),
  );
  const question = questions[index];
  const answered = questions.filter((q) => isAnswered(draft, q.id)).length;
  const pending = pendingQuestions(draft);
  useEffect(() => {
    try {
      saveProductDraft(draftKey, draft, localStorage);
    } catch {
      setStorageError(
        "O salvamento local está indisponível. Leve o briefing ao chat antes de fechar o aplicativo para não perder as respostas.",
      );
    }
  }, [draftKey, draft]);
  const next = () => {
    if (index === questions.length - 1) setReview(true);
    else setStep(questions[index + 1].id);
  };
  const skip = () => {
    setDraft((current) =>
      question.id === "capabilities"
        ? { ...current, capabilities: [], capabilitiesAnswered: true }
        : {
            ...current,
            answers: { ...current.answers, [question.id]: UNKNOWN },
          },
    );
    // Skipping capabilities removes its conditional follow-ups.
    if (question.id === "capabilities") setStep("experience");
    else next();
  };
  const send = () => {
    onPrepared(productReviewPrompt(draft));
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planejar com PM</DialogTitle>
          <DialogDescription>
            Uma boa ideia começa com boas perguntas. Vamos definir um produto
            útil, viável e fácil de usar, uma decisão por vez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Roteiro guiado, sem consumir IA. As respostas ficam neste
            computador; a IA aprofunda o briefing quando você enviar a mensagem.
          </p>
          <Button
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => {
              setDraft(emptyDraft());
              setStep("problem");
              setReview(false);
            }}
          >
            Limpar respostas e começar de novo
          </Button>
          {storageError && (
            <p role="alert" className="text-sm text-destructive">
              {storageError}
            </p>
          )}
          <div className="space-y-2">
            <p role="status" className="text-sm">
              {review
                ? "Revisão do briefing"
                : `Pergunta ${index + 1} de ${questions.length}`}{" "}
              · {answered} etapas respondidas
            </p>
            <progress
              aria-label="Progresso da descoberta"
              className="h-2 w-full accent-primary"
              max={questions.length}
              value={answered}
            />
          </div>
          {review ? (
            <>
              <h3 className="text-lg font-semibold">
                O que sabemos — e o que falta decidir
              </h3>
              <p className="text-sm text-muted-foreground">
                {pending.length
                  ? `${pending.length} decisões ainda precisam de ajuda. A IA deve priorizá-las e propor caminhos, sem inventar respostas.`
                  : "As respostas estão preenchidas. Agora vale verificar as hipóteses, os riscos e os critérios de aceite."}
              </p>
              <div
                className="max-h-72 space-y-4 overflow-y-auto rounded-lg border p-4"
                aria-label="Respostas para revisar"
              >
                {questions.map((q) => (
                  <section key={q.id}>
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-medium">{q.title}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Editar: ${q.title}`}
                        onClick={() => {
                          setStep(q.id);
                          setReview(false);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {q.id === "capabilities"
                        ? CAPABILITIES.filter((c) =>
                            draft.capabilities.includes(c.id),
                          )
                            .map((c) => c.label)
                            .join(", ") || UNKNOWN
                        : draft.answers[q.id] || UNKNOWN}
                    </p>
                  </section>
                ))}
              </div>
              <details>
                <summary className="cursor-pointer text-sm">
                  Ver briefing completo
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
                  {buildProductBrief(draft)}
                </pre>
              </details>
              <p className="text-sm">
                Próximo passo: revisar prioridades com a IA e criar critérios de
                aceite — situações concretas que comprovam que o produto
                funciona. Construir só depois de você pedir.
              </p>
              <Button onClick={send}>Levar briefing ao chat</Button>
              <p className="text-xs text-muted-foreground">
                O texto será acrescentado ao campo de mensagem. Você revisa
                antes de enviar.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{question.title}</h3>
                <p className="text-sm text-muted-foreground">{question.why}</p>
              </div>
              {question.id === "capabilities" ? (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Interações necessárias</legend>
                  {CAPABILITIES.map((capability) => (
                    <label
                      key={capability.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 accent-primary"
                        checked={draft.capabilities.includes(capability.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setDraft((current) => ({
                            ...current,
                            capabilitiesAnswered:
                              checked || current.capabilities.length > 1,
                            capabilities: checked
                              ? [...current.capabilities, capability.id]
                              : current.capabilities.filter(
                                  (id) => id !== capability.id,
                                ),
                          }));
                        }}
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {capability.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {capability.help}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <Textarea
                  aria-label={question.title}
                  value={draft.answers[question.id] ?? ""}
                  rows={4}
                  maxLength={4000}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({
                      ...current,
                      answers: { ...current.answers, [question.id]: value },
                    }));
                  }}
                  placeholder="Responda com suas palavras. Não precisa saber termos técnicos."
                />
              )}
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="font-medium">Exemplo para se orientar</span>
                <p className="mt-1 text-muted-foreground">{question.example}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => setStep(questions[index - 1].id)}
                >
                  Voltar
                </Button>
                <Button
                  disabled={!isAnswered(draft, question.id)}
                  onClick={next}
                >
                  {index === questions.length - 1
                    ? "Revisar briefing"
                    : "Próxima pergunta"}
                </Button>
                <Button variant="ghost" onClick={skip}>
                  Ainda não sei
                </Button>
              </div>
              <Button
                variant="link"
                className="px-0"
                onClick={() => setReview(true)}
              >
                Revisar o que já respondi
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
