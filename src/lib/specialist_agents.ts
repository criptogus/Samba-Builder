/**
 * Agentes especialistas do Samba Builder — skills transformados em
 * especialistas com avatar, para o dev criar tarefas específicas no meio do
 * projeto. Cada agente carrega os skills que o sustentam e tarefas
 * pré-definidas (com prompts que ativam /samba-* no início) — o dev nem
 * precisa saber o que pedir: as opções explicam o que cada especialista faz.
 * Agentes sem skill dedicado (mobile, devops/aws) usam as ferramentas gerais
 * do agente com prompt especializado.
 *
 * Após uma tarefa substancial, o modelo emite next-steps atribuídos a estes
 * ids (`specialist="cybersec"`). `recommendWhen` / `skipWhen` dizem quando
 * aquele especialista tem voz — um designer não recomenda em task de backend.
 */

export type SpecialistTask = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

export type SpecialistAgent = {
  id: string;
  name: string;
  /** Primeiro nome da persona — a "cara" do especialista no chat. */
  persona: string;
  /** Ícone lucide do agente (consistente com a iconografia do app). */
  icon: string;
  /** Chave de retrato SVG em SpecialistAvatar. */
  portrait: string;
  tagline: string;
  /** Para o dev (inclusive junior) entender o que o especialista resolve. */
  description: string;
  /** Quando este especialista deve emitir um próximo passo (instrução ao modelo). */
  recommendWhen: string;
  /** Quando NÃO deve falar — evita recomendações fora de domínio. */
  skipWhen: string;
  skills: string[];
  tasks: SpecialistTask[];
};

export const specialistAgents: SpecialistAgent[] = [
  {
    id: "architect",
    name: "Arquiteto",
    persona: "Neri",
    icon: "Network",
    portrait: "architect",
    tagline: "Estrutura, módulos e evolução do código",
    recommendWhen:
      "new modules, API boundaries, coupling, refactors, ADRs, or structural change",
    skipWhen: "copy-only or purely visual CSS polish with no structural change",
    description:
      "Analisa a arquitetura do projeto, aponta riscos de manutenção, propõe decisões (ADRs) e planos de refatoração seguros.",
    skills: ["samba-architecture"],
    tasks: [
      {
        id: "audit-architecture",
        label: "Auditoria de arquitetura",
        description: "Mapa de módulos, fronteiras, acoplamento e riscos",
        prompt:
          "/samba-architecture Audite a arquitetura deste projeto: módulos e domínios, fronteiras, acoplamento, contratos e decisões. Entregue um diagnóstico com riscos priorizados e recomendações.",
      },
      {
        id: "adr",
        label: "Decisão de arquitetura (ADR)",
        description: "Documentar uma decisão com alternativas e motivos",
        prompt:
          "/samba-architecture Escreva uma decisão de arquitetura (ADR curto) para [descreva a decisão]. Liste alternativas consideradas, a razão da escolha e o impacto em módulos e contratos.",
      },
      {
        id: "refactor-plan",
        label: "Plano de refatoração",
        description: "Quebrar uma refatoração em passos seguros e verificáveis",
        prompt:
          "/samba-architecture Crie um plano de refatoração para [área/módulo]: passos pequenos e verificáveis, sem mudar comportamento, com testes de proteção antes de cada etapa.",
      },
    ],
  },
  {
    id: "cybersec",
    name: "Cyber Security",
    persona: "Kai",
    icon: "ShieldCheck",
    portrait: "cybersec",
    tagline: "Segurança por design em cada camada",
    recommendWhen:
      "auth, secrets, user input, permissions, new endpoints, payments, or data exposure",
    skipWhen: "purely visual CSS with no data, auth, or network change",
    description:
      "Caça vulnerabilidades e segredos expostos, revisa autorização e modela ameaças — com correções priorizadas por risco.",
    skills: ["samba-security"],
    tasks: [
      {
        id: "full-audit",
        label: "Auditoria completa de segurança",
        description: "Segredos, dependências, autorização e testes negativos",
        prompt:
          "/samba-security Faça uma auditoria completa de segurança deste projeto: segredos expostos, autorização e isolamento, validação de entrada, dependências vulneráveis e testes negativos. Classifique por risco e proponha correções.",
      },
      {
        id: "authz-review",
        label: "Revisar autorização e permissões",
        description: "Acessos indevidos, escalada e mínimos privilégios",
        prompt:
          "/samba-security Revise autorização e permissões deste projeto: alguém consegue acessar ou alterar o que não deveria (outro tenant, outro papel)? Liste falhas de escalada e privilégios excessivos com correções.",
      },
      {
        id: "threat-model",
        label: "Threat model de uma feature",
        description: "Ameaças e abusos previsíveis antes de implementar",
        prompt:
          "/samba-security Modele as ameaças de [feature/área]: atores, fronteiras de confiança, abusos previsíveis (prompt injection, enumeração, bypass) e os controles/testes negativos obrigatórios antes de implementar.",
      },
      {
        id: "secrets-hunt",
        label: "Caçar segredos expostos",
        description: "Chaves e tokens em código, logs, bundle ou git",
        prompt:
          "/samba-security Procure segredos expostos neste projeto (chaves, tokens, senhas): código, logs, bundle do frontend, histórico git e arquivos de configuração. Para cada achado, diga como rotacionar e como prevenir (secret scanning).",
      },
    ],
  },
  {
    id: "ux-ui",
    name: "Designer UX/UI",
    persona: "Luna",
    icon: "Palette",
    portrait: "ux-ui",
    tagline: "Direção de arte, usabilidade e acessibilidade",
    recommendWhen:
      "screens, user flows, visual polish, accessibility, or responsive layout",
    skipWhen:
      "backend-only work (schema, SQL, server jobs, CI, infra) with no UI surface",
    description:
      "Torna a interface bonita, consistente e acessível: auditoria visual, responsividade, estados e identidade — com evidências de tela.",
    skills: ["samba-design", "samba-accessibility", "samba-art-direction"],
    tasks: [
      {
        id: "ui-audit",
        label: "Auditoria de UX e UI",
        description: "Consistência, hierarquia, estados e identidade",
        prompt:
          "/samba-design /samba-accessibility Audite a UX/UI deste projeto: hierarquia visual, consistência com o design system, estados (loading, vazio, erro, permissão), responsividade e acessibilidade. Entregue achados com evidências de tela e correções.",
      },
      {
        id: "responsive",
        label: "Melhorar responsividade",
        description: "Fluxos quebrados em mobile/tablet/desktop",
        prompt:
          "/samba-design /samba-accessibility Audite e corrija a responsividade deste projeto: teste os fluxos principais em mobile, tablet e desktop, encontre quebras (overflow, toque, densidade) e entregue as correções com verificação em tela.",
      },
      {
        id: "a11y",
        label: "Acessibilidade (WCAG AA)",
        description: "Contraste, teclado, foco, labels e leitor de tela",
        prompt:
          "/samba-accessibility Faça uma auditoria de acessibilidade (WCAG AA) deste projeto: contraste, navegação por teclado, foco visível, labels, semântica e leitor de tela nos fluxos críticos. Corrija o que for possível e liste o que exige avaliação humana.",
      },
      {
        id: "art-direction",
        label: "Direção de arte / identidade",
        description: "Sair do visual genérico com identidade própria",
        prompt:
          "/samba-design /samba-art-direction Este projeto está com cara de template genérico? Defina uma direção de arte deliberada (tokens, tipografia, densidade, motion) coerente com o produto e aplique nas telas principais com verificação visual.",
      },
    ],
  },
  {
    id: "quality",
    name: "Engenheiro de Qualidade",
    persona: "Tess",
    icon: "FlaskConical",
    portrait: "quality",
    tagline: "Testes que provam — com evidência",
    recommendWhen:
      "new behavior or logic that still lacks tests, flaky tests, or missing evidence",
    skipWhen: "the finished work was itself a test-only change already proven",
    description:
      "Planeja e escreve a pirâmide de testes por risco, cobre fluxos críticos e investiga testes que falham — com resultado real executado.",
    skills: ["samba-quality-engineering", "samba-tdd"],
    tasks: [
      {
        id: "test-plan",
        label: "Plano de testes por risco",
        description: "O que testar em cada camada, proporcional ao risco",
        prompt:
          "/samba-quality-engineering Crie o plano de testes deste projeto pela pirâmide por risco (unitário, integração, contrato, e2e, segurança): o que é indispensável nos fluxos críticos, o que falta hoje e por onde começar.",
      },
      {
        id: "cover-critical",
        label: "Cobrir fluxo crítico com testes",
        description: "Proteger a jornada que não pode quebrar",
        prompt:
          "/samba-quality-engineering Escreva os testes que faltam para o fluxo crítico [fluxo/jornada]: unitário para as regras, integração para persistência/APIs e o e2e da jornada completa. Execute e registre o resultado real.",
      },
      {
        id: "flaky",
        label: "Investigar teste que falha",
        description: "Achar a causa raiz de teste instável ou quebrado",
        prompt:
          "/samba-tdd Investigue por que o teste [teste/área] está falhando: encontre a causa raiz (código, timing, ambiente), corrija com o menor diff possível e execute a suíte relevante para provar.",
      },
    ],
  },
  {
    id: "performance",
    name: "Performance",
    persona: "Aero",
    icon: "Gauge",
    portrait: "performance",
    tagline: "Rápido e resiliente desde o desenho",
    recommendWhen:
      "loading, lists, queries, images, external calls, or timeouts",
    skipWhen: "tiny copy or one-line changes with no hot path",
    description:
      "Audita carregamento, latência e resiliência; aplica timeouts, retries, cache e degradação graciosa onde faz diferença.",
    skills: ["samba-performance"],
    tasks: [
      {
        id: "perf-audit",
        label: "Auditoria de performance",
        description: "Gargalos de carregamento, render e banco",
        prompt:
          "/samba-performance Audite a performance deste projeto: gargalos de carregamento e renderização, chamadas externas sem timeout, consultas sem índice, bundle grande. Meça antes de otimizar e priorize pelo impacto real.",
      },
      {
        id: "perf-fix",
        label: "Acelerar o carregamento",
        description: "Tornar a experiência inicial rápida",
        prompt:
          "/samba-performance Otimize o tempo de carregamento das telas principais deste projeto: bundle, imagens, cache, carregamento progressivo. Meça antes/depois e entregue com evidência.",
      },
      {
        id: "resilience",
        label: "Resiliência e falhas externas",
        description: "Timeouts, retries, circuit breaker e degradação",
        prompt:
          "/samba-performance Revise a resiliência deste projeto: toda chamada externa tem timeout e retry com jitter? Há circuit breaker onde precisa? Filas e idempotência em jobs? O que acontece quando uma integração falha — degrada com graça?",
      },
    ],
  },
  {
    id: "enterprise",
    name: "Consultor Enterprise",
    persona: "Vera",
    icon: "Building2",
    portrait: "enterprise",
    tagline: "Governança, observabilidade e operação",
    recommendWhen:
      "production readiness, logging, roles, audit, deploy, or runbooks",
    skipWhen: "early prototype UI-only work with no operational surface",
    description:
      "Prepara o produto para cliente corporativo: papéis e aprovações, trilha de auditoria, logs e métricas, deploy com rollback e runbooks.",
    skills: ["samba-governance", "samba-observability", "samba-delivery"],
    tasks: [
      {
        id: "prod-ready",
        label: "Pronto para produção?",
        description: "Gap operacional completo para operar de verdade",
        prompt:
          "/samba-governance /samba-observability /samba-delivery Avalie o que falta para este produto operar com padrão corporativo: governança (papéis, auditoria), observabilidade (logs, métricas, SLOs), deploy/rollback, runbooks e LGPD. Entregue plano de lacunas priorizado.",
      },
      {
        id: "governance-audit",
        label: "Auditoria de governança",
        description: "Ações sensíveis auditáveis e com aprovação",
        prompt:
          "/samba-governance Audite a governança deste produto: ações sensíveis têm autorização explícita e trilha de auditoria? Há separação entre dev/staging/prod? Classifique as operações por risco (baixo→crítico) e aponte o que falta.",
      },
      {
        id: "observability",
        label: "Observabilidade e métricas",
        description: "Enxergar o que acontece em produção",
        prompt:
          "/samba-observability Implemente/revise a observabilidade deste projeto: logs estruturados com correlação, health checks, métricas dos fluxos críticos e SLOs simples. Sem PII ou segredos em logs.",
      },
    ],
  },
  {
    id: "pm",
    name: "Product Manager",
    persona: "Sol",
    icon: "ClipboardList",
    portrait: "pm",
    tagline: "Requisito, escopo e aceite claros",
    recommendWhen:
      "the next decision is product, scope, acceptance criteria, or a new capability",
    skipWhen: "purely mechanical follow-ups (format, rename, leftover cleanup)",
    description:
      "Transforma ideias vagas em PRDs rastreáveis com critérios de aceite, mantém o escopo sob controle e liga requisito a teste e evidência.",
    skills: ["samba-pm", "samba-spec", "samba-scope-guard"],
    tasks: [
      {
        id: "prd",
        label: "Escrever PRD de uma feature",
        description: "Problema, público, métricas, aceite e fora de escopo",
        prompt:
          "/samba-pm /samba-spec Escreva o PRD de [feature]: problema, público, hipótese de valor e métrica, jornadas (principal e exceções), requisitos priorizados, critérios de aceite testáveis, riscos e escopo fora da versão.",
      },
      {
        id: "scope",
        label: "Definir escopo (e fora de escopo)",
        description: "O que entra nesta versão — e o que fica explícito fora",
        prompt:
          "/samba-scope-guard Ajude a fechar o escopo de [feature/mudança]: o que entra, o que fica fora da versão, o impacto técnico/segurança/manutenção e as métricas que justificam. Feature creep vira decisão explícita, não trabalho silencioso.",
      },
      {
        id: "refine",
        label: "Refinar requisito vago",
        description: "Transformar ideia solta em requisito acionável",
        prompt:
          "/samba-pm Refine este requisito vago: [cole a ideia]. Faça perguntas que faltam, defina critérios de aceite testáveis e proponha a jornada do usuário do início ao fim (incluindo erros e permissão negada).",
      },
    ],
  },
  {
    id: "reviewer",
    name: "Revisor de Código",
    persona: "Rio",
    icon: "ScanSearch",
    portrait: "reviewer",
    tagline: "Olhar crítico com evidência",
    recommendWhen:
      "a non-trivial code change that should be critically re-read before shipping",
    skipWhen: "analysis-only turns with no code change, or trivial one-liners",
    description:
      "Revisa mudanças como um engenheiro sênior e investiga bugs pela causa raiz — sem chutar.",
    skills: ["samba-review", "samba-debug"],
    tasks: [
      {
        id: "code-review",
        label: "Revisar a mudança recente",
        description: "Bugs, segurança, clareza e testes na última alteração",
        prompt:
          "/samba-review Revise a mudança mais recente deste projeto: bugs, falhas de segurança, clareza, casos de borda e testes que deveriam existir. Aponte com referência às linhas e priorize.",
      },
      {
        id: "debug",
        label: "Investigar um bug",
        description: "Causa raiz com evidência, não tentativa e erro",
        prompt:
          "/samba-debug Investigue o bug: [descreva o sintoma]. Encontre a causa raiz com evidência (código, logs, testes), explique-a e proponha a correção mínima — sem chutar.",
      },
    ],
  },
  {
    id: "mobile",
    name: "Apps Nativos / Mobile",
    persona: "Nia",
    icon: "Smartphone",
    portrait: "mobile",
    tagline: "React Native, Flutter e plataformas móveis",
    recommendWhen:
      "the work touched mobile, native, or small-viewport behavior",
    skipWhen: "desktop/web-only backend or desktop-only layout work",
    description:
      "Especialista em aplicativos móveis e nativos: auditoria de projeto mobile, adaptação de fluxos para telas pequenas e boas práticas da plataforma.",
    skills: [],
    tasks: [
      {
        id: "mobile-audit",
        label: "Auditoria de app mobile",
        description: "Qualidade do projeto nativo/híbrido (RN, Flutter…)",
        prompt:
          "Atue como especialista em aplicativos móveis/nativos. Audite este projeto mobile (identifique a stack: React Native, Flutter, nativo…): estrutura, navegação, estados de tela, offline, performance em dispositivo, toque e boas práticas da plataforma. Entregue achados priorizados com correções.",
      },
      {
        id: "mobile-feature",
        label: "Implementar/adaptar tela mobile",
        description: "Fluxo pensado para tela pequena e toque",
        prompt:
          "Atue como especialista em apps móveis. Projete/adapte [tela/fluxo] para mobile: alvos de toque adequados, uma ação por etapa, estados offline/erro/loading e navegação nativa da plataforma. Implemente e verifique em viewport de celular.",
      },
    ],
  },
  {
    id: "devops",
    name: "DevOps / AWS",
    persona: "Atlas",
    icon: "Cloud",
    portrait: "devops",
    tagline: "Deploy, infraestrutura e cloud",
    recommendWhen: "deploy, CI, Docker, env, infra, cloud, or rollback",
    skipWhen: "in-app feature UI/backend with no ops or environment change",
    description:
      "Prepara deploy, CI/CD, infraestrutura e cloud (AWS): do Docker ao pipeline, com custo e segurança em mente.",
    skills: [],
    tasks: [
      {
        id: "deploy-setup",
        label: "Preparar deploy e CI/CD",
        description: "Build, pipeline, ambientes e rollback",
        prompt:
          "Atue como especialista DevOps. Prepare deploy e CI/CD para este projeto: build reproduzível, pipeline (testes → build → deploy), separação dev/staging/prod e procedimento de rollback documentado. Implemente o que for aplicável ao repo.",
      },
      {
        id: "aws-review",
        label: "Revisar infraestrutura AWS",
        description: "Arquitetura cloud: custo, segurança e resiliência",
        prompt:
          "Atue como especialista AWS. Revise a infraestrutura cloud deste projeto (ou proponha uma se não houver): serviços adequados ao tamanho, custo estimado, segurança (IAM mínimo, secrets), backups e resiliência multi-AZ quando justificado. Entregue um diagrama e lista de mudanças priorizadas.",
      },
      {
        id: "dockerize",
        label: "Containerizar o projeto",
        description: "Dockerfile e compose prontos e enxutos",
        prompt:
          "Atue como especialista DevOps. Crie/revise a containerização deste projeto: Dockerfile enxuto e reproduzível (multi-stage quando fizer sentido), .dockerignore correto, compose para desenvolvimento e instruções de execução.",
      },
    ],
  },
];

const specialistsById = new Map(
  specialistAgents.map((agent) => [agent.id, agent]),
);

export function getSpecialistAgent(
  id: string | undefined | null,
): SpecialistAgent | undefined {
  if (!id) return undefined;
  return specialistsById.get(id);
}

/** Prefixa o pedido com os skills do especialista (ou o papel, se não houver skill). */
export function composeSpecialistTaskPrompt(
  agent: SpecialistAgent,
  taskText: string,
): string {
  const text = taskText.trim();
  if (agent.skills.length > 0) {
    return `${agent.skills.map((s) => `/${s}`).join(" ")} ${text}`;
  }
  return `Atue como especialista em ${agent.name} (${agent.tagline}). ${text}`;
}

/**
 * Instrução de next-step para o system prompt: cada sugestão vem de um
 * especialista cujo domínio combina com o que acabou de ser feito.
 */
export function specialistNextStepGuideline(): string {
  const catalog = specialistAgents
    .map(
      (agent) =>
        `- ${agent.id} (${agent.persona} · ${agent.name}): recommend when ${agent.recommendWhen}. Skip when ${agent.skipWhen}.`,
    )
    .join("\n");
  return `- When you FINISH a substantial task — real code written, verified and committed, OR a deep analysis/review the user asked for (never a trivial question or a single Q&A turn) — close with suggested next steps from specialist agents who would actually have something useful to say about what was just done. Emit 2-4 <samba-command type="next-step" specialist="<id>" prompt="..."></samba-command> tags at the very end. Each tag MUST include specialist="<id>" from the catalog below — that is whose face and voice the user sees. Pick specialists by domain fit, not by rotation: a designer (ux-ui) must not recommend after a pure backend/API/schema/SQL/CI task; mobile must not speak unless the work touched mobile/native/small-viewport; cybersec MAY recommend after auth, input, secrets, permissions, or new endpoints; architect after modules/coupling/structure; devops after deploy/CI/env/infra; quality after new untested behavior; pm when the next move is a product/scope decision; reviewer after a non-trivial code change. Prefer 2-4 different specialists. Each prompt must evolve the work meaningfully (a concrete next capability, polish, or the natural continuation of what was just done — e.g. after an analysis, the top recommended package as an implementable instruction), start with a verb, stay under ~90 characters, and be written in pt-BR so the user can click it to continue directly. Never end a substantial task with an open question as the only call to action — the clickable next steps ARE the call to action. Never use <, >, & or double quotes inside the prompt value (write them as words: "maior ou igual a 22", "menor que 26") — those characters break the tag and the suggestion disappears for the user. Do not emit next steps for trivial changes.
Specialist catalog (use these ids exactly):
${catalog}`;
}
