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
| REQ-01 | Núcleo de extensões declarativas (descoberta por escopo projeto/usuário + validação) | Extensões válidas listadas; frontmatter inválido ignorado com log e sem quebrar o app | proposto | a definir |
| REQ-02 | Contrato IPC + estado das extensões com enforcement no main | Payload inválido do renderer rejeitado com `SambaError` | proposto | a definir |
| REQ-03 | Skills sob demanda por `description` (além do slash atual `/samba-*`) | Skill de projeto entra no contexto sem slash, só na etapa relevante; escopo por modo respeitado; skill de terceiro não ganha tools | proposto | a definir |
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
