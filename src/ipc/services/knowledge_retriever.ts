/**
 * RAG fase 2 — recuperação no banco local.
 *
 * Lê as unidades de conhecimento gravadas pela fase 1 (todo o histórico do
 * usuário, não só o projeto atual: a promessa é "o próximo projeto nasce
 * sabendo"), seleciona as que casam com o contexto e devolve o bloco pronto
 * para o prompt. Nunca lança: um turno de agente não pode quebrar porque a
 * base de lições está vazia ou indisponível.
 */

import { desc } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeUnits } from "@/db/schema";
import { knowledgeKinds, type KnowledgeKind } from "@/delivery/knowledge";
import {
  MAX_PROJECT_LESSONS,
  renderProjectLessonsBlock,
  selectProjectLessons,
  type LessonUnit,
} from "@/delivery/lessons";

/** Quantas unidades ler antes de ranquear (a base local é pequena). */
const READ_LIMIT = 300;

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function isKnowledgeKind(value: string): value is KnowledgeKind {
  return (knowledgeKinds as readonly string[]).includes(value);
}

/** Converte rows do banco no formato do retriever, descartando o inválido. */
export function toLessonUnits(
  rows: readonly {
    id: string;
    kind: string;
    title: string;
    body: string;
    context: string;
    force: number;
    createdAt: number;
    status: string;
    expiresAt: number | null;
  }[],
): LessonUnit[] {
  return rows
    .filter((row) => isKnowledgeKind(row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind as KnowledgeKind,
      title: row.title,
      body: row.body,
      context: parseJsonObject(row.context),
      force: row.force,
      createdAt: row.createdAt,
      status: row.status,
      expiresAt: row.expiresAt,
    }));
}

export interface ProjectLessonsQuery {
  /** Palavras do trabalho atual (skills selecionadas, nome do app, tema). */
  signals?: string[];
  limit?: number;
  now?: number;
}

/**
 * Bloco `<project_lessons>` para concatenar no contexto do turno. Devolve ""
 * quando não há lição aplicável — nunca um bloco vazio.
 */
export async function projectLessonsPromptBlock(
  query: ProjectLessonsQuery = {},
): Promise<string> {
  try {
    const rows = await db
      .select({
        id: knowledgeUnits.id,
        kind: knowledgeUnits.kind,
        title: knowledgeUnits.title,
        body: knowledgeUnits.body,
        context: knowledgeUnits.context,
        force: knowledgeUnits.force,
        createdAt: knowledgeUnits.createdAt,
        status: knowledgeUnits.status,
        expiresAt: knowledgeUnits.expiresAt,
      })
      .from(knowledgeUnits)
      .orderBy(desc(knowledgeUnits.force), desc(knowledgeUnits.createdAt))
      .limit(READ_LIMIT);

    const lessons = selectProjectLessons(toLessonUnits(rows), {
      signals: query.signals,
      limit: query.limit ?? MAX_PROJECT_LESSONS,
      now: query.now,
    });

    const block = renderProjectLessonsBlock(lessons);
    return block ? `\n\n${block}` : "";
  } catch {
    // Best-effort: aprender não pode impedir o trabalho de acontecer.
    return "";
  }
}
