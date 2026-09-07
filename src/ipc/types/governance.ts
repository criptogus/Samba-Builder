import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";

// =============================================================================
// Samba Builder — Project Governance (single vs governed)
//
// Reads the project's `governance.yaml` (mode + roles) and `.samba/` cycle state
// (draft -> in_review -> approved) and runs `samba/governance/gate.py` actions
// (submit / approve / veto) on the project directory through the main process.
// =============================================================================

export const GovernanceRoleSchema = z.object({
  owner: z.array(z.string()),
  tech: z.array(z.string()),
  reviewer: z.array(z.string()),
  admin: z.array(z.string()),
});
export type GovernanceRoles = z.infer<typeof GovernanceRoleSchema>;

export const GovernanceAuditEventSchema = z.object({
  event: z.string(),
  by: z.string().nullable().optional(),
  ts: z.string().nullable().optional(),
});
export type GovernanceAuditEvent = z.infer<typeof GovernanceAuditEventSchema>;

/** Lightweight read of the project's governance state (no gate invocation). */
export const GovernanceStatusSchema = z.object({
  /** single = sem arquivo (ou mode: single); governed = ciclo de aprovação. */
  mode: z.enum(["single", "governed"]),
  /** Ciclo draft -> in_review -> approved (veto volta para draft). */
  stage: z.string().nullable(),
  vetos: z.number(),
  roles: GovernanceRoleSchema,
  lastAudit: GovernanceAuditEventSchema.nullable(),
  /** Identidade de quem está agindo (email git local, quando resolvível). */
  actingAs: z.string(),
  /** Se o gate.py foi localizado no sistema. */
  gateAvailable: z.boolean(),
  /** Motivo legível quando gateAvailable é false. */
  gateError: z.string().nullable(),
});
export type GovernanceStatus = z.infer<typeof GovernanceStatusSchema>;

const GovernanceParamsSchema = z.object({
  /** Diretório do projeto (path do app; pode ser relativo ou absoluto). */
  appPath: z.string().min(1),
});

const GovernanceRunParamsSchema = GovernanceParamsSchema.extend({
  action: z.enum(["submit", "approve", "veto"]),
  /** Quem executa (email/usuário); omitido usa a identidade git local. */
  by: z.string().trim().optional(),
});
export type GovernanceRunParams = z.infer<typeof GovernanceRunParamsSchema>;

export const GovernanceRunResultSchema = z.object({
  ok: z.boolean(),
  exitCode: z.number(),
  /** stdout do gate.py (motivo de bloqueio, confirmação, etc.). */
  output: z.string(),
  /** Estado recarregado após a ação. */
  status: GovernanceStatusSchema,
});
export type GovernanceRunResult = z.infer<typeof GovernanceRunResultSchema>;

export const governanceContracts = {
  get: defineContract({
    channel: "governance:get",
    input: GovernanceParamsSchema,
    output: GovernanceStatusSchema,
  }),
  run: defineContract({
    channel: "governance:run",
    input: GovernanceRunParamsSchema,
    output: GovernanceRunResultSchema,
  }),
};

export const governanceClient = createClient(governanceContracts);
