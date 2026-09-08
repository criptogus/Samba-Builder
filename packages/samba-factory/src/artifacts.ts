import type { FactoryProject } from "./schema";
import { getSkills } from "./skills";
export function factoryArtifacts(
  project: FactoryProject,
): Record<string, string> {
  const plan = project.plan;
  const table =
    plan?.tasks
      .map(
        (task) =>
          `- [${task.status === "done" ? "x" : " "}] ${task.priority.toUpperCase()}: ${task.title}\n  Aceite: ${task.acceptance}`,
      )
      .join("\n") ?? "Plano pendente.";
  return {
    "docs/brief.md": `# Briefing — ${project.name}\n\nCliente: ${project.client}\n\n${project.brief}\n\n## Conhecimento do projeto\n${project.knowledge}\n`,
    "docs/plan.md": `# Plano — ${project.name}\n\nAprovação: ${project.approval ? `${project.approval.actor} em ${project.approval.at}` : "PENDENTE"}\n\n## Problema\n${plan?.problem ?? "Pendente"}\n\n## Usuários\n${plan?.users ?? "Pendente"}\n\n## Stack\n${plan?.stack ?? "Pendente"}\n\n## Riscos\n${plan?.risks ?? "Pendente"}\n\n## Tarefas e critérios de aceite\n${table}\n`,
    "docs/scope.md": `# Escopo\n\n## Fora de escopo\n${plan?.outOfScope ?? "Pendente"}\n\n## Pedidos de mudança\n${project.changes.map((change) => `- ${change.status}: ${change.request} (tarefa: ${change.taskId ?? "sem vínculo"})`).join("\n") || "Nenhum pedido registrado."}\n`,
    "docs/design-tokens.json": JSON.stringify(project.brand, null, 2),
    "docs/security-report.md": `# Evidência de segurança\n\n${project.scan ? `Verificado em: ${project.scan.at}\nDigest SHA-256: ${project.scan.digest}\nTypecheck: ${project.scan.typecheck}\nSmoke: ${project.scan.smoke}\nDependências: ${project.scan.dependencies}\nCobertura completa: ${project.scan.complete}\n\n${project.scan.findings.map((finding) => `- **${finding.severity}** ${finding.file}:${finding.line} — ${finding.message}\n  Correção: ${finding.remediation}`).join("\n") || "Nenhum achado nas regras heurísticas executadas."}\n\n## Limitações\n${project.scan.limitations.map((item) => `- ${item}`).join("\n")}` : "NÃO EXECUTADO. Este documento não é uma aprovação de segurança."}\n`,
    "docs/handoff.md": `# Handoff — ${project.name}\n\nCliente: ${project.client}\nOwner local do plano: ${project.approval?.actor ?? "Pendente"}\n\n## Antes de entregar\n- [ ] Registrar URL de staging e controle de acesso.\n- [ ] Documentar variáveis de ambiente (nomes, nunca valores).\n- [ ] Documentar deploy, rollback e restauração de backup.\n- [ ] Revisar autorizações no servidor e banco real.\n- [ ] Tech Lead revisar PR e evidências.\n- [ ] Registrar contatos de operação e pendências do cliente.\n\n## Backlog contratado\n${table}\n\nEste pack exporta evidências locais e um checklist de handoff; não comprova execução dos itens acima.\n`,
    "samba/pipeline-status.json": JSON.stringify(
      {
        appId: project.appId,
        revision: project.revision,
        mode: project.mode,
        approval: project.approval,
        brandApproval: project.brandApproval,
        audit: project.audit,
      },
      null,
      2,
    ),
    "samba/skills.lock": JSON.stringify(
      {
        version: 1,
        skills: getSkills(project.mode).map(({ id, version }) => ({
          id,
          version,
        })),
      },
      null,
      2,
    ),
  };
}
