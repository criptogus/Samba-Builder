/**
 * RAG fase 3 — feedback de uso.
 *
 * A fase 2 injeta lições, mas ninguém sabia se elas ajudaram. Sem isso, a base
 * só cresce: uma lição errada continua sendo sugerida para sempre. Aqui o turno
 * vira evidência — a lição entrou no prompt e o turno terminou bem ou mal — e a
 * lição que atrapalha sai de cena sozinha, sem ninguém precisar auditar a base.
 *
 * Regras (deliberadamente conservadoras: a lição erra por contexto, não por
 * maldade, e uma falha isolada não prova nada):
 * - acerto reforça pouco, erro pesa mais;
 * - só é contraditada quando falhou mais do que funcionou, e ao menos 2 vezes;
 * - a força nunca vai a zero: uma lição contraditada pode ser reavaliada quando
 *   o contexto mudar (o status volta a `active` se voltar a funcionar).
 */

export type LessonOutcome = "worked" | "failed";

export interface LessonFeedbackState {
  usedCount: number;
  workedCount: number;
  failedCount: number;
}

/** Peso do acerto (reforço pequeno: acertar é o esperado). */
const WORKED_WEIGHT = 0.4;
/** Peso do erro (custa mais que um acerto: sugerir errado desperdiça um turno). */
const FAILED_WEIGHT = 1.0;
/** Teto do reforço por acertos, para não dominar força e recência. */
const MAX_WORKED_CREDIT = 3;

/**
 * Ajuste de ranking do feedback: entra somado ao score do retriever.
 * Determinístico e limitado, para uma lição popular não ofuscar contexto.
 */
export function feedbackAdjustment(state: LessonFeedbackState): number {
  const credit = Math.min(state.workedCount, MAX_WORKED_CREDIT) * WORKED_WEIGHT;
  return credit - state.failedCount * FAILED_WEIGHT;
}

/**
 * Uma lição só é contraditada quando errou **mais do que acertou**, com pelo
 * menos duas falhas registradas — evita descartar uma lição boa por um turno
 * que falhou por outro motivo.
 */
export function shouldContradict(state: LessonFeedbackState): boolean {
  return state.failedCount >= 2 && state.failedCount > state.workedCount;
}

/** Estado depois de um desfecho de turno. */
export function applyOutcome(
  state: LessonFeedbackState,
  outcome: LessonOutcome,
): LessonFeedbackState {
  return {
    usedCount: state.usedCount + 1,
    workedCount: state.workedCount + (outcome === "worked" ? 1 : 0),
    failedCount: state.failedCount + (outcome === "failed" ? 1 : 0),
  };
}

/** Status resultante: `contradito` sai do retrieval; `active` continua. */
export function statusAfterOutcome(
  state: LessonFeedbackState,
): "active" | "contradito" {
  return shouldContradict(state) ? "contradito" : "active";
}

/**
 * Reavaliação: se uma lição contraditada volta a funcionar, ela volta a valer —
 * o contexto pode ter mudado e a regra não pode virar sentença perpétua.
 */
export function statusAfterRecovery(
  state: LessonFeedbackState,
): "active" | "contradito" {
  if (state.workedCount > state.failedCount) return "active";
  return shouldContradict(state) ? "contradito" : "active";
}

/** Frase curta para a UI/log: "ajudou 3 de 4 turnos". */
export function summarizeUsage(state: LessonFeedbackState): string {
  if (state.usedCount === 0) return "ainda não usada";
  const total = state.workedCount + state.failedCount;
  if (total === 0)
    return `injetada ${state.usedCount}x, sem desfecho registrado`;
  return `ajudou ${state.workedCount} de ${total} turno(s) com desfecho`;
}
