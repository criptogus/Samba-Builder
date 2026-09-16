# Plano — paridade seletiva com o Kilo Code (features, skills e tools)

> **Objetivo deste documento:** dizer o que o Kilo Code tem que nós **ainda não temos**, o que já temos
> (para não reconstruir), e em que ordem implementar o que falta — com critérios de aceite e esforço.
>
> **Natureza:** plano. Nada aqui foi implementado. Cada fase vira PRs revisáveis.

## 1. Método e fontes

Comparação feita em 2026-09-08 entre:

- **Kilo Code** — repositório `github.com/Kilo-Org/kilocode` (README) e a documentação oficial em `kilo.ai/docs`
  (`/docs/customize/*`, `/docs/automate/*`, `/docs/code-with-ai/*`).
- **Samba Builder** (este repo) — `docs/agent_architecture.md`, `docs/PROJECT_MEMORY.md`, `rules/chat-modes.md`,
  `rules/local-agent-tools.md`, `PRODUCT.md` e leitura direta do código citado em cada linha.

Toda afirmação sobre o Kilo vem de página de doc ou README; toda afirmação sobre nós vem de caminho de arquivo.
Onde não consegui verificar, marquei **não verificado**.

## 2. Direção de produto (o filtro de tudo que vem abaixo)

`PRODUCT.md` define: usuários **não-técnicos na primeira hora**, produto **local-first**, **BYOK-only**, tom
"calmo e capaz", proibido virar "enterprise SaaS clutter" ou "dev-tool austere".

Isso significa: **copiar do Kilo só o que reduz decisões/ansiedade do usuário ou aumenta a capacidade do agente
sem depender da nuvem deles.** Tudo que é plataforma SaaS (gateway de 500 modelos, cloud agent, Slack, mobile,
JetBrains, autocomplete de IDE) fica **fora** — não por incapacidade, mas porque contraria nosso diferencial.

## 3. Placar dos gaps

Legenda: **TEMOS** (não fazer nada) · **PARCIAL** (estender o que existe) · **AUSENTE** (construir) · **FORA** (decisão consciente de não copiar).

| # | Área | Kilo Code | Nós hoje | Veredito | Prio |
|---|------|-----------|----------|----------|------|
| 1 | **Skills** | Agent Skills: pasta com `SKILL.md`, descoberta por metadados, **carregamento sob demanda decidido pelo modelo**, escopo global/projeto/modo, tool `skill` | Catálogo **fixo** em `src/shared/native_skills.ts`, corpo em `src/shared/native-skills/*.md` ou `<slug>/SKILL.md`, ativado **só por slash explícito** (`/samba-*`), máx. 3 por mensagem (`src/shared/load_native_skill.ts`) | **PARCIAL** | P0 |
| 2 | **Workflows / slash commands** | `.kilo/commands/*.md` com frontmatter (`description`, `agent`, `model`, `variant`, `subtask`) | Só o slash de skill nativa; sem comandos arbitrários por projeto | **AUSENTE** | P0 |
| 3 | **Permissões de tool** | `allow`/`ask`/`deny` com glob + precedência (última regra vence), `external_directory`, Permission Dock com "aprovar uma vez / aprovar sempre" | Consent banner por chamada + 2 toggles específicos (`AutoApproveMcpSwitch`, `AutoApproveSqlSwitch`); sem política declarativa por padrão de caminho/comando | **PARCIAL** | P0 |
| 4 | **Custom agents/modos** | Agentes em Markdown; modos `primary`/`subagent`/`all`; escopo global/projeto/organização | 4 modos fixos (`local-agent`, `build`, `ask`, `plan` — `rules/chat-modes.md`) | **AUSENTE** | P1 |
| 5 | **Subagentes custom** | tool `task`, invocação por `@agente`, `background: true`, sessão isolada, built-ins `general`/`explore` | `subagent_tools.ts` + exploradores de código/chat (`explore_code_subagent.ts`, `explore_chat_history_subagent.ts`); sem definição declarativa pelo usuário, sem background | **PARCIAL** | P1 |
| 6 | **Goals de sessão** | `/goal` com status Active/Paused/Blocked/Complete, relatório final, sobrevive a restart | Inexistente (temos `update_todos` e máquinas de estado) | **AUSENTE** | P1 |
| 7 | **Checkpoints** | Snapshot + "reverter para aqui" + isolamento em worktree + banner de revert | Undo/redo por chat baseado em git (`ExtraCommitsRevertDialog.tsx`); sem reverter para um ponto arbitrário da conversa | **PARCIAL** | P1 |
| 8 | **Tools de arquivo** | `glob`, `apply_patch`, `todoread`, `read`/`edit`/`write`, `bash` | `list_files`, `search_replace`, `write_file`, `update_todos` (sem `todoread`), `run_repo_command` (só verificação), `execute_sandbox_script` (MustardScript) | **PARCIAL** | P1 |
| 9 | **Busca semântica / indexação** | Tree-sitter + embeddings + vector DB + tool `semantic_search` (opt-in) | Worker `code_explorer` + BM25 **lexical** (`bm25.ts`, `code_search.ts`); Córtex existe, mas é MCP externo | **PARCIAL** | P2 |
| 10 | **Marketplace** | Instala Agent / Skill / MCP server, escopo projeto ou global, arquivos em `.kilo/` | Só **MCP**: catálogo remoto + instalação (`src/components/plugins/catalog/*`, `src/ipc/shared/remote_mcp_catalog`, tabela `mcp_catalog`) | **PARCIAL** | P2 |
| 11 | **Agent Manager** | Painel multi-sessão em worktrees paralelos, diff vs. branch pai, terminal por sessão, import de PR | `distributed_machines/` + `state_machines/` + multi-chat; sem painel de sessões/worktrees | **PARCIAL** | P2 |
| 12 | **AGENTS.md / instruções de projeto** | `AGENTS.md` é o padrão (Memory Bank descontinuado); rules projeto + global | Consumimos `AI_RULES.md` como guidance do app; escrevemos `AGENTS.md`/`AI_RULES.md` **nos apps gerados** (`src/ipc/services/project_foundation.ts`) | **PARCIAL** | P2 |
| 13 | **Enhance prompt** | Reescreve o prompt do usuário antes de enviar | Só prompts de inspiração (`src/prompts/inspiration_prompts.tsx`) | **AUSENTE** | P2 |
| 14 | **Commit message generation** | Mensagem de commit no padrão conventional commits | Tools de git existem (`tools/git.ts`), geração de mensagem não | **AUSENTE** | P2 |
| 15 | **Ignore de contexto** | `.kilocodeignore` → vira deny rules de `read`/`edit` | Não há equivalente próprio | **AUSENTE** | P3 |
| 16 | **Context condensing** | Compaction com summary ancorado | `src/prompts/compaction_system_prompt.ts` + `plans/benchmark-compaction.md` | **TEMOS** | — |
| 17 | **Todo list** | `todowrite`/`todoread` com status | `src/components/chat/TodoList.tsx` + tool `update_todos` (falta o `read`) | **TEMOS** (gap pequeno) | — |
| 18 | **Voice-to-text** | Voice transcription (modelo + BYOK) | `useVoiceToText` + `src/components/chat/ChatInput.tsx` | **TEMOS** | — |
| 19 | **Code reviews em PR** | App GitHub/GitLab revisando PRs | Nossas reviews são de **desenvolvimento** (`.claude/skills/multi-pr-review`, `swarm-pr-review`), não feature de produto | **AUSENTE** | P3 |
| 20 | **Plataformas** | VS Code, JetBrains, CLI, cloud, mobile, Slack | Desktop Electron (macOS/Windows) + preview local | **FORA** | — |
| 21 | **Gateway de 500+ modelos** | Kilo Gateway (sem markup, sem API key) | BYOK + gateway local (Samba Engine `127.0.0.1:8642`, OpenCode, DeepSeek, etc.) | **FORA** (estratégia) | — |
| 22 | **Autocomplete / code actions / plugins de IDE** | Ghost text, menu de contexto do editor, plugins | Não se aplica ao nosso fluxo (chat + preview de app) | **FORA** | — |
| 23 | **Gastown (orquestração autônoma)** | Polecats/Refinery/Mayor + board compartilhado | `distributed_machines/` + governança/score é o embrião | **AVALIAR** | P3 |

## 4. Fases de implementação

### Fase 0 — Fundação de extensibilidade (P0, ~1 semana)

> **Status (2026-09-08): implementada.** `REQ-01` e `REQ-02` entregues: tipos e validação em
> `src/shared/extensions.ts`, descoberta em `src/ipc/services/extensions/` (frontmatter + discovery),
> contrato `extensions:list` (`src/ipc/types/extensions.ts`), handler
> (`src/ipc/handlers/extensions_handlers.ts`) e a seção "Extensões do projeto" na Library
> (`src/components/ProjectExtensions.tsx`). 24 testes verdes. O que **ainda não** existe desta fase:
> instalar/remover extensão pela UI (depende de REQ-03/REQ-12) e persistência em banco (desnecessária:
> o disco é a fonte da verdade, como no Kilo).

**Por que primeiro:** três itens P0 (skills sob demanda, workflows, custom agents) dependem do **mesmo núcleo**:
descobrir arquivos declarativos por escopo, validar, e injetar no prompt quando (e só quando) fizer sentido.
Fazer isso uma vez evita três implementações divergentes.

**Entregáveis**

- `REQ-01` — Núcleo "extensões declarativas": varredura de `.samba/{skills,commands,agents}/` no projeto **e** no
  diretório de usuário, com parser de frontmatter e validação de schema (zod, seguindo `rules/electron-ipc.md`).
- `REQ-02` — Contrato IPC + atoms Jotai para listar/instalar/remover extensões, com enforcement no main
  (nunca confiar no renderer — `registerTrustedIpcHandler`).

**Arquivos-alvo:** `src/shared/native_skills.ts`, `src/shared/load_native_skill.ts` (generalizar, não duplicar),
novo `src/shared/extensions/*`, `src/ipc/handlers/` (novo handler registrado via `registerTrustedIpcHandler`).

**Aceite**

- Given um projeto com `.samba/extensions/` válido, When o app inicia, Then as extensões aparecem listadas por escopo.
- Given um arquivo com frontmatter inválido, Then a extensão é ignorada com aviso no log e o app **não** quebra.
- Given um payload inválido do renderer, Then o handler rejeita com `SambaError` (`rules/samba-errors.md`).

---

### Fase 1 — P0: skills sob demanda, workflows e permissões (~2–3 semanas)

**`REQ-03` Skills 2.0 (autoria + descoberta + carregamento sob demanda)**

- Hoje só ativamos skill por slash explícito, num catálogo fixo. Falta: **skill do usuário/projeto**, escopo por
  modo, e o modelo decidir carregar pelo `description` (padrão Agent Skills).
- Entregáveis: autoria de skill (arquivo + UI), metadados (nome, descrição, `modes`, escopo), inclusão de **só metadados**
  no prompt do modo ativo, e uma tool `load_skill` para carregar o corpo sob demanda.
- Manter o slash `/samba-*` funcionando (retrocompatível) e os limites atuais (máx. skills/contexto).
- **Aceite:** Given uma skill de projeto com `description` casando com a tarefa, When envio a mensagem sem slash,
  Then o corpo da skill entra no contexto **apenas** daquela etapa e o card de uso aparece no chat.
  Given `modes: [plan]`, Then em Agent mode ela não é oferecida. Given skill de terceiro com texto hostil,
  Then ela **não** ganha tools nem permissões (respeitar `rules/local-agent-tools.md`).

**`REQ-04` Workflows (slash commands de projeto/usuário)**

- Reusar o parser de slash já existente em `load_native_skill.ts:parseNativeSkillRequest`, generalizando de
  `samba-*` para comandos arbitrários, com frontmatter `description`, `agent`, `model`, `subtask`.
- **Aceite:** Given `.samba/commands/corrigir-issue.md`, When digito `/corrigir-issue`, Then o conteúdo é injetado
  como instrução e o `agent` do frontmatter é respeitado; Given comando inexistente, Then nada é alterado no prompt.

**`REQ-05` Permissões declarativas por tool**

- Modelo `allow`/`ask`/`deny` com glob de caminho/comando e precedência "última regra vence" (igual ao Kilo),
  mais `external_directory` para acesso fora do projeto.
- UI: no card de consentimento (hoje `AgentConsentBanner`), adicionar **"aprovar sempre"**, que grava a regra.
- **Enforcement no main**, não na UI. A UI apenas explica.
- **Aceite:** Given `edit: { "*.env": deny }`, When o agente tenta editar `app/.env`, Then a chamada é bloqueada,
  o card mostra a regra que bloqueou, e o agente recebe erro recuperável (não morre o turno).
  Given "aprovar sempre" num comando, Then a regra persiste e a próxima chamada idêntica não pede consentimento.
  Given padrão `../` fora do projeto sem `external_directory: allow`, Then bloqueia.

---

### Fase 2 — P1: agentes custom, subagentes, goals e checkpoints (~3 semanas)

- `REQ-06` **Agentes custom em Markdown** (modos `primary`/`subagent`/`all`, escopo projeto/global) reaproveitando o
  núcleo da Fase 0; os 4 modos atuais continuam existindo como built-ins (`rules/chat-modes.md` manda preferir
  `local-agent`, e a resolução centralizada de modo deve ser reusada, não duplicada).
- `REQ-07` **Subagentes custom**: `@agente` no composer, `background: true` para tarefas longas, escopo de tools por
  subagente. Base: `subagent_tools.ts` + os exploradores existentes.
- `REQ-08` **Goals de sessão** (`/goal` com Active/Paused/Blocked/Complete + relatório). Casa com o modo
  `autonomy_mode` já documentado na memória de projeto: checkpoint vivo, orçamento e alerta só na decisão.
  **Aceite:** Given um goal ativo, When o app reinicia, Then status e objetivo persistem; When pauso/retomo/limpo,
  Then o estado é consistente e o relatório final fica no chat.
- `REQ-09` **Checkpoints com "reverter para aqui"**: snapshot por etapa do turno + isolamento em worktree,
  evoluindo o undo/redo git atual (`plans/better-undo-redo.md`, `plans/better-state-machine.md`).
  **Aceite:** Given uma conversa de 10 turnos, When reverto para o turno 6, Then o workspace volta àquele estado
  e o revert é **visível** (banner) e reversível — nada de perda silenciosa.
- `REQ-10` **Tools baratas que faltam**: `apply_patch` (diff unificado, útil com modelos que aplicam patch melhor)
  e `todoread` (leitura da lista). `glob` é coberto por `list_files`; `bash` **não** copiamos — nosso sandbox
  MustardScript + `run_repo_command` restrito é decisão de segurança, ver "Fora de escopo".

---

### Fase 3 — P2: busca semântica, marketplace, agent manager e atalhos (~3–4 semanas)

- `REQ-11` **Indexação semântica opt-in**: chunks por símbolo + embeddings + busca vetorial, exposta como tool.
  Reusar o worker `code_explorer` (que hoje faz BM25) e o Córtex como fonte de conhecimento do cliente.
  **Dependência do usuário:** provedor de embeddings — BYOK, coerente com o produto; nunca indexar sem ligar.
  **Aceite:** Given indexação desligada, Then nenhum embedding é gerado nem enviado; Given ligada e limitada por
  `.sambaignore`, Then `semantic_search("tratamento de erro de pagamento")` acha o arquivo certo sem termo exato.
- `REQ-12` **Marketplace estendido**: hoje só instalamos MCP. Adicionar instalação de **skill** e **agente** no
  mesmo fluxo do catálogo (`src/components/plugins/catalog/*`), com curadoria (assinatura/versão) — nosso catálogo
  é a diferença de confiança para público não-técnico.
- `REQ-13` **Agent Manager** (sessões paralelas em worktrees + painel de diff + import de branch/PR), apoiado em
  `distributed_machines/`. Este é o item mais caro; só depois de goals e checkpoints (que ele consome).
- `REQ-14` **Enhance prompt** e `REQ-15` **mensagem de commit**: ganhos rápidos para usuário não-técnico —
  reescrever o pedido antes de gastar tokens e descrever o commit em linguagem clara.

---

### Fase 4 — Avaliar (sem data)

`REQ-16` Code reviews de PR como feature de produto (Kilo faz via GitHub/GitLab App) — exige infra de servidor,
que hoje não temos por decisão de produto. `REQ-17` Orquestração tipo Gastown sobre `distributed_machines/`.
`REQ-18` Agentes gerenciados por organização (encosta em enterprise/RBAC — `docs/adrs/0003` segue "Proposed"),
`REQ-19` `.sambaignore`/deny de contexto.

## 5. Fora de escopo (consciente)

| Item | Por que não |
|------|-------------|
| Autocomplete ghost-text, code actions, plugins de IDE | Nosso fluxo é chat + preview de app, não edição de código em IDE. |
| VS Code / JetBrains / Slack / mobile / CLI como produtos | Somos desktop local-first (Mac/Windows). Manter 1 superfície excelente. |
| Gateway público de 500 modelos (sem API key) | Contradiz "BYOK-only" e "local-first" do `PRODUCT.md`; nosso gateway é local. |
| App Builder na nuvem do Kilo | O Kilo **descontinuou** o dele (doc marca como deprecated) — nosso app builder local é justamente o valor. |
| Tool `bash` irrestrita | Nosso sandbox MustardScript + `run_repo_command` é decisão de segurança, não lacuna. |

## 6. Ordem recomendada e primeiros 3 PRs

1. **PR 1 (Fase 0):** núcleo de extensões declarativas + teste de schema/escopo (`REQ-01`, `REQ-02`).
2. **PR 2 (Fase 1):** skills sob demanda por `description` **sem** autoria ainda (prova o carregamento e o custo de contexto) — `REQ-03`.
3. **PR 3 (Fase 1):** permissões declarativas com "aprovar sempre" e enforcement no main — `REQ-05`.

Total estimado P0→P2: **9–11 semanas de 1 dev**, com verificação contínua (`npm run presubmit`, `npm run ts`,
`npm test`) e E2E do agente local (`e2e-tests/local_agent*.spec.ts`) por fatia.

## 7. Riscos que precisam de decisão humana

1. **Custo de contexto das skills** — carregamento sob demanda pode inflar o prompt. Mitigação: injetar só metadados
   + limite de skills por turno (já existe). Precisa medir com o `benchmark-compaction` existente.
2. **Segurança das permissões** — se o enforcement ficar na UI, é bypass. Decisão: sempre no main, com teste negativo.
3. **Embeddings exigem provedor pago do usuário** — decisão de produto: indexação é opt-in e nunca obrigatória.
4. **Marketplace e curadoria** — abrir instalação de skill/agente de terceiros aumenta superfície de ataque;
   precisa de regra clara (o que pode ser distribuído, quem assina).
5. **Escopo** — Fase 3 (Agent Manager) é a que mais facilmente vira um trimestre; deve esperar as fases anteriores.

## 8. Fontes consultadas

- Kilo Code: `github.com/Kilo-Org/kilocode` (README) · `kilo.ai/docs/customize/{skills,custom-subagents,workflows,agent-permissions,marketplace,custom-modes,custom-rules,agents-md}` ·
  `kilo.ai/docs/automate/{tools,how-tools-work,agent-manager,code-reviews/overview}` ·
  `kilo.ai/docs/code-with-ai/{app-builder,gastown}` e `.../code-with-ai/{agents/goals,features/checkpoints}` ·
  `kilo.ai/docs/customize/context/{codebase-indexing,context-condensing,kilocodeignore}`.
- Samba Builder: `docs/agent_architecture.md`, `docs/PROJECT_MEMORY.md`, `PRODUCT.md`, `rules/chat-modes.md`,
  `rules/local-agent-tools.md`, `src/shared/load_native_skill.ts`, `src/shared/native_skills.ts`,
  `src/pro/main/ipc/handlers/local_agent/tools/*`, `src/components/plugins/catalog/*`,
  `src/ipc/shared/remote_mcp_catalog.ts`, `src/ipc/services/project_foundation.ts`,
  `src/components/chat/{TodoList.tsx,ExtraCommitsRevertDialog.tsx}`, `workers/code_explorer/`.
