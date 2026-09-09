import log from "electron-log";
import { db } from "@/db";
import { knowledgeUnits } from "@/db/schema";
import type { DeliveryPlan } from "@/delivery/model";
import { unitFromApproval, unitFromFailedGate } from "@/delivery/knowledge";

const logger = log.scope("knowledge");

/**
 * Collector do RAG de aprendizado (F1): roda após cada save do plano de
 * entrega, detecta eventos reais (aprovação nova, gate falho novo) e registra
 * knowledge units no sqlite local. Best-effort e idempotente: nunca lança
 * (não pode quebrar o save) e re-processar o mesmo evento não duplica.
 */
export function collectFromDeliverySave(
  appId: number,
  plan: DeliveryPlan,
  previous?: DeliveryPlan,
): void {
  try {
    const approval = unitFromApproval(appId, plan, previous);
    const failedGates =
      plan.evidenceItems
        .filter((item) => item.status !== "passed")
        .map((item) => unitFromFailedGate(appId, plan, previous, item))
        .filter((u): u is NonNullable<typeof u> => u !== null) ?? [];

    const units = [...(approval ? [approval] : []), ...failedGates];

    if (!units.length) return;
    const now = Date.now();
    for (const { id, draft } of units) {
      db.insert(knowledgeUnits)
        .values({
          id,
          kind: draft.kind,
          appId,
          orgScope: "organization",
          force: draft.force,
          title: draft.title,
          body: draft.body,
          context: JSON.stringify(draft.context),
          source: JSON.stringify(draft.source),
          status: "active",
          createdAt: now,
          expiresAt: now + 1000 * 60 * 60 * 24 * 540, // 18 meses
        })
        .onConflictDoNothing()
        .run();
    }
    logger.log(
      `knowledge: ${units.length} unit(s) registrada(s) para app ${appId}`,
    );
  } catch (error) {
    // Coleta de aprendizado nunca interrompe o fluxo de entrega.
    logger.error("knowledge: falha ao coletar unidades", error);
  }
}
