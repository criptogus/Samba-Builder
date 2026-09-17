/**
 * RAG de aprendizado — fase 2: recuperar e injetar.
 *
 * A fase 1 já grava unidades de conhecimento (aprovação → padrão validado,
 * gate falho → erro a evitar). Sem retrieval elas não servem para nada: o
 * próximo projeto precisa *nascer sabendo*. Aqui selecionamos as lições que
 * casam com o contexto do trabalho atual e montamos um bloco enxuto para o
 * prompt — sempre com a fonte, para o agente poder conferir em vez de obedecer
 * cegamente.
 *
 * Regras de produto:
 * - orçamento pequeno (≤5 lições): lição demais vira ruído e come contexto;
 * - o que evita retrabalho vem antes do que inspira;
 * - lição vencida ou contradita não entra;
 * - nada é inventado: só o que foi registrado com fonte verificável.
 */

import type { KnowledgeKind } from "./knowledge";
import { feedbackAdjustment } from "./lesson_feedback";

export interface LessonUnit {
  id: string;
  kind: KnowledgeKind;
  title: string;
  body: string;
  /** Contexto de aplicação já parseado (perfil, fase, área, stack…). */
  context: Record<string, unknown>;
  /** Nº de ocorrências/fontes independentes. */
  force: number;
  createdAt: number;
  status: string;
  expiresAt?: number | null;
  /** Feedback de uso (fase 3). Opcional: lições antigas não têm esses números. */
  workedCount?: number;
  failedCount?: number;
}

export interface LessonQuery {
  profile?: string | null;
  phase?: string | null;
  area?: string | null;
  /** Palavras do trabalho atual (stack, tema, arquivo) para casar com o contexto. */
  signals?: string[];
  /** Relógio injetável (testes). */
  now?: number;
  limit?: number;
}

export interface ScoredLesson extends LessonUnit {
  score: number;
  reasons: string[];
}

/** Orçamento do prompt: mais que isso vira ruído. */
export const MAX_PROJECT_LESSONS = 5;

const KIND_WEIGHT: Record<KnowledgeKind, number> = {
  erro_evitar: 3,
  padrao_validado: 2.5,
  skill_delta: 1.5,
  episodio: 0.5,
};

const KIND_LABEL: Record<KnowledgeKind, string> = {
  erro_evitar: "evitar",
  padrao_validado: "validado",
  skill_delta: "prática",
  episodio: "contexto",
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function flatValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatValues);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(flatValues);
  }
  return [];
}

function contextMatches(
  unit: LessonUnit,
  keys: string[],
  wanted: string | null | undefined,
): boolean {
  if (!wanted) return false;
  const candidate = wanted.toLowerCase();
  return keys.some((key) =>
    flatValues(unit.context[key]).some(
      (value) => value.toLowerCase() === candidate,
    ),
  );
}

function signalHits(unit: LessonUnit, signals: string[] | undefined): number {
  if (!signals?.length) return 0;
  const haystack = [unit.title, unit.body, ...flatValues(unit.context)]
    .join(" ")
    .toLowerCase();
  let hits = 0;
  for (const signal of signals) {
    const needle = signal.trim().toLowerCase();
    if (needle.length >= 3 && haystack.includes(needle)) hits += 1;
  }
  return Math.min(hits, 2);
}

/**
 * Seleciona e ordena as lições aplicáveis. Determinístico: mesmo conjunto e
 * mesma consulta produzem a mesma ordem (o prompt não pode oscilar entre turnos).
 */
export function selectProjectLessons(
  units: LessonUnit[],
  query: LessonQuery = {},
): ScoredLesson[] {
  const now = query.now ?? Date.now();
  const limit = Math.max(1, Math.min(query.limit ?? MAX_PROJECT_LESSONS, 8));

  const scored: ScoredLesson[] = [];
  for (const unit of units) {
    if (unit.status !== "active") continue;
    if (unit.expiresAt != null && unit.expiresAt <= now) continue;

    const reasons: string[] = [];
    let score = KIND_WEIGHT[unit.kind] ?? 0.5;

    if (contextMatches(unit, ["profile", "riskProfile"], query.profile)) {
      score += 3;
      reasons.push("mesmo perfil");
    }
    if (contextMatches(unit, ["phase", "stage"], query.phase)) {
      score += 2;
      reasons.push("mesma fase");
    }
    if (contextMatches(unit, ["area", "gate", "topic"], query.area)) {
      score += 2;
      reasons.push("mesma área");
    }

    const hits = signalHits(unit, query.signals);
    if (hits > 0) {
      score += hits * 0.5;
      reasons.push("contexto parecido");
    }

    const cappedForce = Math.min(Math.max(unit.force, 1), 5);
    score += (cappedForce - 1) * 0.4;
    if (cappedForce > 1) reasons.push(`${cappedForce} fontes`);

    // Fase 3: o que já funcionou em turnos reais vale mais; o que já falhou,
    // menos — e o que falhou mais do que ajudou nem chega aqui (contraditado).
    const feedback = feedbackAdjustment({
      usedCount: 0,
      workedCount: unit.workedCount ?? 0,
      failedCount: unit.failedCount ?? 0,
    });
    if ((unit.workedCount ?? 0) > 0) reasons.push("já ajudou");
    if ((unit.failedCount ?? 0) > 0) reasons.push("já falhou");
    score += feedback;

    const age = Math.max(0, now - unit.createdAt);
    score += Math.max(0, 1 - age / NINETY_DAYS_MS);
    if (age <= NINETY_DAYS_MS) reasons.push("recente");

    scored.push({ ...unit, score, reasons });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return scored.slice(0, limit);
}

const MAX_BODY_CHARS = 260;

function shortBody(body: string): string {
  const single = body.replace(/\s+/g, " ").trim();
  return single.length > MAX_BODY_CHARS
    ? `${single.slice(0, MAX_BODY_CHARS - 1)}…`
    : single;
}

/**
 * Bloco do prompt. Devolve `null` quando não há lição aplicável — melhor não
 * injetar nada do que injetar um bloco vazio dizendo "aprenda com o passado".
 */
export function renderProjectLessonsBlock(
  lessons: ScoredLesson[],
): string | null {
  if (!lessons.length) return null;
  const lines = lessons.map(
    (lesson) =>
      `- [${KIND_LABEL[lesson.kind] ?? lesson.kind}] ${lesson.title} — ${shortBody(lesson.body)}`,
  );
  return `<project_lessons>
Licoes registradas em projetos anteriores com contexto parecido (o que funcionou e o que deu errado). Aplique apenas o que couber no trabalho atual; se algo parecer nao se aplicar, siga o repositorio e diga por que. Cada licao tem fonte verificavel na base local.

${lines.join("\n")}
</project_lessons>`;
}
