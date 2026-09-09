// Metadata only: importing the catalog never loads skill instructions or tools.
export interface NativeSkill {
  slug: string;
  title: string;
  category: string;
  description: string;
  sources: readonly string[];
  prerequisite: string | null;
}
export const nativeSkills: readonly NativeSkill[] = [
  {
    slug: "samba-pm",
    title: "PM Samba",
    category: "Produto",
    description:
      "Guia ideias e briefings até um produto simples, inovador e com design marcante, resolvendo um problema real.",
    sources: ["criptogus/Samba-Builder"],
    prerequisite: null,
  },
  {
    slug: "samba-spec",
    title: "Especificação de produto",
    category: "Produto",
    description:
      "Converte uma ideia em requisitos verificáveis e um recorte implementável.",
    sources: ["github/spec-kit", "obra/superpowers"],
    prerequisite: null,
  },
  {
    slug: "samba-plan",
    title: "Plano de implementação",
    category: "Engenharia",
    description:
      "Organiza mudanças por dependência, risco e critérios de conclusão.",
    sources: ["obra/superpowers", "github/spec-kit"],
    prerequisite: null,
  },
  {
    slug: "samba-debug",
    title: "Depuração com evidências",
    category: "Engenharia",
    description:
      "Reproduz falhas, testa hipóteses e verifica a causa antes da correção.",
    sources: ["obra/superpowers"],
    prerequisite: null,
  },
  {
    slug: "samba-tdd",
    title: "Testes por comportamento",
    category: "Engenharia",
    description:
      "Cria testes que comprovam o fluxo e sobrevivem a refatorações.",
    sources: ["mattpocock/skills"],
    prerequisite: null,
  },
  {
    slug: "samba-review",
    title: "Revisão de código",
    category: "Engenharia",
    description:
      "Encontra regressões acionáveis com arquivo, cenário e impacto.",
    sources: [
      "mattpocock/skills",
      "msitarzewski/agency-agents",
      "obra/superpowers",
    ],
    prerequisite: null,
  },
  {
    slug: "samba-security",
    title: "Segurança de aplicações",
    category: "Engenharia",
    description:
      "Revisa autenticação, dados, segredos e fronteiras de confiança.",
    sources: ["affaan-m/ECC", "OWASP/ASVS"],
    prerequisite: null,
  },
  {
    slug: "samba-design",
    title: "Design de interfaces",
    category: "Design",
    description:
      "Cria direção de arte própria, composição editorial e interfaces refinadas, com revisão visual e design system sustentável.",
    sources: [
      "nextlevelbuilder/ui-ux-pro-max-skill",
      "Leonxlnx/taste-skill",
      "VoltAgent/awesome-design-md",
    ],
    prerequisite: null,
  },
  {
    slug: "samba-motion",
    title: "Direção de movimento",
    category: "Design",
    description:
      "Coreografa transições e interações expressivas, leves e acessíveis, com padrões fáceis de manter.",
    sources: [
      "https://motion.dev/docs/react-accessibility",
      "https://web.dev/articles/animations-guide",
    ],
    prerequisite: null,
  },
  {
    slug: "samba-accessibility",
    title: "Acessibilidade e UX",
    category: "Design",
    description:
      "Avalia navegação, compreensão, formulários e estados responsivos.",
    sources: ["nextlevelbuilder/ui-ux-pro-max-skill"],
    prerequisite: null,
  },
  {
    slug: "samba-architecture",
    title: "Mapa do projeto",
    category: "Engenharia",
    description: "Explica módulos, fluxo de dados e impacto de uma mudança.",
    sources: ["Egonex-AI/Understand-Anything", "mattpocock/skills"],
    prerequisite: null,
  },
  {
    slug: "samba-performance",
    title: "Desempenho web e memória",
    category: "Engenharia",
    description:
      "Analisa carregamento web, backend e memória; prioriza gargalos medidos com carga comparável.",
    sources: ["affaan-m/ECC", "vercel-labs/agent-skills"],
    prerequisite: null,
  },
  {
    slug: "samba-documents",
    title: "Documentos para contexto",
    category: "Conteúdo",
    description:
      "Planeja extração fiel e limitada de documentos; conversor opcional.",
    sources: ["microsoft/markitdown", "anthropics/skills"],
    prerequisite: "Conversor externo somente se o anexo não estiver legível.",
  },
  {
    slug: "samba-mcp",
    title: "Integrações MCP",
    category: "Integrações",
    description:
      "Planeja e valida conectores usando o gerenciador MCP existente.",
    sources: [
      "punkpeye/awesome-mcp-servers",
      "ComposioHQ/awesome-claude-skills",
    ],
    prerequisite: "Servidor MCP configurado e autenticado.",
  },
  {
    slug: "samba-video",
    title: "Vídeos com React",
    category: "Conteúdo",
    description:
      "Estrutura composições e validação de vídeos em projetos Remotion.",
    sources: ["remotion-dev/remotion"],
    prerequisite:
      "Projeto Remotion e runtime de renderização; licença aplicável.",
  },
  {
    slug: "samba-delivery",
    title: "Entrega e operação",
    category: "Integrações",
    description:
      "Pacote de handoff corporativo: runbooks, deploy/rollback, ownership, SLOs e critério de conclusão (outra pessoa consegue operar).",
    sources: ["github/spec-kit", "affaan-m/ECC"],
    prerequisite: null,
  },
  {
    slug: "samba-art-direction",
    title: "Direção de arte",
    category: "Design",
    description:
      "Produtos visualmente autores: moodboard, direção visual, tokens, densidade, motion com propósito e gate de screenshots em 3 breakpoints.",
    sources: [
      "nextlevelbuilder/ui-ux-pro-max-skill",
      "VoltAgent/awesome-design-md",
    ],
    prerequisite: null,
  },
  {
    slug: "samba-quality-engineering",
    title: "Qualidade com evidência",
    category: "Engenharia",
    description:
      "Pirâmide de testes por risco e matriz requisito→evidência: prova a qualidade executando e registrando, nunca afirmando.",
    sources: ["obra/superpowers", "github/spec-kit"],
    prerequisite: null,
  },
  {
    slug: "samba-governance",
    title: "Governança corporativa",
    category: "Engenharia",
    description:
      "RBAC, mínimo privilégio, auditoria append-only, dupla aprovação para alto risco e classificação de risco proporcional do projeto.",
    sources: ["github/spec-kit"],
    prerequisite: null,
  },
  {
    slug: "samba-observability",
    title: "Observabilidade",
    category: "Engenharia",
    description:
      "Logs estruturados, correlação, métricas, SLOs, dashboards e telemetria de execuções de IA com privacidade por padrão.",
    sources: ["vercel-labs/agent-skills"],
    prerequisite: null,
  },
  {
    slug: "samba-scope-guard",
    title: "Controle de escopo",
    category: "Produto",
    description:
      "Escopo com custo técnico explícito: impacto, segurança e manutenção registrados; feature creep vira decisão, não trabalho silencioso.",
    sources: ["github/spec-kit"],
    prerequisite: null,
  },
];
