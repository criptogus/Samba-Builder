Vou mapear o que Lovable, Replit e Bolt fazem de melhor, entender o Dyad como base e transformar isso em um PRD completo do Samba Builder. Começo pelas fontes oficiais e comparativos atuais.Agora vou aprofundar o Dyad e os fluxos de produto, design e segurança de cada plataforma, para o PRD não ficar só na superfície.Estudo competitivo e PRD abaixo. A tese: Samba Builder não deve copiar um vibe-coder de consumidor. Deve ser o sistema operacional da fábrica — briefing → escopo → design → código → segurança → entrega — com skills embutidos e Dyad como runtime local.

Estudo competitivo + PRD

Samba Builder

Versão: 1.0

Data: 05/09/2026

Status: Draft para implementação

Base técnica: fork/evolução do Dyad (local-first, Apache 2.0 + FSL no src/pro)

Usuário primário: time de desenvolvimento da Samba, entregando apps para clientes

1. Estudo: o que cada um faz de melhor

1.1 Lovable — o melhor “produto de ponta a ponta”

Lovable venceu a categoria prompt → app full-stack utilizável. O stack padrão é React + TypeScript + Tailwind + shadcn, com backend nativo em Supabase (auth, Postgres, storage, realtime, edge functions). O código é real e exportável para GitHub.

O que vale copiar:

| Capacidade                      | Por que importa para uma fábrica                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Plan mode antes do código       | Evita o agente sair implementando o briefing errado. Mapeia features, faz perguntas e só então constrói.                   |
| Agent mode como default         | Explora o codebase, edita vários arquivos, integra tools e reduz erros.                                                    |
| Visual edits sem gastar crédito | Designer/PM ajusta texto, cor, espaçamento no preview sem reabrir o agente.                                                |
| Browser testing automático      | Agente navega o app, preenche forms, testa fluxos e corrige.                                                               |
| Workspace + project knowledge   | Regras persistentes: stack, naming, libs, domínio.                                                                         |
| Security scan em camadas        | Scan básico no publish (RLS, misconfig, deps) + deep scan agentic do código + auto-fix de baixo risco + “security memory”. |
| Governança de workspace         | Insights: apps publicados, PII, findings abertos, projetos órfãos, bloqueio de publish em crítico.                         |
| Connectors + MCP                | Integrações (Stripe, Google, Microsoft, Salesforce) e exposição de capabilities para outros agents.                        |
| Subagents + prompt queue        | Trabalho paralelo e fila de mudanças.                                                                                      |

Limitações a não herdar: stack pouco flexível (quase sempre React/Supabase), lock-in de créditos, fraco para brownfield complexo, mobile nativo limitado.

1.2 Bolt — o melhor “loop de execução instantânea”

O diferencial real do Bolt não é o chat. É o WebContainer: Node.js no browser, npm install real, terminal, preview com hot reload, agente com controle do filesystem + servidor + console. O agente vê o erro de runtime e corrige sozinho.

O que vale copiar:

| Capacidade                          | Por que importa                                                            |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Ambiente executável imediatamente   | Sem “código gerado que não sobe”. Preview + logs + terminal no mesmo loop. |
| Transparência (diff + file tree)    | Dev senior precisa ver o que o agente mudou.                               |
| Flexibilidade de framework          | React, Next, Vue, Svelte, Astro, Remix, Expo/RN.                           |
| Erro → auto-fix a partir do runtime | Fecha o ciclo build/test sem humano colar stacktrace.                      |
| Share + fork instantâneo            | Handoff interno e demo para cliente.                                       |
| Figma import + deploy 1-click       | Do design ao URL.                                                          |
| Código do usuário é dele            | Sem formato proprietário.                                                  |

Limitações a não herdar: qualidade de código costuma ser mais “descartável”, billing por token queima rápido, fraco em governança enterprise e em brownfield grande.

1.3 Replit — o melhor “time + agente + fábrica”

Replit é o mais próximo de um ambiente de software house: IDE + Agent + infra + colaboração. Agent 3/4 planeja, executa em paralelo, testa no browser, cria checkpoints e faz merge. Skills e Custom Instructions injetam o jeito do time em todo projeto.

O que vale copiar:

| Capacidade                     | Por que importa                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Plan mode + Kanban de tasks    | O agente quebra o projeto, o humano aprova a ordem.                               |
| Design Canvas + variantes      | Explora UI no canvas e aplica a vencedora no app.                                 |
| Skills + Custom Instructions   | Padrões do time (secrets, design system, testes, estilo) sempre no contexto.      |
| Security Agent                 | Threat model + SAST (Semgrep etc.) + LLM de exploitabilidade + tasks de correção. |
| CVE Auto-Protect               | Patch automático de CVE crítico com testes.                                       |
| Checkpoints / rollback         | Fábrica precisa de undo confiável.                                                |
| Agentes paralelos + merge      | Auth, DB e UI ao mesmo tempo.                                                     |
| Multi-artefato                 | Web + mobile + deck no mesmo contexto de produto.                                 |
| Model routing                  | Modelo barato para bulk, modelo forte para raciocínio.                            |
| Package security na instalação | Bloqueia pacote malicioso antes de entrar no ambiente.                            |

Limitações a não herdar: acoplamento à infra Replit, custo variável, código “sabor Replit”, menos local-first / privacidade de cliente.

1.4 Dyad — o que já temos de graça como fundação

Dyad é o ponto de partida certo para Samba:

Desktop local (Electron), código e dados no máquina/time.

BYOK (OpenAI, Anthropic, Gemini, Ollama, LM Studio…).

Modos Build / Basic Agent / Full Agent.

~20 tools nativas (arquivos, grep, SQL, search) + MCP client com consentimento por tool.

Import de pasta local e GitHub.

Rules, scaffolds, workers, makers — monorepo extensível.

Código real, sem lock-in.

O que Dyad não é ainda (e o Samba Builder precisa ser):

Não é um pipeline de fábrica (descoberta → escopo → aceite → entrega).

Não tem design system de marca / QA visual de produto.

Não tem Security Agent + gate de publish.

Não tem workspaces multi-cliente, papéis, auditoria.

Não tem skills de domínio Samba empacotados.

Não tem colaboração simultânea nem governança de portfolio.

2. Síntese: o que Samba Builder deve “roubar”

Lovable → Plan-before-code + visual edit + knowledge + security gate + connectors
Bolt → Runtime verdadeiro + diffs + auto-fix de erro + preview instantâneo
Replit → Skills + tasks + design canvas + security agent + checkpoints + parallel agents
Dyad → Local-first + BYOK + MCP + ownership do código + extensibilidade
Samba → Fábrica: briefing de cliente, escopo comercial, marca, cybersec, handoff

Princípio de produto: o agente não é um coder genérico. É um time virtual da Samba com papéis, playbooks e gates.

PRD — Samba Builder

3. Visão

Samba Builder é o ambiente interno da Samba para criar, endurecer e entregar aplicações de clientes em horas/dias, não semanas — sem sacrificar segurança, design e rastreabilidade comercial.

Uma frase:

Do briefing do cliente a um app publicado, auditado e no padrão Samba, com o time no loop e o agente no volante.

4. Problema

Hoje uma software house perde tempo em:

Reescrever o mesmo briefing em issues soltas.

Design inconsistente entre projetos.

Agente de vibe-coding que gera UI bonita e furo de RLS / secret no client.

Escopo que cresce sem aceite.

Handoff quebrado (código sem README, sem testes, sem runbook).

Conhecimento do time preso na cabeça de 2 seniores.

Ferramentas públicas otimizam “uma pessoa sozinha prototipando”. Samba precisa otimizar entrega contratada.

5. Objetivos

P0 — 90 dias

Tempo de um MVP interno (CRUD + auth + 1 integração + deploy) ≤ 1 dia com 1 dev + Builder.

100% dos projetos passam por Plan aprovado + Security Gate antes de URL de cliente.

Design System Samba aplicado por default (tokens, tipografia, componentes).

Código fica em repo GitHub da Samba, não numa sandbox opaca.

P1 — 180 dias

Skills cobrindo Product, Design, Cybersec, Backend, Frontend, QA, DevOps, Discovery.

Portfolio de clientes com isolamento e auditoria.

Score de qualidade automático (a11y, perf, security, design drift).

Reuso de módulos (auth, billing, admin, CMS, filas) como “capabilities”.

Não-objetivos (v1)

Marketplace público tipo Lovable.

Substituir IDE senior (VS Code/Cursor continuam para deep work).

Ser multi-linguagem irrestrito no dia 1 (foco web TS + mobile Expo depois).

Hospedar produção de cliente na infra Samba sem decisão explícita (preferir Vercel/Cloud do cliente).

6. Personas

| Persona                     | Precisa                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| Tech Lead Samba             | Padrões, gates, revisão de risco, templates de stack.                |
| Full-stack                  | Velocidade sem perder controle do git/diff.                          |
| Designer / Product Designer | Tokens, canvas, visual edit, handoff sem Figma eterno.               |
| PM / CS / Comercial         | Escopo, estimativa, status, demo URL, changelog para cliente.        |
| AppSec                      | Threat model, SAST, secrets, dependências, evidência para o cliente. |
| Cliente (indireto)          | Preview autenticado, feedback em contexto, não editar código.        |

7. Princípios de produto

Plan é um artefato contratual, não um chat.

Skills > prompts. O jeito Samba vive em arquivos versionados.

Gates > confiança cega. Publish exige verde em security + smoke test.

Código é o produto. Repo Git, PR, owners.

Cliente isolado. Nenhum contexto de Cliente A vaza no projeto B.

Humano aprova o que é irreversível: schema prod, domínio, secrets, publish, exclusão.

Local-first, cloud-optional. Dyad local; sync Git; CI na nuvem.

Design system é lei, não sugestão.

8. Diferencial central: Samba Skills OS

Skills são pacotes versionados (skills//SKILL.md + scripts + exemplos + checklists) que o agente carrega sob demanda. Inspirado em Replit Skills / Agent Skills, mas com papéis de fábrica.

8.1 Catálogo v1 (embutido)

A. Product & Scope
skill-discovery — entrevista o briefing, gera personas, JTBD, riscos, premissas.

skill-prd — PRD curto no template Samba.

skill-scope-guard — classifica pedido como in-scope / change request / out-of-scope.

skill-estimate — T-shirt + riscos técnicos + dependências de cliente.

skill-acceptance — critérios Gherkin por feature.

B. Design
skill-brand-ingest — lê logo, cores, PDF/Figma e gera tokens.

skill-samba-ds — aplica design system Samba (ou white-label do cliente).

skill-ux-flows — user flows + empty/error/loading states.

skill-visual-qa — contraste, espaçamento 8pt, hierarquia, mobile-first.

skill-copy-ptbr — tom Samba/cliente, microcopy, i18n ready.

C. Architecture & Dev
skill-stack-samba — Next.js ou Vite+React, TS strict, Tailwind, shadcn, Zod, tRPC/ou Route Handlers.

skill-data-model — ERD, migrations, RLS, indexes.

skill-api-design — contratos, erros, idempotência, pagination.

skill-authz — RBAC/ABAC, sessão, refresh, invite.

skill-integrations — Stripe, WhatsApp, ERPs comuns da Samba (via MCP).

skill-observability — logs estruturados, Sentry, healthcheck.

D. Cybersec (não negociável)
skill-threat-model — STRIDE leve por feature.

skill-owasp-asvs-l1 — checklist ASVS aplicado ao diff.

skill-secrets — zero secret no client; .env + vault.

skill-rls-supabase / skill-authz-server — políticas e testes negativos.

skill-supply-chain — lockfile, advisory, pacotes bloqueados.

skill-privacy-lgpd — bases legais, retenção, DSR stub.

E. QA & Release
skill-test-gen — unit + e2e Playwright dos fluxos críticos.

skill-smoke-browser — agente navega happy path.

skill-release — changelog cliente, runbook, rollback.

skill-handoff — README, ADRs, env matrix, quem chama quem.

F. Delivery / Fábrica
skill-client-workspace — pastas, branding, owners.

skill-status-report — resumo semanal automático.

skill-cr-pricing — transforma change request em proposta.

8.2 Como um skill é carregado

Trigger (intenção do usuário ou stage do pipeline)
→ Router escolhe 1–N skills
→ Injeta SKILL.md + exemplos + constraints no system
→ Agente executa tools
→ Emite artefatos (md, code, checklist)
→ Gate valida (schema, tests, security)

Regras:

Skills são Git-versionados no monorepo Samba Builder.

Projeto pode ter samba/skills.override.md (exceções do cliente).

Workspace knowledge (estilo Lovable) define o que vale para todos os clientes Samba.

Project knowledge define o domínio daquele contrato.

9. Jornada principal (happy path)

Novo projeto cliente
Colar briefing / contrato / Figma / marca
Plan mode gera Escopo v0 + perguntas
Humano aprova Plan (gate comercial)
Design Canvas gera 3 direções; escolhe 1
Agent implementa em tasks paralelas
Preview live + visual edits
Security Agent + testes
Tech Lead aprova PR
Publish staging (domínio preview)
Cliente comenta no preview
Promote prod + handoff pack

Cada estágio deixa artefato no repo:

/docs
brief.md
prd.md
scope.md
threat-model.md
design-tokens.json
adr/
/samba
pipeline-status.json
skills.lock

10. Requisitos funcionais

10.1 Workspace de fábrica (além do “app isolado” do Dyad)

Organização Samba com workspaces por cliente.

Projeto pertence a 1 cliente; herda brand kit + contratos de integração.

Papéis: Owner, Tech Lead, Builder, Designer, PM, AppSec, Viewer (cliente).

Isolamento de secrets por projeto (keychain nativo Dyad + vault opcional).

Audit log: quem aprovou plan, publish, override de skill, scan ignorado.

10.2 Modos de conversa (herança Lovable/Dyad/Replit)

| Modo     | Função                                            |
| -------- | ------------------------------------------------- |
| Discover | Só pergunta e estrutura. Zero código.             |
| Plan     | Gera plano, tasks, riscos, stack. Requer Approve. |
| Design   | Canvas, variantes, tokens, visual edit.           |
| Build    | Implementa task aprovada.                         |
| Fix      | Loop de erro/runtime/test.                        |
| Secure   | Threat model + scan + patch.                      |
| Review   | Diff + checklist de factory.                      |
| Ask      | Read-only no codebase (já existe no Dyad).        |

Default após Approve do Plan = Build. Default em repo importado = Ask até o humano pedir Build.

10.3 Planejamento e escopo

Briefing aceita texto, PDF, Notion/Linear (MCP), áudio transcrito, Figma URL.

Output do Plan:

problema, usuários, features Must/Should/Could

out of scope explícito

modelo de dados draft

integrações e dados do cliente pendentes

riscos (LGPD, pagamentos, SLA)

estimativa interna

Qualquer prompt “adiciona X” depois do Approve passa no Scope Guard:

in-scope → task

cinza → PM confirma

fora → cria CR

10.4 Design incrível (requisito explícito)

Não basta Tailwind genérico.

Design System Engine
Tokens: color, type, space, radius, shadow, motion.

Biblioteca Samba UI (wrapper shadcn) + tema por cliente.

Componentes obrigatórios: Button, Input, Table, Dialog, Toast, EmptyState, PageHeader, DataFilter.

Proibido o agente inventar componente se já existe no DS (skill bloqueia).

Design Canvas (Replit)
Gerar 3–5 direções de home/dashboard.

Aplicar direção escolhida como source of truth.

Visual edits no preview (Lovable): texto, cor, spacing, copy — sem nova geração pesada.

Visual QA automático
Screenshot mobile/desktop.

Checagens: contraste WCAG AA, overflow, tap target 44px, alinhamento à grid 8pt.

Drift: se o agente sair do token, o Review mode marca “design violation”.

Brand ingest
Upload de logo + URL do site do cliente → extrai paleta e tipografia.

Humano confirma tokens antes do Build.

10.5 Runtime e desenvolvimento (Bolt + Dyad)

Manter o que o Dyad já faz e fechar o loop estilo Bolt:

Preview local confiável + logs de server/browser visíveis ao agente.

File tree + diff por turno obrigatório.

Terminal controlado (allowlist de comandos).

Auto-fix quando preview quebra ou typecheck falha.

Checkpoints Git a cada task concluída (Replit).

Import brownfield (já no Dyad) + geração automática de project knowledge e AGENTS.md.

Stack default Samba (configurável por knowledge):
Front: React 19 + TS + Vite ou Next.js App Router

UI: Tailwind + Samba UI (shadcn)

Validação: Zod

Backend: Supabase ou Postgres + Drizzle (cliente enterprise sem Supabase)

Auth: Supabase Auth ou Better Auth

Testes: Vitest + Playwright

CI: GitHub Actions template Samba

10.6 Agentes e orquestração

Orchestrator\*\* (modelo forte): planeja, escolhe skills, resolve conflitos.

Subagents\*\* (modelo barato/médio): UI, schema, tests, copy, security, docs — em paralelo.

Merge com resolução de conflito automática + review humano se overlap em arquivos críticos (schema, auth, rls).

Fila de prompts (Lovable) para o PM empilhar pedidos sem interromper o build.

Model routing: Discover/Plan/Secure → modelo frontier; Build bulk → modelo rápido; Visual → multimodal.

10.7 Segurança (requisito de fábrica)

Pipeline obrigatório, inspirado em Lovable + Replit Security Agent, adaptado a cliente brasileiro:

S0 — Prevent
Secrets scanning no chat e nos arquivos.

Blocklist de pacotes + consulta de advisory na instalação.

Consentimento de MCP (já no Dyad) + allowlist Samba de servers.

Prompt-injection guard em conteúdo do cliente (PDF/site).

S1 — Basic scan (rápido, no preview e no publish)
Secrets no repo

RLS ausente / políticas permissivas

Endpoints sem auth

CORS aberto

Dependências com CVE alta/crítica

Headers de segurança ausentes

S2 — Deep scan (agentic)
Threat model da feature

AuthZ quebrada (IDOR, role bypass)

Injecção / XSS / SSRF nos pontos tocados

Upload inseguro

PII em log

LGPD: base legal não documentada para dado pessoal

S3 — Gate
Crítico bloqueia publish.

Alto exige waiver do AppSec com justificativa.

Auto-fix só em findings “safe” (headers, RLS template, dependency bump com testes verdes).

Security memory por projeto (o agente não reabre o que foi aceito com contexto).

S4 — Evidência para cliente
Relatório security-report.md + data do scan.

Página “controles ativos” por app (o Lovable já vende isso para enterprise).

10.8 Qualidade e testes

A cada task: typecheck + unit dos módulos tocados.

A cada feature Must: Playwright do acceptance criterion.

Agente de browser (Lovable/Replit) roda happy path no preview.

Flaky test não conta como verde.

Coverage não é vaidade: exigir testes nos caminhos de auth, pagamento e PII.

10.9 Git, review e handoff

Repo GitHub da org Samba (two-way sync).

Branch por feature/task do Plan.

PR automático com:

resumo humano

skills usadas

scans

screenshots

risco Scope Guard

Template de handoff: env, runbook, owners, débitos, backlog de CR.

Cliente não recebe acesso ao editor por default — só preview comentado.

10.10 Integrações (MCP first)

Dyad já é MCP client. Samba Builder padroniza um Hub interno:

Must-have v1: GitHub, Figma, Linear/Jira, Slack, Supabase, Vercel, Stripe, Notion, 1Password/Vault.

v1.1 verticais Samba: WhatsApp Business, ERPs/recorrentes do portfólio.

Toda tool MCP externa exige:

allowlist

consentimento persistente por servidor

redaction de secrets no log

registro no audit

10.11 Preview para cliente

URL staging com auth Samba ou magic link.

Comentário pinado no componente (tipo preview review).

Comentário vira task classificada pelo Scope Guard.

Sem “Remix público” — projetos são privados por default.

11. Requisitos não funcionais

| Tema                       | Meta                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Latência do preview        | Hot reload < 2s no projeto médio                                                    |
| Tempo Plan v0              | < 3 min para briefing de 2 páginas                                                  |
| Isolamento                 | Zero vazamento cross-client no contexto do modelo (system + RAG particionado)       |
| Disponibilidade            | App desktop local funciona offline para edição; LLM cloud opcional; Ollama fallback |
| Observabilidade do Builder | Toda ação de agente tem trace: skill, tools, tokens, files                          |
| Custo                      | Budget por projeto; routing de modelo; alerta 80%                                   |
| Compliance                 | LGPD no Builder e no app gerado; dados de cliente não treinam modelo terceiro       |
| Portabilidade              | Sair do Builder = repo + docs + CI. Zero runtime proprietário obrigatório           |
| Performance do app gerado  | Lighthouse mobile ≥ 80 no template Samba                                            |

12. Arquitetura proposta em cima do Dyad

┌──────────────────────────────────────────────┐
│ Samba Builder Desktop (fork Dyad / Electron)│
│ UI: Plan • Canvas • Preview • Diff • Gates │
└──────────────┬───────────────────────────────┘
│
┌─────────┴─────────┐
│ Orchestrator │ skills router + modes
│ Subagent pool │
└─────────┬─────────┘
│
┌─────────┼──────────┬────────────┐
│ Tools │ MCP Hub │ Runtime │ Git
│ Dyad │ Samba │ Preview │ GH
│ files, │ Figma, │ (Vite/Next)│
│ grep, │ Linear, │ logs/term │
│ sql │ Vault │ Playwright │
└─────────┴──────────┴────────────┘
│
Factory Control Plane (opcional, self-host)
workspaces • audit • skill registry • billing tokens

Aproveitar pastas do Dyad:

rules/ → Samba Knowledge + lints de geração

scaffold/ → templates de produto (SaaS, portal, landing, admin, marketplace)

makers/ → geradores de módulo

.agents/ + AGENTS.md → papéis

workers/ → scans, visual QA, indexação

src/pro só se a licença FSL permitir o uso interno; skills e factory layer ficam fora de src/pro, em Apache 2.0 interno

Recomendação legal: manter fork do core Apache visível internamente; features Samba em pacote packages/samba-factory para não misturar com FSL.

13. Templates de produto (scaffolds)

Cada scaffold já nasce com skills, RLS, DS e testes:

Portal B2B — auth, roles, tabelas, export CSV.

SaaS multi-tenant — orgs, billing Stripe stub, admin.

Landing + CMS leve — SEO, formulário, LGPD.

Ops / backoffice — filas visuais, auditoria.

App com WhatsApp — inbox + webhooks.

Headless storefront (fase 2).

O agente não começa do zero se o Plan casar com um scaffold.

14. UX do Builder (telas)

Home fábrica — clientes, projetos, gates vermelhos, custo de tokens.

Brief — drop zone + perguntas do skill-discovery.

Plan board — Kanban Must/Should/Could + Approve.

Canvas — variantes de UI.

Studio — chat + preview + file tree + diff (layout 3 colunas).

Visual edit overlay no preview.

Security center do projeto + do workspace Samba.

Client preview (modo limitado).

Release — checklist, changelog, promote.

Tom da UI do Builder: sóbrio, denso, “tool de time”, não landing de vibe-coding. Português nativo. Atalhos de teclado para dev.

15. Métricas de sucesso

Fábrica
Lead time briefing → staging

% projetos com Plan aprovado antes do 1º commit de feature

% publishes bloqueados por gate (e % depois corrigidos sem waiver)

Retrabalho pós-demo (comentários cliente que eram in-scope vs CR)

NPS interno do time Samba

Tokens / feature Must

Qualidade
Findings críticos em prod = 0

Design violations abertas

Tempo médio de PR review humano

Cobertura dos fluxos Must por e2e

Comercial (indireto)
Margem por projeto

Ciclo de CR precificado

Reuso de módulo (% de código gerado vindo de scaffold/skill)

16. Roadmap

Fase 0 — Fundar (2–3 semanas)
Fork Dyad, branding Samba Builder, org Git.

Knowledge workspace Samba + stack default.

Scaffold Portal B2B.

Modo Plan com Approve persistido no repo.

Diff obrigatório + checkpoint Git.

Fase 1 — Fábrica mínima viável (6–8 semanas)
Skills: discovery, prd, scope-guard, samba-ds, stack-samba, rls, secrets, release.

Visual edits no preview.

Basic security scan + gate de publish.

Preview URL + GitHub two-way.

Isolamento por cliente (workspaces).

Fase 2 — Qualidade de design e segurança (6 semanas)
Design Canvas + brand ingest + visual QA.

Security Agent deep + security memory + relatório cliente.

Playwright gen + browser smoke.

Subagents paralelos (UI / data / tests).

Fase 3 — Operação de software house (8 semanas)
Papéis, audit, waivers.

Client comment → task.

Hub MCP Samba + Linear/Slack.

Status report e CR pricing.

Model routing + budget por projeto.

Control plane interno (portfolio).

Fase 4 — Escala
Mobile Expo.

Capabilities MCP dos apps entregues (Lovable “apps for agents”).

Biblioteca interna de módulos versionados.

Fine-tune/eval interno nos diffs Samba (offline).

17. Regras de geração (constraints permanentes)

Colocar em workspace knowledge e reforçar nos skills:

TypeScript strict, zero any novo.

Nenhum secret em código ou prompt logado.

Nenhuma tabela pública sem RLS.

Nenhuma action de escrita sem authz server-side.

Componentes só do Samba UI, salvo waiver.

PT-BR default na UI do cliente, i18n keys desde o dia 1 se o contrato for multilíngue.

Toda feature Must nasce com critério de aceite e teste.

Não inventar lib se o stack Samba já tem equivalente.

Não “melhorar o escopo” sem Scope Guard.

Commits atômicos, mensagens em pt ou conventional commits (decidir e travar).

18. Riscos e mitigações

| Risco                    | Mitigação                                                     |
| ------------------------ | ------------------------------------------------------------- |
| Agente ignora skills     | Eval suite: 50 briefings Samba; falha se violar RLS/DS.       |
| Custo de tokens explode  | Routing + budget + Plan curto + visual edit sem LLM.          |
| Licença FSL do src/pro   | Factory layer separado; usar só APIs Apache.                  |
| Brownfield vira bagunça  | Import gera knowledge + Ask-first + testes de caracterização. |
| Cliente cola PII no chat | DLP no input (e-mail, CPF, cartão) + redaction.               |
| Falsa segurança do scan  | Gate + AppSec humano em pagamento/saúde/financeiro.           |
| Design “genérico IA”     | Tokens + canvas + visual QA + ban de paletas default.         |
| Lock-in Samba Builder    | Repo padrão é a fonte da verdade.                             |

19. Brief de implementação para o time (próximos commits)

Criar packages/samba-factory no fork.

Adicionar pasta skills/ com os 8 skills P0 e um SKILLS.md de roteamento.

Implementar modes: Discover | Plan | Build | Secure com system prompts distintos.

Persistência docs/plan.md + status approved_by.

Hook pré-publish: typecheck + basic scan.

Scaffold portal-b2b com Samba UI tokens.

Painel simples de cliente/projeto (mesmo local/SQLite do Dyad no início).

Eval: um briefing real anonymizado da Samba rodado a cada PR do Builder.

20. Definição de pronto (v1)

Samba Builder v1 está pronto quando um dev Samba consegue:

Criar projeto no workspace do cliente X.

Soltar um briefing real.

Aprovar um Plan com Must/Should/Could.

Sair com app no DS Samba, auth, 1 entidade de negócio, preview no ar.

Ver o Security Gate vermelho se RLS estiver faltando — e o agente corrigir.

Abrir PR no GitHub com docs de handoff.

Mostrar URL de staging para o cliente sem expor o editor.

Se qualquer um desses sete passos exigir ferramenta fora do Builder (exceto GitHub/Vercel), a v1 ainda não acabou.

Se quiser o próximo artefato, o mais útil na sequência é um de estes três: (1) SKILL.md completo dos 8 skills P0, (2) spec da Samba UI / tokens, ou (3) mapa de arquivos no fork Dyad (packages/samba-factory) já no formato de issues.
