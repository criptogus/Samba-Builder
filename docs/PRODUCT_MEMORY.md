# Product Memory — Samba Builder

Memória de **produto** (decisões, escopo, requisitos e conexões entre agentes). A definição canônica do produto
(usuários, propósito, marca, princípios de design) continua em [`PRODUCT.md`](../PRODUCT.md); a memória técnica
(estrutura do repo, comandos, auditoria) fica em [`docs/PROJECT_MEMORY.md`](PROJECT_MEMORY.md).

Plano que originou estas decisões: [`plans/kilocode-parity-plan.md`](../plans/kilocode-parity-plan.md).

## Direção

- **Problema real:** pessoas com uma ideia de app e sem base técnica travam antes de ver qualquer coisa funcionando.
- **Público:** construtores não-técnicos na primeira hora (sem terminal, sem saber o que é Node) — `PRODUCT.md`.
- **Métrica de sucesso:** da ideia digitada ao preview funcionando com o mínimo de decisões, desvios e dúvidas.
- **Diferencial:** local-first, BYOK, código no computador do usuário, sem lock-in.

## Decisões

- **2026-09-08** — Paridade com o Kilo Code tratada como **roadmap de extensibilidade seletiva**, não como cópia.
  Motivo: o Kilo é plataforma multi-superfície (IDE/CLI/cloud/Slack/mobile) com gateway próprio; nosso produto é
  desktop local-first BYOK. Reaproveitamos o que reduz decisão do usuário e amplia a capacidade do agente local.
- **2026-09-08** — Prioridade P0 definida como **skills sob demanda + workflows (slash commands) + permissões
  declarativas por tool**, sobre um **núcleo único de extensões declarativas** (Fase 0). Motivo: as três dependem
  do mesmo núcleo de descoberta/validação/escopo; implementar separado triplicaria o custo.
- **2026-09-08** — **Fora de escopo**: autocomplete de IDE, plugins de IDE, builds para JetBrains/VS Code/Slack/mobile/CLI,
  gateway público de modelos e App Builder na nuvem. Motivo: contrariam o diferencial local-first/BYOK do `PRODUCT.md`
  (o Kilo, aliás, descontinuou o App Builder dele).
- **2026-09-08** — Tool `bash` irrestrita **não** será adotada. Motivo: o sandbox MustardScript
  (`execute_sandbox_script`) + `run_repo_command` restrito a verificação é decisão de segurança, não lacuna.
- **2026-09-08** — Enforcement de permissões sempre no processo main (`registerTrustedIpcHandler`), nunca na UI.
  Motivo: qualquer regra aplicada só no renderer é bypass.
- **2026-09-08** — **Fase 0 entregue** (`REQ-01`, `REQ-02`): núcleo de extensões declarativas em
  `src/shared/extensions.ts` + `src/ipc/services/extensions/`, contrato `extensions:list` e seção
  "Extensões do projeto" na Library. Motivo: skills sob demanda (REQ-03), workflows (REQ-04) e agentes
  custom (REQ-06) dependem deste núcleo. Escopos: projeto em `<app>/.samba/{skills,commands,agents}` e
  usuário em `<userData>/extensions/{skills,commands,agents}`; projeto substitui usuário **com aviso**;
  link simbólico é ignorado; conteúdo inválido vira aviso, nunca quebra a listagem.
- **2026-09-08** — `@testing-library/dom` passa a ser declarado em `devDependencies`. Motivo: é peer de
  `@testing-library/react` e não estava no `package.json` deste fork, o que quebrava **todos** os testes de
  componente (falha pré-existente, reproduzida em `NativeSkillsLibrary.test.tsx` antes da correção).
- **2026-09-08** — Corrigido o aviso "This chat context is running out" que continuava aparecendo depois de resumir.
  Causa: o banner comparava `maxTokensUsed` — o **pico do último turno**, persistido em
  `src/ipc/handlers/token_count_handlers.ts:270` — com a janela do modelo, e o turno de "Summarize to new chat" lê a
  conversa antiga inteira; o pico continuava alto no chat novo e pequeno. Correção: o pico de um turno de summarize é
  ignorado (`resolveActualMaxTokens` em `src/ipc/utils/token_utils.ts`), então o aviso volta a refletir o que o chat
  realmente vai enviar. Decisão: avisar sobre limite/custo de contexto continua sendo o objetivo, mas nunca com um
  número que não corresponde ao próximo pedido.
- **2026-09-08** — `REQ-03` (skills sob demanda) com o núcleo pronto: tool `load_skill` lista e carrega skills de
  `.samba/skills` (projeto) e da pasta de extensões do usuário, com precedência de projeto, revalidação no disco e
  limites de tamanho. Falta para fechar o requisito: injetar só os **metadados** das skills no prompt do agente,
  cartão de UI para a chamada da tool e respeitar o campo `modes` por modo de chat.

## Escopo (versão atual)

**Dentro:** Fases 0–3 do plano (`REQ-01` a `REQ-15`) — fundação de extensões, skills sob demanda, workflows,
permissões, agentes/subagentes custom, goals, checkpoints, tools `apply_patch`/`todoread`, indexação semântica
opt-in, marketplace estendido (skill/agente além de MCP), Agent Manager, enhance prompt e mensagem de commit.

**Fora (com data e motivo):** plataformas IDE/CLI/Slack/mobile · gateway público de modelos · autocomplete e code
actions de IDE · App Builder na nuvem · code reviews de PR como serviço (depende de infra de servidor inexistente
por decisão de produto) · orquestração tipo Gastown · agentes gerenciados por organização (encosta em
`docs/adrs/0003`, ainda "Proposed").

## Requisitos

| ID | Requisito | Aceite (resumo) | Status | Dono |
|----|-----------|-----------------|--------|------|
| REQ-01 | Núcleo de extensões declarativas (descoberta por escopo projeto/usuário + validação) | Extensões válidas listadas; frontmatter inválido ignorado com log e sem quebrar o app | entregue | agente |
| REQ-02 | Contrato IPC + estado das extensões com enforcement no main | Payload inválido do renderer rejeitado com `SambaError` | entregue (listagem) | agente |
| REQ-03 | Skills sob demanda por `description` (além do slash atual `/samba-*`) | Skill de projeto entra no contexto sem slash, só na etapa relevante; escopo por modo respeitado; skill de terceiro não ganha tools | em_andamento (tool `load_skill` entregue) | agente |
| REQ-04 | Workflows: slash commands de projeto/usuário com frontmatter | `/comando` injeta instrução e respeita `agent`; comando inexistente não altera o prompt | proposto | a definir |
| REQ-05 | Permissões declarativas `allow`/`ask`/`deny` + "aprovar sempre" + `external_directory` | `edit: {"*.env": deny}` bloqueia no main, com erro recuperável e mostra a regra; "aprovar sempre" persiste | proposto | a definir |
| REQ-06 | Agentes custom em Markdown (`primary`/`subagent`/`all`) | Agente de projeto aparece no seletor sem quebrar os 4 modos built-in | proposto | a definir |
| REQ-07 | Subagentes custom com `@agente` e execução em background | `@agente` invoca sessão isolada; tarefa longa retorna depois sem travar o turno | proposto | a definir |
| REQ-08 | Goals de sessão (`/goal`) com status e relatório | Estado sobrevive a restart; pause/resume/clear consistentes; relatório final no chat | proposto | a definir |
| REQ-09 | Checkpoints com "reverter para aqui" | Reverter para o turno N restaura o workspace, com banner visível e revert reversível | proposto | a definir |
| REQ-10 | Tools `apply_patch` e `todoread` | Patch unificado aplicado com verificação; lista de todos legível pelo agente | proposto | a definir |
| REQ-11 | Indexação semântica opt-in (chunks + embeddings + busca vetorial) | Desligada não gera embedding algum; ligada, busca por significado acha o arquivo sem termo exato | proposto | a definir |
| REQ-12 | Marketplace estendido: instalar skill e agente além de MCP | Item instalado por escopo (projeto/global) e descoberto pelo sistema de extensões | proposto | a definir |
| REQ-13 | Agent Manager (sessões paralelas em worktrees + diff) | Sessões isoladas em worktrees, diff vs. branch pai visível | proposto | a definir |
| REQ-14 | Enhance prompt | Prompt reescrito antes do envio, com prévia e opção de desfazer | proposto | a definir |
| REQ-15 | Geração de mensagem de commit | Mensagem clara no padrão conventional commits, revisável antes de commitar | proposto | a definir |

### Evidências da Fase 0 (2026-09-08)

- `npx vitest run src/ipc/services/extensions src/components/ProjectExtensions.test.tsx src/components/NativeSkillsLibrary.test.tsx`
  → **24 testes verdes em 4 arquivos** (9 descoberta, 10 frontmatter, 3 componente, 2 pré-existentes reparados).
- `oxfmt --check` e `oxlint` sem avisos nos 13 arquivos tocados.
- Type-check focado nos arquivos novos: 0 erros. `npm run ts` global ainda falha **apenas** em
  `testing/fake-llm-server/*` por falta de `@types/express` — pré-requisito de ambiente já documentado no
  `AGENTS.md` (rodar `npm install` dentro de `testing/fake-llm-server/`), não relacionado a esta fase.
- Ainda **não** coberto: autoria/instalação de extensão pela UI (entra em REQ-03/REQ-12) e E2E da Library.

### Evidências do REQ-03 e do aviso de contexto (2026-09-08)

- `npx vitest run src/pro/main/ipc/handlers/local_agent/tools/load_skill.spec.ts src/ipc/services/extensions src/ipc/utils/token_utils.test.ts`
  → **49 testes verdes** (8 da tool, 19 das extensões, 22 de tokens).
- Testes novos do banner adicionados em `src/ipc/handlers/__tests__/context_limit_banner.integration.test.tsx`; a suíte é
  **integration** e só roda onde o harness tem `testing/fake-llm-server/node_modules` — neste ambiente ela não executa
  (mesmo pré-requisito do `AGENTS.md`).
- Limite de ambiente encontrado: suítes que abrem banco falham com `better-sqlite3` compilado para outro ABI
  (`NODE_MODULE_VERSION 143` vs 137) — é preciso `npm rebuild better-sqlite3`. Falha pré-existente, reproduzida em
  `read_chat.spec.ts`/`search_chats.spec.ts`/`explore_chat_history_subagent.spec.ts`, sem relação com estas mudanças.

Já existentes (não são requisitos novos): context condensing/compaction, todo list na UI, voice-to-text,
catálogo MCP, consumo de `AI_RULES.md`, undo/redo git por chat.

## Conexões (trabalho entre agentes/módulos)

- **Skills ↔ modos ↔ prompts:** mexer em skills toca `src/shared/load_native_skill.ts`/`native_skills.ts`, os modos
  (`rules/chat-modes.md`) e a montagem de prompt (`src/prompts/local_agent_prompt.ts`). Quem mexer em modo precisa
  revalidar o escopo das skills.
- **Permissões ↔ IPC ↔ consentimento:** `src/ipc/handlers/trusted_handle.ts`, `AgentConsentBanner`,
  `AutoApproveMcpSwitch`/`AutoApproveSqlSwitch`. Regra nova de permissão precisa de teste negativo de bypass.
- **Indexação ↔ code_explorer ↔ Córtex:** worker `workers/code_explorer` hoje faz busca lexical (BM25); indexação
  semântica é evolução dele. O Córtex (MCP) permanece a fonte de conhecimento do cliente, não de código.
- **Checkpoints ↔ undo/redo ↔ máquinas de estado:** `ExtraCommitsRevertDialog.tsx`, `plans/better-undo-redo.md`,
  `plans/better-state-machine.md` e `rules/state-machines.md` — mudança de checkpoint deve seguir o padrão de máquina
  de estado já adotado.
- **Marketplace ↔ catálogo MCP:** `src/components/plugins/catalog/*`, `src/ipc/shared/remote_mcp_catalog.ts`,
  tabela `mcp_catalog` (`src/db/schema.ts`) — estender o mesmo fluxo em vez de criar um segundo.
- **Governança/entrega:** features de produto entram no fluxo de `docs/samba-delivery-workflow.md` e nas evidências
  de `docs/samba-test-evidence.md`.

## Riscos

1. **Custo de contexto das skills** — carregamento sob demanda pode inflar o prompt; medir com o benchmark de
   compactação antes de habilitar por padrão.
2. **Segurança de permissões** — só é segura com enforcement no main + teste negativo; UI é apenas explicação.
3. **Indexação exige provedor de embeddings (pago, do usuário)** — precisa ficar opt-in e nunca virar requisito
   para usar o app; decisão de produto, não técnica.
4. **Marketplace e curadoria** — instalar skill/agente de terceiros amplia superfície de ataque; precisa de regra de
   assinatura/versão e revisão humana antes de publicar.
5. **Escopo** — a Fase 3 (Agent Manager) é a mais propensa a virar trimestre; não deve começar antes de goals e
   checkpoints, que ela consome.
