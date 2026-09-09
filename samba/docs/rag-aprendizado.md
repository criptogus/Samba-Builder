# RAG de Aprendizado Contínuo — Samba Builder

> **Objetivo:** o Samba Builder aprende constantemente com cada projeto — feedbacks, erros e acertos — e evolui os skills e a base de conhecimento, para que no próximo projeto **os erros não se repitam** e **o que funcionou sirva de inspiração**, de forma proporcional ao contexto do novo projeto (tipo de produto, stack, perfil de risco, fase).
>
> **Não é:** um repositório de código copiado entre projetos. É um **sistema de memória de engenharia**: lições destiladas com fonte, padrões validados por evidência e skills que mudam com aprovação humana.

---

## Princípios (não negociáveis)

1. **Local-first / BYOK** — o conhecimento da organização fica no armazenamento local da instalação (sqlite do app). O Córtex externo (:8899, vault) é uma integração opcional, nunca o requisito. Dados de clientes **nunca saem** da máquina/tenant sem consentimento explícito.
2. **Aprendizado por organização isolado** — o que o projeto do Cliente A ensinou não vaza para o projeto do Cliente B, salvo padrões genéricos de engenharia (aprovados como tal). O SB multi-tenant (Fase 2 do roadmap-plataforma) isola por tenant.
3. **Humano no gate** — nada que altera um skill nativo acontece sem proposta versionada + aprovação humana (regra já existente no evolution do Codex, estendida).
4. **Evidência > opinião** — lição vira knowledge unit com: fonte real (commit, execução de teste, evidência de gate, feedback), data e contexto. "Achei feio" sem evidência não vira regra.
5. **Proporcional ao risco** — projeto `public` aprende leve; `critical` gera aprendizado de segurança/governança com gates mais rigorosos.
6. **Anti-ruído** — amostragem pequena não vira skill; duplicatas são fundidas; lições têm validade e são reavaliadas quando contraditas.

---

## Estado atual (o que já existe e será reutilizado)

| Peça | Onde | Papel no RAG |
|---|---|---|
| `CORTEX_KNOWLEDGE_BLOCK` no prompt | `src/prompts/local_agent_prompt.ts` | Ponto de injeção: agente já é instruído a consultar conhecimento antes de codar |
| `cortex-mcp/server.py` | `samba/cortex-mcp/` | Ponte MCP para o RAG externo — vira o modelo do MCP **embutido** |
| `learn.py` (learning loop fase 1) | `samba/learn/` | Destilação manual → inbox do vault. Vira o **pipeline automático** pós-entrega |
| `evolution/` (evolve.py + proposals) | `samba/skills/evolution/` | Feedback JSONL → proposta → aprovação humana. **Base do motor de evolução de skills** |
| `feedback/*.jsonl` | `samba/skills/feedback/` | Fonte explícita de erros/acertos dos devs |
| `DeliveryEvidence` + gates por perfil | `src/delivery/evidence.ts` | Fonte estruturada de **acertos** (gate passed) e pendências |
| `projectTestExecutions`, `projectQualityRuns` | `src/db/schema.ts` | Fonte de erros técnicos reais (testes/qualidade) |
| `projectDeliveries` + `projectDeliveryApprovals` | `src/db/schema.ts` | Fonte de aprovações/rejeições por versão (o que o cliente aceitou) |
| Foundation docs por projeto | `PRD.md` `ARCHITECTURE.md` `DESIGN_SYSTEM.md` `TESTING.md` `OPERATIONS.md` | Corpus primário de cada projeto |
| `PROJECT_MEMORY.md` (D1) | por projeto | Memória de trabalho do projeto — fonte de decisões e comandos descobertos |
| SQLite local (better-sqlite3) | `src/db/` | Store do índice (FTS5 + metadados) — sem novo serviço |

---

## Ontologia do conhecimento (o que o RAG aprende)

Cinco tipos de knowledge unit, com schema próprio:

### 1. Episódio de projeto (ProjectEpisódio)
O que aconteceu num projeto: stack, domínio, perfil de risco, fase, tamanho, decisões (ADRs), estrutura. Serve de **contexto de matching** para "projetos similares".

### 2. Lição (Lesson) — o núcleo
- `kind`: `erro_evitar` | `padrao_seguir` | `atencao` (depende do contexto)
- Origem: incidente real, teste falho recorrente, gate falho, rejeição de cliente, feedback negativo, correção pós-review
- **Fonte verificável**: commit/PR, executionId, evidenceItem, feedback ts, chat de revisão
- Contexto de aplicação: tipo de produto, stack, perfil de risco, fase em que vale
- Força: nº de ocorrências, nº de fontes independentes, recência
- Contradita/suportada por: outras units (resolução de conflito)

### 3. Padrão validado (Pattern)
Um acerto que passou por evidência: gate passed + aprovação do cliente. Ex.: "pipeline de onboarding com 4 passos foi aprovado em 3 projetos SaaS; reduz atrito". Vira **inspiração** no próximo projeto (recuperado como sugestão, nunca imposição).

### 4. Skill delta (para o motor de evolução)
Proposta estruturada de mudança num native-skill (ou criação): gatilho, diagnóstico, mudança proposta no texto do skill, fonte, impacto esperado. Só vira skill com aprovação humana.

### 5. Fatos e entidades (clientes, marcas, design systems)
Reuso do que o Córtex já faz (cortex_entity / cortex_design_system): identidade visual, preferências de cliente, convenções da organização.

---

## Arquitetura

```
┌─ Fontes ─────────────────────────────────────────────────────────┐
│ entrega aprovada · entrega rejeitada · gate failed · testes      │
│ falhos recorrentes · feedback jsonl · incidente/correção ·       │
│ chat de revisão · foundation docs · ADRs · PROJECT_MEMORY        │
└───────────────┬──────────────────────────────────────────────────┘
                ▼
┌─ Collector (pós-evento, automático) ─────────────────────────────┐
│ eventos da fila local: delivery.approved / .rejected /           │
│ quality.failed / test.flaky / feedback.recorded / incident.fixed │
│ coleta artefatos + contexto do projeto + evidência               │
└───────────────┬──────────────────────────────────────────────────┘
                ▼
┌─ Distiller (LLM via provider BYOK, com schema) ──────────────────┐
│ extrai lessons/patterns candidatas; classifica, resume,          │
│ deduplica contra o índice; assina fonte/data/contexto;           │
│ NUNCA inventa — só destila o que a fonte contém                  │
└───────────────┬──────────────────────────────────────────────────┘
                ▼
┌─ Quality gate do aprendizado ────────────────────────────────────┐
│ lição exige: fonte real + contexto + sem duplicata + linguagem   │
│ prescritiva-condicional; erro único ≠ regra; sem PII/segredo     │
└───────────────┬──────────────────────────────────────────────────┘
                ▼
┌─ Indexador local ────────────────────────────────────────────────┐
│ sqlite FTS5 (português) + metadados (tipo, stack, perfil, fase,  │
│ força, recência); embeddings opcionais via provider BYOK         │
└───────────────┬──────────────────────────────────────────────────┘
                ▼  (recuperação no início do próximo projeto/tarefa)
┌─ Retriever contextual ───────────────────────────────────────────┐
│ query = tipo de produto + stack + perfil de risco + fase +       │
│ intenção da tarefa; ranking híbrido (FTS5 + similaridade +       │
│ força/recência); ERROS_QUE_EVITAR e PADROES_QUE_FUNCIONARAM      │
└───────────────┬──────────────────────────────────────────────────┘
                ▼
┌─ Injeção no prompt + motor de evolução ──────────────────────────┐
│ bloco <project_lessons> no início da tarefa (só o relevante) +   │
│ acúmulo de skill deltas → evolution (proposta → aprovação →      │
│ native-skill atualizado com fonte)                               │
└──────────────────────────────────────────────────────────────────┘
```

### Decisões de arquitetura

- **Store:** sqlite do app (novas tabelas `knowledge_units`, `knowledge_sources`, `skill_deltas`), FTS5 com stemmer pt; sem serviço novo, sem rede. Embeddings: só se o usuário conectar provider com suporte (BYOK); sem embeddings o sistema funciona em FTS5 + metadados.
- **Collector:** listeners nos eventos que já existem (aprovação salva, execução de teste, gate registrado, feedback) + varredura pós-entrega (`delivered`).
- **Distiller:** 1 chamada LLM estruturada por evento (JSON schema), barata, assíncrona; falha do distiller não bloqueia a entrega (fila retenta).
- **Córtex externo:** integração opcional — quando o RAG :8899 está disponível e o usuário autoriza, o SB espelha unidades (ou usa o fluxo learn.py atual). O produto funciona sem ele.
- **Identidade:** unidades têm `orgScope` (`organization` | `global-engineering`) — o que é específico de cliente nunca cruza tenant; padrões genéricos de engenharia podem ser promovidos a `global-engineering` só com aprovação.

---

## Gatilhos de ingestão (quando o SB aprende)

| Evento | O que extrai | Exemplo real |
|---|---|---|
| Entrega **aprovada** (`approved`/`delivered`) | Padrões validados (gates passed + aceite) | "onboarding 4 passos aprovado" |
| Entrega **rejeitada** / gate failed | Lição erro_evitar | "clientes rejeitam cards sem hierarquia; gate visual falhou" |
| Teste falho **recorrente** (mesma área 2+ runs) | Lição erro_evitar (técnica) | "migração X quebra testes de contrato — rodar contrato antes" |
| **Incidente** corrigido (bug report → fix commit) | Lição erro_evitar + padrão do fix | "chave sumia do settings: spread raso — deep-merge por provider" |
| **Feedback** dev/cliente (jsonl ou chat pós-entrega) | Lição ou skill delta | "gerou layout genérico — pedir referência visual antes do hero" |
| Fim de projeto (delivered + handoff) | Episódio completo + revisão de units do projeto | resumo do projeto para matching futuro |
| Contradição (unidade nova vs existente) | Reavaliação; a mais fraca/antiga perde força | — |

---

## Recuperação contextual (como o próximo projeto usa)

No início de cada projeto/tarefa relevante, o retriever roda com o contexto real:

```
query = { tipoProduto, stack, perfilRisco, fase, palavras-chave da tarefa }
```

E injeta no prompt um bloco **enxuto e separado** (novo `PROJECT_LESSONS_BLOCK`, vizinho do `CORTEX_KNOWLEDGE_BLOCK`):

```
<project_lessons>
Projetos similares (3 SaaS B2B, perfil private) ensinaram:
• EVITAR: … (fonte: projeto X, commit Y) — 2 ocorrências
• FUNCIONOU: … (fonte: projeto Z, aprovado) — use como inspiração, adapte ao contexto
</project_lessons>
```

Regras da injeção:
- **Máximo 5 unidades** (orçamento de contexto); 3 erros_evitar + 2 padrões (ou proporcional).
- **Nunca instrução dura vinda de outro projeto** — lições entram como contexto; skills (aprovados) são a única fonte de regra.
- Fase certa: lição de "deploy" não entra no briefing; entra na tarefa de deploy.
- O agente cita a lição ao agir ("evitei X porque lição de P") — **feedback de uso** alimenta a força da unidade (usada e o gate passou → +força; usada e falhou → reavaliar).

---

## Motor de evolução de skills (fechar o ciclo)

Fluxo (estende o `samba/skills/evolution` do Codex, que hoje só trata feedback explícito):

1. **Acúmulo**: lessons/patterns fortes viram `skill_delta` candidatos (distiller sugere: "adicionar regra X ao samba-design").
2. **Threshold**: só com força ≥ 2 fontes independentes OU 1 fonte crítica (incidente de segurança/dados) OU feedback com `--min-freq 2`.
3. **Proposta versionada**: arquivo em `samba/skills/evolution/proposals/` com diff proposto do skill + fontes + impacto.
4. **Aprovação humana**: na UI (notificação "O SB aprendeu algo — revisar proposta de skill") — aceitar/editar/recusar.
5. **Aplicação**: patch no native-skill + nota de fonte no rodapé do skill (skill vira "v2 — regra vinda de P3").
6. **Regressão do catálogo**: rodar `native_skills.test.ts` (orçamento de contexto) e o teste do skill afetado antes de publicar.

Regra de ouro: **o SB propõe; o humano dispõe.** Nenhum skill muda sem aprovação (mesma regra do DeliveryEvidence: "parece pronto" não passa).

---

## Qualidade do aprendizado (anti-ruído)

- Erro de 1 projeto **não** vira regra sem 2ª fonte ou evidência de recorrência.
- Lição exige linguagem condicional-acionável ("quando X, faça Y") com contexto de aplicação — nunca "sempre faça Z".
- Duplicatas fundidas (hash do conteúdo + similaridade); contradição resolve pela evidência mais recente/forte.
- Unidades têm `expiresAt` (padrão: 18 meses; segurança: 12) e são revalidadas no uso.
- Sanitização na entrada do distiller: PII, segredos e valores de configuração são removidos antes de indexar (nunca entram no índice).
- Revisão periódica (a cada N projetos ou manual): "o que o SB aprendeu que não deveria?" — auditável no sqlite.
- Medição: lições injetadas × tarefas com gate passed × reincidência do mesmo erro (o erro repetiu apesar da lição? a lição perde força).

---

## Privacidade e segurança

- Unidades vivem no sqlite local da instalação/tenant; export/import opcional (encriptado) para mover entre instalações da mesma organização.
- Nunca indexar: chaves, tokens, valores de env, PII de usuários finais, dados de produção dos clientes.
- O distiller roda com o provider BYOK do usuário; se o provider for remoto, o payload enviado é só o artefato do evento (sanitizado), nunca o repo inteiro.
- Auditoria: cada unit registra fonte e quem aprovou (append-only, como o DeliveryEvidence).
- Kill switch: "pausar aprendizado" por projeto/organização.

---

## Fases de implementação

### F1 — Coletar e destilar (o SB aprende)
- Tabelas `knowledge_units`/`knowledge_sources` (sqlite + FTS5 pt).
- Collector nos eventos existentes (aprovação, gate failed, teste recorrente, feedback, incidente).
- Distiller com schema zod (BYOK); fila local com retry; dry-run e painel "o que foi aprendido" (auditável).
- Sanitização + dedupe + quality gate.
- **Critério de saída:** após uma entrega completa, o projeto gera units verificáveis no painel, sem intervenção manual.

### F2 — Recuperar e injetar (o próximo projeto nasce sabendo)
- Retriever contextual (matching por tipo/stack/perfil/fase) + ranking híbrido.
- `PROJECT_LESSONS_BLOCK` no prompt com orçamento (≤5 units), separado do conhecimento de marca.
- Feedback de uso (lição citada → resultado) alimentando força.
- **Critério de saída:** 2 projetos similares seguidos: o 2º não repete erro documentado do 1º (verificado por teste/gate), sem estourar contexto.

### F3 — Evoluir skills com aprovação (o SB melhora sozinho, com dono)
- Skill deltas automáticos + proposals versionadas na UI + aprovação 1 clique (aceitar/editar/recusar).
- Aplicação com fonte no rodapé + regressão do catálogo (testes).
- **Critério de saída:** um erro real documentado vira regra no skill após aprovação, e o mesmo cenário num projeto novo é tratado pela regra.

### F4 — Escala e aprendizado por organização
- Isolamento por tenant (Fase 2 do roadmap-plataforma); promoção de padrões a `global-engineering` com aprovação.
- Espelhamento opcional com o Córtex externo (integração existente) para o fluxo do Gustavo.
- Métricas no Eval Lab (Fase 3): reincidência de erros por organização, tempo de revisão, score de qualidade ao longo do tempo.
- **Critério de saída:** reincidência de erros conhecidos < 10% nas tarefas com lição injetada.

---

## Métricas de sucesso (o RAG está funcionando?)

| Métrica | Alvo |
|---|---|
| Erros conhecidos reincidentes em projetos novos | < 10% (com lição injetada) |
| Precisão da recuperação (lição injetada relevante p/ tarefa) | ≥ 80% (amostragem manual) |
| Taxa de aprovação de skill deltas propostos | 30–70% (muito alta = propostas tímidas; muito baixa = ruído) |
| Custo do distiller por entrega | < R$ 1/entrega (modelo barato BYOK) |
| Falsos positivos de aprendizado (unit que precisou ser apagada/desativada) | < 5% |
| Tempo humano de revisão de propostas | < 5 min/proposta |

---

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Vício de aprendizado (1 projeto enviesa o SB) | Força = nº de fontes; threshold mínimo; contradição resolve por evidência |
| Vazamento entre clientes | Isolamento por tenant; `orgScope`; sanitização; sem PII/segredo no índice |
| Custo do distiller | Fila assíncrona, modelo barato, só eventos relevantes (não toda mensagem) |
| Inchaço de contexto do prompt | Orçamento rígido (≤5 units) + FTS5 + matching por metadados antes de LLM |
| Skill piora com regra de um caso | Proposta + aprovação humana + regressão do catálogo + fonte no rodapé |
| Dependência do Córtex externo (:8899) | RAG embutido é o produto; Córtex externo é integração opcional |
