/**
 * Ações iniciais pré-definidas para repositórios/projetos recém-importados.
 *
 * Cada ação dispara um prompt no chat do projeto que começa com o(s) skill(s)
 * nativo(s) correto(s) — o parser ativa /samba-* no início do prompt. O cliente
 * não precisa saber qual skill usar: a ação já carrega o skill certo.
 */
export type RepoAuditAction = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  prompt: string;
};

export const repoAuditActions: RepoAuditAction[] = [
  {
    id: "repo-review",
    label: "Review do repositório",
    emoji: "🔍",
    description:
      "Revisão geral: bugs, qualidade, dívida técnica e riscos, priorizados por severidade.",
    prompt:
      "/samba-review Faça uma revisão completa deste repositório recém-importado: bugs, problemas de qualidade, dívida técnica e riscos. Priorize por severidade e sugira correções objetivas.",
  },
  {
    id: "technical-analysis",
    label: "Análise técnica",
    emoji: "🧪",
    description:
      "Análise aprofundada: stack, estrutura, dependências, padrões de código, testes e pontos frágeis.",
    prompt:
      "Analise tecnicamente este repositório recém-importado: stack, estrutura de pastas, dependências, padrões de código, cobertura de testes e pontos frágeis. Entregue um relatório objetivo com prioridades de ação.",
  },
  {
    id: "architecture-analysis",
    label: "Análise de arquitetura",
    emoji: "🏗️",
    description:
      "Módulos, fronteiras, acoplamento, contratos e decisões de arquitetura — com riscos de manutenção.",
    prompt:
      "/samba-architecture Analise a arquitetura deste repositório recém-importado: módulos e domínios, fronteiras, acoplamento, contratos e decisões registradas. Aponte riscos de manutenção e melhorias priorizadas.",
  },
  {
    id: "ux-ui-audit",
    label: "Auditoria de UX e UI",
    emoji: "🎨",
    description:
      "Direção de arte, design system, consistência visual, estados de interface e acessibilidade.",
    prompt:
      "/samba-design /samba-accessibility Audite a UX/UI deste repositório recém-importado: direção de arte, consistência com design system, hierarquia visual, estados (loading, vazio, erro, permissão), responsividade e acessibilidade (contraste, teclado, foco, labels). Entregue achados com evidências de tela.",
  },
  {
    id: "cybersec-audit",
    label: "Auditoria de Cybersec",
    emoji: "🛡️",
    description:
      "Segurança por design: segredos expostos, autorização, validação, dependências vulneráveis e testes negativos.",
    prompt:
      "/samba-security Audite a segurança deste repositório recém-importado: segredos expostos (código, bundle, logs), autorização e isolamento por tenant, validação de entrada, dependências vulneráveis e testes negativos de acesso. Classifique por risco e proponha correções.",
  },
  {
    id: "quality-audit",
    label: "Qualidade e testes",
    emoji: "🧩",
    description:
      "Pirâmide de testes, cobertura dos fluxos críticos e evidência executável por risco.",
    prompt:
      "/samba-quality-engineering Avalie a qualidade e os testes deste repositório recém-importado: pirâmide por risco (unitário, integração, contrato, e2e, segurança), cobertura dos fluxos críticos e lacunas que deixam regressões passarem. Execute os testes existentes e registre o resultado real.",
  },
  {
    id: "performance-audit",
    label: "Performance e resiliência",
    emoji: "⚡",
    description:
      "Orçamento de performance, timeouts, retries, filas, cache e degradação graciosa.",
    prompt:
      "/samba-performance Analise performance e resiliência deste repositório recém-importado: chamadas externas sem timeout/retry, índices de banco, cache e paginação, filas e idempotência, e degradação graciosa quando integrações falharem.",
  },
  {
    id: "production-readiness",
    label: "Pronto para produção?",
    emoji: "🚀",
    description:
      "Gap operacional: governança, observabilidade, deploy/rollback, runbooks e auditoria.",
    prompt:
      "/samba-governance /samba-observability /samba-delivery Avalie o que falta para este produto operar com padrão corporativo: governança (papéis, auditoria, aprovações), observabilidade (logs estruturados, métricas, SLOs), deploy/rollback, runbooks e LGPD. Entregue um plano de lacunas priorizado.",
  },
];
