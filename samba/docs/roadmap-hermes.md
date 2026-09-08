# Roadmap Samba Builder — "O dev descreve; a plataforma aprende"

> Documento de produto · visão de evolução para um software completo, inteligente,
> auto-evolutivo e com RAG — o "sistema nervoso" do Hermes aplicado ao desenvolvimento
> de software para clientes.
> Formato: roadmap por **outcomes** (impacto mensurável), não por lista de features.
> Dono: Gustavo Caetano · Revisão: a cada ciclo de projeto.

---

## 1. Visão (o norte)

Hoje o Samba Builder é um gerador de apps muito bom: o dev descreve, a plataforma
constrói, testa e publica — com governança, design system, plugins e BYOK.

A visão é um passo além: **cada projeto deixa a plataforma mais capaz**. O Samba
Builder deve ter o que o Hermes tem por baixo:

- **memória** — lembra do projeto e do cliente entre sessões;
- **conhecimento na hora certa** — o Córtex (RAG) entra no fluxo do agente sem o dev pedir;
- **aprendizado contínuo** — lições de um projeto viram skills reutilizáveis no próximo;
- **melhoria automática com dono** — o sistema propõe a própria evolução, o humano aprova;
- **vigilância** — rotinas de manutenção rodam sozinhas, o dev só é acordado para decisão;
- **qualidade medida** — toda entrega tem score; o score alimenta o aprendizado.

**Em uma frase:** o dev descreve o negócio; a plataforma constrói, entrega **e
evolui** — e fica mais inteligente a cada projeto, sem nunca depender de um
backend gerenciado (BYOK e local-first, como o Córtex).

---

## 2. O que "estilo Hermes" significa (os mecanismos)

| #   | Mecanismo                   | O que faz                                                           | No Hermes                                                   | No Samba Builder hoje                                                                  |
| --- | --------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | **Memória persistente**     | Fatos entre sessões, com orçamento e consolidação                   | MEMORY/USER injetados em todo turno; consolida quando enche | ❌ agente esquece tudo entre sessões                                                   |
| 2   | **Skills procedurais**      | Conhecimento carregado por relevância, criado/atualizado com lições | skill_manage: criar, patch, evoluir                         | 🟡 `samba/skills/` + evolve.py v1 (feedback JSONL → propostas) — sem injeção no agente |
| 3   | **RAG/vault**               | Conhecimento recuperado no contexto, não tudo                       | Córtex (vault Obsidian, 55k+ docs)                          | 🟡 Córtex roda + MCP conectado — agente **não consulta** no fluxo                      |
| 4   | **Automação (cron)**        | Jobs: briefings, watchdogs, health, ingestão                        | cronjob (diário, watchdogs, evals)                          | ❌ nada no produto                                                                     |
| 5   | **Delegação**               | Subagentes isolados com contexto                                    | delegate_task                                               | ✅ implementer/explorer/PM coach                                                       |
| 6   | **Evals + observabilidade** | Medir o agente; feedback fecha o loop                               | agent-evaluation diário, LLM-as-judge, telemetria de sessão | 🟡 gates de qualidade no fluxo dev; sem telemetria de sessão                           |
| 7   | **Auto-evolução governada** | Mudanças propostas → aprovação → versionadas                        | skills evoluem com lições; contribuição ao OSS              | 🟡 governança pronta (gate.py/GitHub) — não ligada à evolução                          |

Legenda: ✅ pronto · 🟡 parcial (falta fechar o loop) · ❌ não existe

---

## 3. Inventário honesto (o que já temos, para não reconstruir)

**Pronto e validado:**

- Fork Samba rebrandado, BYOK puro, zero backend gerenciado, zero Pro/upsell na UI
- Providers: DeepSeek direto (chave `sk-`) conectado e funcionando ponta a ponta
- MCP: 4 plugins ativos (Composio, Playwright, cua-driver, **Córtex**)
- Córtex: RAG local `127.0.0.1:8899` — vault 55k+ docs, 1.773 knowledge units, design system, KG
- Subagentes no Build: implementer, explorer, PM coach (Codex), meeting briefings (Codex)
- Skills no app: `samba/skills/` + `evolution/evolve.py` (agrega feedback JSONL → propostas com aprovação humana; testado)
- Learning loop v1: `samba/learn/learn.py` (relatório → 00-Inbox → memória do Córtex)
- Governança: single/governed, `gate.py` (submit/approve/veto/audit com hash encadeado), adapter GitHub real
- Design System Toolkit (extract/save/list/apply), templates de projeto (Codex)
- GitHub nativo (device flow, import/sync), cloud publishing (Vercel/AWS — Codex)
- Software-factory (jeito Samba) mapeada em skills do Hermes

**O fio que falta (tudo gira em torno de 3 lacunas):**

1. **O agente não usa o Córtex sozinho** — retrieval é manual (o dev pede).
2. **Não há memória entre sessões** — decisões e preferências morrem com a conversa.
3. **As lições não voltam para o agente** — evolve.py existe, mas nada coleta as lições
   automaticamente e nada injeta skills no prompt do agente.

Fechar essas 3 lacunas é o coração do roadmap; o resto é automação e medida em cima.

---

## 4. Pilares → Outcomes

### P0 — Conhecimento no fluxo: "o Córtex é o cérebro, não um anexo"

**Outcome:** em 90 dias, todo projeto gerado nasce com uma knowledge base por
cliente e o agente consulta o Córtex **automaticamente** no início de cada tarefa
relevante — o dev nunca precisa pedir.

**Por quê:** retrieval automático é pré-requisito de memória (P1) e de aprendizado
(P2). Sem ele, o conhecimento existe mas não trabalha.

**Como medir:** % de turnos de Build com ≥1 consulta ao Córtex; latência de setup
de contexto < 2s; custo de contexto controlado (orçamento de tokens por turno).

**Fases:**

- P0.1 Mapear as tools do MCP Córtex (units/search/kg/design-system) contra os
  tipos de tarefa do agente (feature nova, bug, design, onboarding).
- P0.2 Regra no prompt do agente: quando a tarefa menciona projeto/cliente/domínio/
  stack, buscar units do Córtex antes de responder (com fallback se o MCP cair).
- P0.3 Auto-indexação pós-commit: cada app gera/atualiza units por cliente
  (decisões, arquitetura, design system aplicado) — reusa `samba/learn/learn.py`.
- P0.4 UI "Córtex" no app: o dev vê o que a plataforma sabe do projeto dele e
  corrige na hora (fonte da verdade humana).

**Dependências:** nenhuma (Córtex já roda). **Desbloqueia:** P1, P2, P3.

---

### P1 — Memória persistente: "o Samba Builder lembra entre sessões"

**Outcome:** o dev volta 3 semanas depois, abre o projeto e o agente já sabe as
decisões, preferências de stack/design e pendências — sem reexplicar nada.

**Por quê:** hoje cada sessão começa do zero; o dev paga o custo de contexto toda
vez (e o cliente percebe). Memória é o que transforma uma ferramenta em um
**parceiro de desenvolvimento**.

**Como medir:** eval de 10 cenários de follow-up (perguntas respondidas sem
reexplicação); % de prompts que repetem contexto já dado; tempo de retomada < 1 min.

**Fases:**

- P1.1 Schema de memória por projeto (decisões, preferências, fatos do cliente,
  pendências) + por produto (jeito Samba, convenções) — **declarativo, não
  instrucional** (lição do Hermes: fatos, não ordens).
- P1.2 Escrita automática ao fim de cada turno: extrair decisões/preferências do
  que aconteceu (mesmo pipeline do P2 — um só extrator de fim-de-turno).
- P1.3 Consolidação com orçamento: quando a memória enche, funde/descarta o
  obsoleto (nunca cresce sem limite).
- P1.4 Injeção por projeto no system prompt do agente (seção "Contexto do projeto"
  curta; o resto via retrieval do Córtex — P0).

**Dependências:** P0 (retrieval para o que não cabe na memória injetada).

---

### P2 — Skills que evoluem: "cada projeto ensina o próximo"

**Outcome:** 80% das lições de um projeto viram skill/utilidade reutilizável no
projeto seguinte **automaticamente** — com aprovação de 1 clique, sem o dev
escrever nada.

**Por quê:** é o mecanismo mais valioso do Hermes: o conhecimento vive fora do
código do agente, é carregado só quando relevante e **melhora com o uso**. É o
que faz o Samba Builder ficar melhor para o cliente N+1 sem tocar no motor.

**Como medir:** skills criadas/atualizadas por projeto; taxa de aprovação humana;
tempo lição → skill disponível < 24h; eval A/B (com skill vs sem skill) com
tendência positiva.

**Fases:**

- P2.1 Coleta automática: fim de turno → extrair lições (erros evitados, atalhos,
  preferências do cliente, pegadinhas da stack) → `samba/skills/feedback/*.jsonl`.
- P2.2 Proposta automática: `evolve.py` (já existe) agrega → propõe skill nova ou
  patch — com **aprovação humana obrigatória** (regra já desenhada).
- P2.3 **Injeção real no agente** (a decisão que ficou aberta): skills relevantes
  entram no contexto do agente por tipo de tarefa — princípios no system prompt +
  AGENTS.md/DESIGN.md por app + catálogo com roteamento (frontend/backend/game/
  governança/design system).
- P2.4 Auto-teste: antes de ativar uma skill, eval A/B em tarefa padrão (método do
  Hermes: medir discriminação; descartar skill que não muda o resultado).

**Dependências:** P0 (retrieval para achar a skill certa na hora).

---

### P3 — Auto-evolução governada: "o sistema melhora a si mesmo, com dono"

**Outcome:** melhorias propostas automaticamente a partir de padrões de uso e erro
viram propostas revisáveis (submit → approve, governança existente) — o dev
aprova em 1 clique, e nada entra em produção sem aprovação.

**Por quê:** é a diferença entre "software que roda" e "software que se cultiva".
Com a governança já pronta (gate.py + GitHub), falta a **fonte de propostas**.

**Como medir:** propostas geradas/semana; taxa de merge; regressões evitadas
(propostas que pegaram bug antes do cliente).

**Fases:**

- P3.1 Telemetria local de sessão: erros, ferramentas usadas, duração, modelos,
  outcomes — **só local, nunca exfiltrar dado de cliente** (princípio).
- P3.2 Analisador semanal (cron — P5): padrões de erro/fricção → propostas de
  melhoria com evidência (log, repro, impacto estimado).
- P3.3 Integração com a governança: proposta = draft → submit → approve humano →
  merge (gate.py; espelho em PR do GitHub).
- P3.4 Regra dura: **evolução do código do produto é governada e nunca silenciosa**;
  evolução do conhecimento (P2) é rápida; as duas com trilha auditável.

**Dependências:** P5 (cron) + P4 (medida — não melhorar às cegas).

---

### P4 — Qualidade medida: "o Samba Builder sabe quando entregou bem"

**Outcome:** toda entrega tem score de qualidade automático (LLM-as-judge contra o
requisito) antes do deploy — e o score alimenta o aprendizado (P2/P3).

**Por quê:** sem medida, "melhora sempre" é opinião. O score vira a moeda do
feedback: skill boa = score sobe; mudança ruim = score cai.

**Como medir:** correlação score × satisfação do cliente nos pilotos; % de deploys
com score acima do limiar do cliente; tendência do score médio por projeto.

**Fases:**

- P4.1 Rubric do jeito Samba: bonito, elegante, rápido, inovador, simples, seguro
  (já é o DNA — falta formalizar como rubric de judge).
- P4.2 Judge automático no fim do fluxo (gates da software-factory): requisito vs
  resultado, testes, design, segurança, usabilidade — com evidências citadas.
- P4.3 Score no relatório de entrega (vira selo no deploy) e no feedback do Córtex.

**Dependências:** nenhuma (dá para começar amanhã). **Desbloqueia:** P3 (medida).

---

### P5 — Automação e vigilância: "a plataforma cuida da rotina"

**Outcome:** o Samba Builder roda sozinho os ciclos de manutenção (deps seguros,
health do projeto, ingestão de conhecimento, análise semanal) e só acorda o dev
quando há decisão — pró-ativo sem ruído.

**Por quê:** o valor corporativo está em o time não gastar tempo com rotina. É o
cron do Hermes aplicado ao projeto do cliente.

**Como medir:** horas de dev economizadas/semana (estimadas por relatório);
incidentes detectados antes do cliente; notificações por semana (alvo: < 3).

**Fases:**

- P5.1 Cron local por projeto: health checks (build/testes/deps desatualizadas),
  updates seguros (patch), ingestão Córtex pós-commit.
- P5.2 Watchdogs: preço/quota dos providers BYOK, erros recorrentes no log do app,
  falha de MCPs — alertam só na mudança (watchdog do Hermes: alerta no estado, não no tempo).
- P5.3 Notificação seletiva (Telegram/e-mail): decisão humana só no que exige
  julgamento; o resto vira relatório passivo.

**Dependências:** infra de cron (barata, local). **Desbloqueia:** P3 (analisador semanal).

---

### P6 — Conhecimento corporativo: "o time aprova o que a plataforma aprende"

**Outcome:** em um projeto governado (empresa), devs + tech lead + negócio veem e
aprovam o que a plataforma aprendeu do cliente — evolução de skills espelhada em
PR do GitHub, com papéis (quem aprova skill do time) e compliance.

**Por quê:** é o que destrava a venda corporativa: o cliente precisa auditar o
conhecimento que a ferramenta acumula sobre o negócio dele.

**Como medir:** adoção no piloto corporativo; 100% das mudanças de conhecimento
auditáveis (hash chain da governança aplicada a skills); zero exfiltração de dado
de cliente (auditoria).

**Fases:**

- P6.1 Espelhar evolução de skills/conhecimento no GitHub (PR revisável) — mesmo
  mecanismo que a governança já usa para código.
- P6.2 Papéis de conhecimento: quem aprova skill do time (tech lead), quem vê o
  que foi aprendido (negócio), o que é só do projeto (privado).
- P6.3 Compliance por padrão: conhecimento do cliente fica na máquina/ambiente do
  cliente; aprendizado cross-cliente só anonimizado e opt-in.

**Dependências:** P2 (skills evoluindo de verdade) + governança (pronta).

---

## 5. Métricas do roadmap (como sabemos que chegou no "estilo Hermes")

| Métrica                                       | Hoje               | Alvo (12 meses)                            |
| --------------------------------------------- | ------------------ | ------------------------------------------ |
| Setup de projeto novo (idea → app rodando)    | horas              | < 30 min com reuso de projetos anteriores  |
| Retomada de projeto (abrir → contexto pronto) | reexplicar tudo    | < 1 min, zero reexplicação                 |
| Lições → skill disponível                     | manual/inexistente | < 24h, 80% automático                      |
| Score de qualidade por entrega                | inexistente        | toda entrega com score; tendência positiva |
| Manutenção de rotina (deps/health)            | manual             | 100% automática, dev só decide             |
| Ciclo projeto → deploy (cliente)              | dias               | horas                                      |
| Intervenção humana                            | a cada passo       | só decisão (aprovar/redirecionar)          |

---

## 6. Sequência crítica (o caminho, não a lista)

```
Agora ──► P0  Conhecimento no fluxo (Córtex automático)     [destrava P1/P2]
        ──► P1  Memória persistente      ┐ mesmo pipeline de
        ──► P2  Coleta de lições         ┘ fim-de-turno (um extrator só)
        ──► P4  Rubric + score (medida)  [pode começar em paralelo]
        ──► P5  Cron/vigilância          [infra barata, destrava P3]
        ──► P3  Auto-evolução governada  [só com P4 medindo]
        ──► P6  Conhecimento corporativo [contínuo, sobre a governança pronta]
```

Regra de ouro da ordem: **primeiro o agente enxerga (P0), depois lembra (P1),
depois aprende (P2), depois se mede (P4), depois se vigia (P5) e só então se
melhora sozinho (P3)** — nunca melhorar às cegas.

---

## 7. Riscos e princípios (não negociáveis)

1. **Local-first e BYOK, sempre.** A lição do dia: o backend do Samba (engine com
   cookie) quebrou tudo e custou horas. O Samba Builder não depende de nenhum
   serviço gerenciado — Córtex roda na máquina, chaves são do usuário.
2. **Dado do cliente não sai do ambiente dele.** Conhecimento de projeto é do
   projeto; aprendizado cross-cliente só anonimizado e opt-in (venda corporativa
   depende disso).
3. **Evolução com dono.** "Automático" é a proposta, nunca o merge silencioso:
   conhecimento (P2) aprova em 1 clique; código do produto (P3) passa pela
   governança com trilha auditável.
4. **Custo de contexto tem orçamento.** Memória injetada é pequena e consolidada;
   o resto vem por retrieval na hora (lição do Hermes: memória enxuta sempre,
   conhecimento grande sob demanda).
5. **Medir antes de melhorar.** Nenhuma auto-melhoria entra sem eval/score que a
   justifique (P4 antes de P3).
6. **O dev continua dono da decisão.** A plataforma propõe, executa rotina e
   lembra; julgar, aprovar e redirecionar é humano — é o que sustenta a venda
   corporativa (governança negócio ↔ tecnologia).

---

_Documento vivo: revisar a cada ciclo de projeto (P2 alimenta este arquivo).
Próxima revisão: após o piloto do primeiro projeto de cliente ponta a ponta._
