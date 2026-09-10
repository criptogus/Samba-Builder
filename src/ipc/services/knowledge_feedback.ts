/**
 * RAG fase 3 — persistência do feedback de uso.
 *
 * Duas operações, ambas best-effort (aprender nunca pode quebrar um turno):
 * - `recordLessonUsage`: as lições entraram no prompt deste turno;
 * - `recordLessonOutcome`: o turno terminou — fecha os usos pendentes do chat e
 *   atualiza a força/status de cada lição envolvida.
 *
 * O desfecho é por chat (não por turno) porque o stream não expõe um id de turno
 * estável; usos pendentes do chat são resolvidos juntos, o que é exatamente o
 * conjunto que entrou no último turno.
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeUnits, knowledgeUsage } from "@/db/schema";
import {
  applyOutcome,
  statusAfterOutcome,
  statusAfterRecovery,
  type LessonOutcome,
} from "@/delivery/lesson_feedback";

export interface RecordLessonUsageParams {
  unitIds: string[];
  appId: number;
  chatId: number;
  now?: number;
}

/** Marca que estas lições foram injetadas no prompt deste chat. */
export async function recordLessonUsage({
  unitIds,
  appId,
  chatId,
  now = Date.now(),
}: RecordLessonUsageParams): Promise<void> {
  const unique = [...new Set(unitIds.filter(Boolean))];
  if (!unique.length) return;
  try {
    await db.insert(knowledgeUsage).values(
      unique.map((unitId) => ({
        unitId,
        appId,
        chatId,
        outcome: null,
        createdAt: now,
        resolvedAt: null,
      })),
    );
    await db
      .update(knowledgeUnits)
      .set({
        usedCount: sql`${knowledgeUnits.usedCount} + 1`,
        lastUsedAt: now,
      })
      .where(inArray(knowledgeUnits.id, unique));
  } catch {
    // Best-effort: sem feedback o turno segue normalmente.
  }
}

export interface RecordLessonOutcomeParams {
  chatId: number;
  outcome: LessonOutcome;
  /** Para a reavaliação: um acerto pode reativar uma lição contraditada. */
  restoreContradicted?: boolean;
  now?: number;
}

/** Fecha os usos pendentes do chat e atualiza força/status das lições. */
export async function recordLessonOutcome({
  chatId,
  outcome,
  restoreContradicted = true,
  now = Date.now(),
}: RecordLessonOutcomeParams): Promise<void> {
  try {
    const pending = await db
      .select({ id: knowledgeUsage.id, unitId: knowledgeUsage.unitId })
      .from(knowledgeUsage)
      .where(
        and(eq(knowledgeUsage.chatId, chatId), isNull(knowledgeUsage.outcome)),
      );
    if (!pending.length) return;

    const unitIds = [...new Set(pending.map((row) => row.unitId))];
    const units = await db
      .select({
        id: knowledgeUnits.id,
        usedCount: knowledgeUnits.usedCount,
        workedCount: knowledgeUnits.workedCount,
        failedCount: knowledgeUnits.failedCount,
        status: knowledgeUnits.status,
      })
      .from(knowledgeUnits)
      .where(inArray(knowledgeUnits.id, unitIds));

    for (const unit of units) {
      const next = applyOutcome(
        {
          usedCount: unit.usedCount,
          workedCount: unit.workedCount,
          failedCount: unit.failedCount,
        },
        outcome,
      );
      const contradicted = statusAfterOutcome(next) === "contradito";
      // Uma lição contraditada que volta a funcionar é reabilitada — o contexto
      // pode ter mudado; a contradição não é sentença perpétua.
      const recovered =
        restoreContradicted &&
        unit.status === "contradito" &&
        statusAfterRecovery(next) === "active";

      await db
        .update(knowledgeUnits)
        .set({
          usedCount: next.usedCount,
          workedCount: next.workedCount,
          failedCount: next.failedCount,
          status: contradicted
            ? "contradito"
            : recovered
              ? "active"
              : unit.status,
        })
        .where(eq(knowledgeUnits.id, unit.id));
    }

    await db
      .update(knowledgeUsage)
      .set({ outcome, resolvedAt: now })
      .where(
        inArray(
          knowledgeUsage.id,
          pending.map((row) => row.id),
        ),
      );
  } catch {
    // Best-effort.
  }
}
