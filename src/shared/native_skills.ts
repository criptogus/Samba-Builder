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
    sources: ["mattpocock/skills", "msitarzewski/agency-agents"],
    prerequisite: null,
  },
  {
    slug: "samba-security",
    title: "Segurança de aplicações",
    category: "Engenharia",
    description:
      "Revisa autenticação, dados, segredos e fronteiras de confiança.",
    sources: ["affaan-m/ECC"],
    prerequisite: null,
  },
  {
    slug: "samba-design",
    title: "Design de interfaces",
    category: "Design",
    description:
      "Define direção visual, componentes e estados com identidade consistente.",
    sources: [
      "nextlevelbuilder/ui-ux-pro-max-skill",
      "Leonxlnx/taste-skill",
      "VoltAgent/awesome-design-md",
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
    title: "Desempenho e memória",
    category: "Engenharia",
    description:
      "Mede consumo, identifica retenção e valida otimizações com carga comparável.",
    sources: ["affaan-m/ECC"],
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
    title: "Preparação para publicação",
    category: "Integrações",
    description: "Verifica build, ambiente e requisitos para Vercel ou AWS.",
    sources: ["github/spec-kit", "affaan-m/ECC"],
    prerequisite: "Conta e conector Vercel/AWS configurados.",
  },
];
