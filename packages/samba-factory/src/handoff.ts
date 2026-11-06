import type { FactoryProject } from "./schema";

export function handoffPullRequest(project: FactoryProject): {
  title: string;
  body: string;
} {
  const must =
    project.plan?.tasks.filter((task) => task.priority === "must") ?? [];
  const checklist = must.length
    ? must
        .map(
          (task) =>
            `- [${task.status === "done" ? "x" : " "}] ${task.title}\n  Aceite: ${task.acceptance}`,
        )
        .join("\n")
    : "- [ ] Plano Must ainda não registrado.";
  const scan = project.scan
    ? [
        `- Verificado em: ${project.scan.at}`,
        `- Digest: \`${project.scan.digest}\``,
        `- Typecheck: ${project.scan.typecheck}`,
        `- Smoke: ${project.scan.smoke}`,
        `- Dependências: ${project.scan.dependencies}`,
        `- Achados críticos/altos: ${
          project.scan.findings.filter(
            (finding) =>
              finding.severity === "critical" || finding.severity === "high",
          ).length
        }`,
      ].join("\n")
    : "- Scan não executado.";
  const clock = project.stages?.planApprovedAt
    ? `Plano aprovado em ${project.stages.planApprovedAt}${
        project.stages.stagingAt
          ? `; staging em ${project.stages.stagingAt}`
          : "; staging ainda não registrado"
      }.`
    : "Relógio plan → staging ainda sem aprovação.";

  return {
    title: `Handoff: ${project.name}`,
    body: `# Handoff — ${project.name}

Cliente: ${project.client}
Responsável pelo plano: ${project.approval?.actor ?? "pendente"}

${clock}

## Checklist de aceite

${checklist}

## Evidências

${scan}

Artefatos neste PR:

- [docs/handoff.md](docs/handoff.md)
- [docs/security-report.md](docs/security-report.md)
- [docs/plan.md](docs/plan.md)
- [docs/brief.md](docs/brief.md)
- [samba/pipeline-status.json](samba/pipeline-status.json)

## Como operar sem o autor

1. Leia o checklist e o relatório de segurança.
2. Confira a URL de staging e quem acessa.
3. Variáveis de ambiente estão documentadas por nome, nunca por valor.
4. Rollback segue o runbook do repositório do app.

Este pacote não substitui o gate: publicar sem plano aprovado e scan verde continua bloqueado.
`,
  };
}

export function planToStagingMs(project: FactoryProject): number | null {
  const start = project.stages?.planApprovedAt;
  const end = project.stages?.stagingAt;
  if (!start || !end) return null;
  const duration = Date.parse(end) - Date.parse(start);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

/**
 * Os marcos são instantes. Um dia útil, aqui, são 24 h de relógio entre a
 * aprovação do plano e o primeiro staging — não hora comercial.
 */
export const ONE_BUSINESS_DAY_MS = 24 * 60 * 60 * 1000;

export function withinOneBusinessDay(project: FactoryProject): boolean | null {
  const duration = planToStagingMs(project);
  if (duration === null) return null;
  return duration <= ONE_BUSINESS_DAY_MS;
}

/** Contagem local do ciclo. Não chama rede e não conta template. */
export function summarizeFactoryCycle(projects: readonly FactoryProject[]): {
  active: number;
  staged: number;
  withinOneBusinessDay: number;
} {
  let staged = 0;
  let within = 0;
  for (const project of projects) {
    const hit = withinOneBusinessDay(project);
    if (hit === null) continue;
    staged += 1;
    if (hit) within += 1;
  }
  return { active: projects.length, staged, withinOneBusinessDay: within };
}
