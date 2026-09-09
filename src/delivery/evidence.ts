import { z } from "zod";

/**
 * Samba Delivery Standard — evidência estruturada por entrega.
 *
 * A unidade de valor não é "código gerado"; é a entrega que passou por gates.
 * Cada gate obrigatório do perfil de risco precisa de um item de evidência com
 * status "passed" (o que foi verificado, como, contra qual versão e por quem).
 * "Parece pronto" nunca é critério de conclusão.
 */

export const evidenceGateIds = [
  "tests", // testes unitários/integração/e2e executados com resultado
  "security", // segredos e testes negativos de autorização
  "dependencies", // varredura de dependências/vulnerabilidades
  "accessibility", // varredura de a11y (checker determinístico, não self-review)
  "visual", // screenshots revisadas (desktop/tablet/mobile + estados)
  "authorization", // aprovação humana vinculada à versão para operações sensíveis
  "architecture", // ADR/contratos/mapa para mudanças transversais
  "performance", // orçamento/latência dos fluxos críticos
] as const;
export type EvidenceGateId = (typeof evidenceGateIds)[number];

export const evidenceStatuses = [
  "passed",
  "failed",
  "not_run",
  "blocked",
] as const;
export type EvidenceStatus = (typeof evidenceStatuses)[number];

export const EvidenceItemSchema = z.object({
  /** ID do gate — um item por gate; registrar de novo substitui o anterior. */
  gate: z.enum(evidenceGateIds),
  status: z.enum(evidenceStatuses),
  /** O que foi verificado e o resultado observado (nunca prometido). */
  summary: z.string().trim().min(1).max(3000),
  /** Comando executado — evidência reprodutível. */
  command: z.string().trim().max(500).optional(),
  /** Versão do que rodou (node, runner, ferramenta, modelo…). */
  version: z.string().trim().max(200).optional(),
  /** Caminhos de artefatos (screenshots, relatórios, logs). */
  artifacts: z.array(z.string().trim().max(400)).max(20).optional(),
  /** Liga à execução de teste persistida (projectTestExecutions). */
  executionId: z.string().uuid().optional(),
  /** Versão Git contra a qual a verificação foi executada. */
  commit: z.string().max(64).optional(),
  /** Quem registrou — humano ou agente. */
  by: z.enum(["human", "agent"]),
  executedAt: z.string().max(64).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export type RiskProfile = "public" | "private" | "critical";

/**
 * Gates obrigatórios por perfil de risco — evidência proporcional à
 * classificação. Uma landing page não passa pelo processo de uma plataforma
 * financeira; mas nada "parece pronto" sem os gates do próprio perfil.
 */
export const gatesByProfile: Record<RiskProfile, readonly EvidenceGateId[]> = {
  // Landing/institucional: testes básicos, segurança e revisão visual.
  public: ["tests", "security", "visual"],
  // SaaS B2B: + varredura de dependências e acessibilidade.
  private: ["tests", "security", "dependencies", "accessibility", "visual"],
  // Fintech/saúde/governo: + aprovação, arquitetura e performance.
  critical: [
    "tests",
    "security",
    "dependencies",
    "accessibility",
    "visual",
    "authorization",
    "architecture",
    "performance",
  ],
};

const fallbackGates: readonly EvidenceGateId[] = [
  "tests",
  "security",
  "visual",
];

export function requiredGates(
  profile?: RiskProfile,
): readonly EvidenceGateId[] {
  return (profile && gatesByProfile[profile]) || fallbackGates;
}

/**
 * Bloqueios de evidência: para cada gate obrigatório do perfil, é preciso um
 * item com status "passed" — e o item mais recente não pode registrar falha.
 * Retorna mensagens acionáveis; vazio = evidência suficiente.
 */
export function evidenceBlockers(
  items: EvidenceItem[],
  profile?: RiskProfile,
): string[] {
  const blockers: string[] = [];
  const latest = new Map<EvidenceGateId, EvidenceItem>();
  for (const item of items) latest.set(item.gate, item);
  for (const gate of requiredGates(profile)) {
    const item = latest.get(gate);
    if (!item)
      blockers.push(
        `Gate "${gate}" sem evidência — verifique e registre o resultado.`,
      );
    else if (item.status === "failed" || item.status === "blocked")
      blockers.push(
        `Gate "${gate}" registra ${item.status} — corrija e registre o resultado final.`,
      );
    else if (item.status === "not_run")
      blockers.push(
        `Gate "${gate}" marcado como não executado — execute e registre.`,
      );
  }
  return blockers;
}

/** Substitui (ou cria) o item de evidência de um gate — um item por gate. */
export function upsertEvidenceItem(
  items: EvidenceItem[],
  item: EvidenceItem,
): EvidenceItem[] {
  const idx = items.findIndex((i) => i.gate === item.gate);
  if (idx === -1) return [...items, item];
  const next = [...items];
  next[idx] = item;
  return next;
}

export function evidenceItemFor(
  items: EvidenceItem[],
  gate: EvidenceGateId,
): EvidenceItem | undefined {
  return items.find((i) => i.gate === gate);
}

export const gateLabels: Record<EvidenceGateId, string> = {
  tests: "Testes executados",
  security: "Segurança (segredos, dependências, autorização)",
  dependencies: "Varredura de dependências",
  accessibility: "Acessibilidade (WCAG AA)",
  visual: "Revisão visual (screenshots, 3 breakpoints)",
  authorization: "Aprovação humana vinculada à versão",
  architecture: "Arquitetura (ADR, contratos, mapa)",
  performance: "Performance e resiliência",
};

/** Perfis de risco usados pela política de engenharia — mesmos nomes do modelo. */
export const riskProfileLabels: Record<RiskProfile, string> = {
  public: "Público — landing/institucional",
  private: "Privado — SaaS B2B / app interno",
  critical: "Crítico — dados sensíveis, finanças, saúde",
};
