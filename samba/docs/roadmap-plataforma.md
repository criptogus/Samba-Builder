# Roadmap Samba Builder — Plataforma de Engenharia Governada por IA

> **Posicionamento:** o sistema operacional para software houses e empresas criarem produtos digitais premium com agentes de IA, contexto do cliente e governança humana. Local-first/BYOK, pt-BR, qualidade por padrão.
>
> **Tese de diferenciação:** velocidade **com evidência** — não competir por "mais IA" (modelos, agentes, conectores), e sim por **resultado, confiança e repetibilidade**. A unidade de valor não é "código gerado"; é a **entrega que passou por gates**.

_Fonte da visão: análise estratégica (2026-09) — SIG State of Software 2026 (dívida técnica/segurança × IA), WebAIM Million 2026 (a11y em código gerado), CSA/NIST AI Agent Standards (identidade e governança de agentes), Koder enterprise access controls. Contexto completo no histórico da sessão._

---

## O problema que justifica a plataforma

Coding AI sem controles acelera **dívida técnica, risco de segurança e custo operacional** (SIG: ~2× violações de segurança vs código humano; produtividade some após ~100k linhas; governança fraca amplifica o dano). Código gerado falha em a11y por padrão (84% dos sites gerados com ChatGPT têm violações WCAG; modelos reproduzem a mediana da web). Agentes enterprise precisam de identidade, autorização e trilha — não existem padrões NIST prontos até ~late 2026, então **governança interna é o diferencial agora**.

Implicação: o Samba não "gera apps" — **opera uma célula de engenharia sob supervisão**, com padrão de entrega executável, mensurável e difícil de burlar.

---

## Os cinco pilares (com mapa feito × falta na main)

### P1. Sistema de qualidade executável — `DeliveryEvidence`

**Unidade de valor:** toda feature acumula um evidence pack automático (requisito, arquivos afetados, testes executados, autorização de ops sensíveis, varredura de segredos/dependências, screenshots, a11y, score visual, performance, diff explicado, aprovação humana vinculada à versão exata).

**Já na main:**

- `src/delivery/model.ts` — `DeliveryTaskSchema` (acceptance, evidence), `DeliveryPlanSchema`, `qualityAreas`, estágios briefing→delivered; política de engenharia com perfil **public/private/critical** (= classificação de risco).
- `src/delivery/quality.ts` — `QualityKindSchema` (secrets, dependencies, accessibility, performance, visual), `RequirementSchema` (codePaths, testExecutionId), `EngineeringPolicySchema` (requisitos, pico de usuários, disponibilidade, recuperação).
- `src/ipc/services/test_evidence.ts` — execuções de teste persistidas (`projectTestExecutions`), resumo com falhas de infraestrutura não mascaradas.
- UI: `EngineeringPanel`, `ProjectDeliveryPanel`, `DeliveryTestEvidence`, `GovernancePanel`, `DesignSystemDialog`, `FoundationReview` (PRD/ARCHITECTURE/TECH_STACK/DESIGN_SYSTEM/TESTING/OPERATIONS).
- Skills da rodada 2026-09-08 (`6271f450`) = Samba Delivery Standard (Design Excellence, Architecture Fitness, Security by Design, PRD-contrato, Quality Engineering, Governance, Observability, Scope Guard, Art Direction, Delivery/operação).

**Falta (gaps reais):**

1. **Objeto de domínio `DeliveryEvidence` consolidado e persistido por entrega** — hoje evidência é campo de texto solto (`DeliveryTaskSchema.evidence: string`); falta o pacote estruturado (JSON/YAML) ligado a tarefa, plano, branch, commit, PR, ambiente e responsável.
2. **Gates que impedem avanço** — "não aceitar 'parece pronto'": merge/deploy bloqueados quando gate obrigatório ausente; evidência proporcional à classificação de risco (public/private/critical).
3. **Dossiê de entrega legível** — relatório consolidado por projeto (cliente + time técnico), exportável.
4. **Score visual ≥80 como condição** de "pronto para revisão de cliente" (P2 abaixo).

### P2. Excelência visual mensurável — Samba Visual Review

**Já na main:** skills Design Excellence + Art Direction (direção dominante por tipo de produto, proibições "cara de IA", rubric 0-100 com 5 blocos e pesos, gate de screenshots em 3 breakpoints + estados); a11y no rubric (15%).

**Falta:**

1. **Checagens determinísticas de a11y/contraste/labels em toda build** (não só auditoria esporádica — LLM self-review sub-relata teclado/ARIA; só loop com checker externo melhora de fato).
2. **Pipeline de screenshot review** desktop/tablet/mobile + estados (empty/loading/error/permission/offline/sucesso) como evidência no pack.
3. **Samba Visual Review** como checklist executável por tela (hierarquia, identidade, consistência de tokens, estados, responsividade, a11y, motion, densidade — tabela da visão) com nota <80 → iterar com observações concretas.

### P3. Arquitetura adaptativa — Samba Architecture Map

**Já na main:** skill Architecture Fitness (monólito modular default, módulos por domínio, regra de ouro anti-acoplamento, defaults por necessidade, ADRs, anti-imports-cruzados); foundation `ARCHITECTURE.md` exigido pelo delivery model.

**Falta:**

1. **Mapa de arquitetura vivo por projeto** — domínios, dependências, contratos, ADRs, hotspots (acoplamento, duplicação, ciclos, APIs não versionadas, dívida conhecida) — gerado e atualizado a cada entrega relevante.
2. **Score de arquitetura** (acoplamento, duplicação, ciclos, cobertura de módulos críticos).
3. **Evolução por telemetria** — sinais (latência, módulo acoplado, fila crescendo, tabela sem índice, regressões recorrentes) abrem proposta de melhoria com evidência; refatoração de alto impacto nunca silenciosa.

### P4. Governança enterprise que funciona — na trilha de execução

**Já na main:** GovernancePanel (papéis/aprovações), política de engenharia por perfil de risco, modo auto com consentimento/checkpoints (D3-D5: task/parallel/autonomy, orçamento), guard de segredos (chave nunca em campo errado, deep-merge anti-perda), regra "nunca detectar custom por prefixo" documentada, BYOK com chaves do usuário só em userData.

**Falta (Fase 2 — "empresa pronta"):**

1. Organizações/workspaces com isolamento por tenant.
2. SSO (SAML/OIDC) + SCIM; RBAC por ações×recursos×ambientes; agente como identidade (sem credencial compartilhada); separação dev/staging/prod; aprovação em 2 níveis para alto risco; credenciais curtas e escopo mínimo.
3. Audit log append-only exportável (SIEM) — cadeia: humano solicitou → agente atuou → modelo/versão de prompt → dados lidos → ferramentas autorizadas → credencial (referência) → código/config alterado → ambiente → testes/gates → quem aprovou → política vigente → como reverter.
4. Kill switch, revogação de sessão, controle de egress, políticas por setor (LGPD, saúde, financeiro).

### P5. Avaliação contínua — Samba Eval Lab

**Já na main:** benchmark D2 (roadmap-devin) — execução de benchmark com verificação do repo.

**Falta:**

1. Conjunto de tarefas sintéticas/anonimizadas em 6 classes (produto, engenharia, segurança, enterprise, operação, IA) com métricas por classe.
2. Métricas de produto: sucesso funcional e **seguro** na 1ª tentativa (secure-correctness — correção funcional ≠ correção de segurança), regressões/mudança, tempo humano de revisão, loops até aceite, score a11y/visual, custo/tarefa, bloqueio correto vs falso, tempo de rollback.
3. Ataques realistas no benchmark: prompt injection indireta, envenenamento de contexto, execução inesperada de código, tool misuse.

---

## Fases de execução

### Fase 1 — "Entrega confiável" (em andamento; ~60% na main)

Critério de saída: **toda entrega sai com dossiê verificável**, não só código.

Backlog priorizado (gaps de P1-P3 acima):

1. `DeliveryEvidence` estruturado e persistido (schema + serviço + UI do dossiê).
2. Gates por perfil de risco (public/private/critical) — bloqueio real de merge quando gate ausente.
3. Screenshot review + a11y determinística na build (checker externo, não self-review).
4. Samba Visual Review com score ≥80.
5. Architecture Map vivo + score de arquitetura.
6. Relatório de entrega exportável (markdown/PDF) — cliente + técnico.

### Fase 2 — "Empresa pronta" (P4 completo)

Critério de saída: cliente corporativo rigoroso responde "sim" a segurança/compliance/auditoria no procurement (testar a cadeia IdP→efeito final, não só feature sheet).

### Fase 3 — "Fábrica autônoma" (P5 + orquestração)

Critério de saída: delegação de trabalho grande sem perder confiança — subagentes por especialidade (arquiteto, design, segurança, QA, SRE, revisão), paralelização condicionada a análise de dependências, orçamento por plano, aprendizado por organização com aprovação humana.

---

## A decisão (o que NÃO fazer)

- Não adicionar "mais IA" por adição (modelos/conectores/autonomia) — commodity.
- Não tentar vencer IDEs em autocomplete nem builders em velocidade bruta.
- Não lançar dezenas de conectores simultaneamente.
- Microserviços prematuros: proibidos — monólito modular é o default.
- LLM como única fonte de verdade em avaliação visual/segurança: proibido — sempre casar com checagem determinística.

**O Samba ganha sendo a plataforma que sabe quando NÃO agir, mostra evidências, respeita políticas, entrega estética própria e gera base evolutiva** — autonomia prática + qualidade de design + engenharia sustentável + confiança corporativa.

---

## Métricas da plataforma (acompanhar por cliente/time/tipo de tarefa)

Sucesso funcional 1ª tentativa · sucesso **seguro** 1ª tentativa · regressões/mudança · tempo humano de revisão · loops até aceite · cobertura/eficácia de mutação · score a11y · score visual · custo por tarefa · bloqueios corretos vs falsos · tempo de rollback · satisfação (dev, designer, cliente).
