import type { FactoryMode, FactoryProject } from "./schema";

export const MODE_LABELS: Record<FactoryMode, string> = {
  discover: "Discover",
  plan: "Plan",
  design: "Design",
  build: "Build",
  fix: "Fix",
  secure: "Secure",
  review: "Review",
  ask: "Ask",
};
export function buildBlockers(project: FactoryProject): string[] {
  const reasons: string[] = [];
  if (!project.plan || !project.approval)
    reasons.push("Aprove o plano antes de implementar.");
  if (!project.brand || !project.brandApproval)
    reasons.push("Confirme os tokens de marca antes de implementar.");
  if (
    project.changes.some(
      (change) =>
        change.status === "pending" || change.status === "change-request",
    )
  ) {
    reasons.push("Resolva as solicitações de escopo pendentes.");
  }
  return reasons;
}
export function releaseBlockers(
  project: FactoryProject,
  digest: string,
): string[] {
  const reasons = buildBlockers(project);
  if (
    project.plan?.tasks.some(
      (task) => task.priority === "must" && task.status !== "done",
    )
  )
    reasons.push("Conclua todas as tarefas Must.");
  const scan = project.scan;
  if (!scan) return [...reasons, "Execute a verificação de release."];
  if (scan.digest !== digest)
    reasons.push("O código mudou desde a verificação. Execute novamente.");
  if (!scan.complete)
    reasons.push("O scan não cobriu todos os arquivos necessários.");
  if (
    scan.findings.some(
      (finding) =>
        finding.severity === "critical" || finding.severity === "high",
    )
  )
    reasons.push(
      "Corrija os achados críticos e altos. Esta versão não permite waiver.",
    );
  if (scan.typecheck !== "passed")
    reasons.push(
      "Typecheck obrigatório: configure o script typecheck (ou ts).",
    );
  if (scan.smoke !== "passed")
    reasons.push("Smoke test obrigatório: configure o script test:smoke.");
  if (scan.dependencies !== "passed")
    reasons.push(
      "Auditoria de dependências ausente ou com vulnerabilidades altas/críticas.",
    );
  return reasons;
}
export function engineMode(mode: FactoryMode): "ask" | "local-agent" {
  // Discovery, planning, design and security analysis cannot mutate the project.
  return mode === "build" || mode === "fix" ? "local-agent" : "ask";
}
