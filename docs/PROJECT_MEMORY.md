# Project Memory — Samba Builder

Memória técnica do projeto (repo importado). Produto vive em `docs/PRODUCT_MEMORY.md`.

## Repository map

Fork do Dyad: app desktop Electron que gera e roda apps com agentes de IA.

- **Stack:** Electron 40 (pin exato), React 19, TypeScript 6 (`tsgo`), Vite 6 (configs separadas: `vite.main`, `vite.preload`, `vite.renderer`, `vite.sandbox-worker`, `vite.code-explorer-worker`, `vite.supabase-dependency-analysis-worker`), electron-forge (package/make/publish), Drizzle ORM + better-sqlite3 (DB local), Tailwind 4 + shadcn/Base UI, TanStack Router/Query, jotai (→ hooks), zod 4 como contrato de IPC, vitest (unit) + Playwright (e2e), oxlint/oxfmt.
- **Entrypoints:** `src/main_bootstrap.ts` → `src/main.ts` (main process), `src/preload.ts` (contextBridge com allowlist de canais derivada dos contratos), `src/renderer.tsx` + `src/router.ts` (renderer), `workers/` (2 workers TS), `samba/` (tooling Python), `scaffold/` (template das apps geradas), `packages/` (`pg-schema-classifier`, `ts-pg-schema-diff`, `samba-factory`).
- **Mapa de `src/` (2.255 arq., 772 de teste):** `ipc` 599 (contratos `ipc/types`, handlers `ipc/handlers`, `ipc/utils`, serviços `ipc/services`) · `components` 491 · `pro` 180 (local agent, subagents, tools) · `hooks` 139 · `shared` 72 · `distributed_machines` 46 · `state_machines` 34 · `main` 30 (infra Electron) · `window_infrastructure` 29 · `coolify_setup`/`coolify_deploy` 42 · `app_run` + `app_wiring` 23 · `i18n` 28 · `testing` 22 (harnesses).
- **Outros:** `rules/` (31 regras de engenharia), `docs/adrs/` (+ `docs/adr/`), `docs/architecture.md`, `plans/` (92 planos), `e2e-tests/` (145 specs), `helpers` de teste e evals em `src/__tests__/evals`.
- **Escala:** 3.524 arquivos rastreados; `src/db/schema.ts` com 946 linhas; maiores handlers: `chat_stream_handlers.ts` (130 KB), `app_handlers.ts` (94 KB), `git_utils.ts` (94 KB), `local_agent_handler.ts` (103 KB).

**Limites de verificação neste ambiente (pré-existentes, não do código):** (1) `npm run ts` falha em `testing/fake-llm-server/*` por falta de `@types/express`; (2) suítes `*.integration.*` do harness de chat falham por falta de `testing/fake-llm-server/node_modules` (`git-http-mock-server`, `express`, `cors`); (3) suítes que abrem banco falham com `better-sqlite3` compilado para outro ABI (`NODE_MODULE_VERSION 143` vs 137), exigindo `npm rebuild better-sqlite3`. Suítes unitárias sem banco e sem o harness de chat rodam normalmente.

## Active task — incrementos do DeepSeek Harness (retomar daqui)

Plano: `plans/deepseek-harness-learnings.md`. Entregue em 2026-09-08 (130 testes verdes; tipos e lint limpos
nos arquivos tocados):

- **`REQ-21`** registry/formato único: `src/ipc/services/extensions/catalog.ts` — catálogo e corpo num só
  formato, consumido pela tool `load_skill` (catálogo e tool não podem divergir).
- **`REQ-22`** spill: `src/ipc/services/spill/{spill_store,spill_policy}.ts`, ligado no `read_file` — arquivo
  maior que o limite vira preview + localizador com o conteúdo íntegro salvo; falha de escrita volta ao
  truncamento antigo (o resultado nunca piora por causa do spill).
- **`REQ-23`** catálogo gerado: `npm run gen:tool-catalog` (51 tools) e `--check` para CI;
  `docs/tool-catalog.md` está no `ignorePatterns` do `.oxfmtrc.json` por ser gerado.

- **`REQ-03`** catálogo de skills no prompt: `src/ipc/services/extensions/prompt_catalog.ts` monta o bloco
  (teto de 20 skills + aviso do restante) e o prompt do agent o publica em `<available_skills>`. **Paridade de
  tokens garantida**: os quatro call sites de `constructSystemPrompt` — três em `chat_stream_handlers.ts` e o
  cálculo em `token_count_handlers.ts` — recebem o mesmo catálogo. O modo plan usa outro prompt e ignora o
  parâmetro de propósito.
- **`REQ-20`** guardas de loop: `src/pro/main/ipc/handlers/local_agent/loop_guard.ts` (chamada repetida idêntica
  vira lembrete no resultado; teto de tempo por tool vira erro claro) ligado no ponto único de execução,
  `tool_definitions.ts` (`tool.execute`). O lembrete entra só no resultado que o modelo vê — a contagem de
  mutações continua lendo o resultado limpo.

**Falta (Fase 3, sem data):** `REQ-24` workflow como script de orquestração e o refinamento do `REQ-08`
(goal: estado durável × motor de continuação opt-in).

Verificação: `npx vitest run src/ipc/services/extensions src/ipc/services/spill
src/pro/main/ipc/handlers/local_agent/loop_guard.spec.ts
src/pro/main/ipc/handlers/local_agent/tools/{load_skill.spec.ts,read_file.spec.ts,provider_tool_routing.test.ts}
src/prompts/local_agent_prompt{,_skill_catalog}.test.ts src/ipc/utils/token_utils.test.ts
src/components/ProjectExtensions.test.tsx` → **203 testes**; tipos limpos nos arquivos tocados;
`oxlint`/`oxfmt --check` limpos; `npm run gen:tool-catalog -- --check` atualizado.

## Mapa da integração com GitHub (interface e main)

- **Interface:** `src/components/GitHubConnector.tsx` (conectar repo/org), `GitHubIntegration.tsx` (conectar/desconectar conta), `GithubBranchManager.tsx` (branches: criar, trocar, renomear, deletar, pull), `GithubCollaboratorManager.tsx` (colaboradores), `chat/CommitDialogActions.tsx` + `chat/CommitButtonLabel.tsx` (fluxo de commit do chat) e `GithubPullRequestActions.tsx` (pull request da branch atual — REQ-31).
- **Máquina de operações:** `src/github_ops/` (`state.ts` com `GithubOperation`, `transition.ts`, `projection.ts`, `transport.ts`, `capabilities.ts`). Operações longas (push/pull/rebase/merge/switch) passam por ela; **chamadas simples** de API seguem o padrão do `GithubCollaboratorManager` (client direto + react-query).
- **Contratos:** `src/ipc/types/github.ts` — `github:list-repos`, `get-repo-branches`, `is-repo-available`, `list-local-branches`, `list-remote-branches`, `list-collaborators`, `invite-collaborator`, `remove-collaborator`, `clone-repo-from-url`, **`get-pull-request`**, **`create-pull-request`**, **`merge-pull-request`**; git: `get-uncommitted-files`, `get-uncommitted-file-diff`, `commit-changes`, `cancel-commit`, `discard-changes`.
- **Main:** `src/ipc/handlers/github_handlers.ts` (token em `settings.githubAccessToken`, base da API em `getGitHubApiBase()`, que vira o servidor fake nos builds de teste), `src/ipc/utils/git_utils.ts` (`gitPush`, `gitMerge`, `gitCreateBranch`, `gitCurrentBranch`, `gitSetRemoteUrl`…) e `src/ipc/services/github/pull_request.ts` (regras puras de PR).
- **Não existe:** criação/merge de PR na máquina de operações ou como comportamento automático — hoje a ação é manual, na tela de branches.

## Reviewer — regras, cobertura e ancoragem (entregue 2026-09-08)

Inspirado no `plans/code-review-learnings.md` (Open Code Review). Três camadas novas, todas sem dependência nova:

- **`review_ruleset.ts`** (REQ-25): extrai as linhas **adicionadas** do diff (com número no arquivo novo) e roda 6
  regras conservadoras — XSS via `dangerouslySetInnerHTML`/`innerHTML`, SQL por concatenação, service role no
  cliente, segredo em variável pública (`VITE_`/`NEXT_PUBLIC_`), segredo literal, tabela nova sem RLS (esta olha o
  diff inteiro). Cada achado tem id estável (`rule:<id>`) e vai para o mesmo schema dos achados do modelo.
- **`review_finalize.ts`** (REQ-26/27): o revisor passa a **declarar** `reviewed_files`; arquivo enviado e não
  declarado rebaixa o status para `partial` e aparece no relatório. Cada achado do modelo é conferido contra as
  linhas adicionadas do diff — posição fora do diff vira "não confirmada", com contagem, em vez de posição falsa.
- **Fiação**: `subagent_manager.ts` trocou `parseReviewResult(report, target.files)` por
  `finalizeReview({ target, rawOutput })`, e o texto durável do chat passa a ser o relatório final (regras +
  cobertura + achados), não mais o texto bruto do modelo.

**Placar (REQ-29, parcial):** `review_ruleset.test.ts` tem defeitos plantados — recall 100% nas 6 regras e **zero
achados** num diff limpo realista (JSX com `map`, `VITE_API_URL`, query parametrizada, migração com RLS). O placar
do **modelo** (precisão/F1/custo) continua pendente. `REQ-28` (modo scan sem diff) e `REQ-30` (CLI/Action —
decisão do humano) não começaram.

## Comandos de verificação (do próprio repo)

| Objetivo | Comando |
| --- | --- |
| Tipos | `npm run ts` (tsgo no app + tsc nos workers) |
| Lint/format | `npm run presubmit` (`oxfmt --check` + `oxlint --fix`) |
| Unit | `npm test` (node --test dos scripts + `vitest run`) |
| E2E | `npm run pre:e2e` (build E2E) → `npm run e2e` (Playwright, 4 shards no CI) |
| Evals | `npm run eval` |
| Deps | `npm audit --audit-level=high` |

**Estado da importação:** `node_modules/` instalado. O install da plataforma usa `--legacy-peer-deps`, então **peer dependency não declarada no `package.json` não é instalada** (foi a causa de dois bloqueios reais: `@lexical/utils` no build do renderer e `@testing-library/dom` em todos os testes de componente). Sem `.env`/`.env.test`. O `engines.node` foi relaxado para `>=22 <26` porque o ambiente roda Node 22 e o `.npmrc` tem `engine-strict=true`. Vitest e `npm test` rodam; `npm run ts` falha em `testing/fake-llm-server/*` por falta de `@types/express` até rodar `npm install` dentro dessa pasta (ver `AGENTS.md`).

## Convenções observadas

- **IPC:** handler de produção passa por `registerTrustedIpcHandler` (`src/ipc/handlers/trusted_handle.ts`) → `assertTrustedRenderer` (`src/ipc/utils/renderer_security.ts`, valida frame principal + origem confiável). Contratos zod via `createTypedHandler` (`src/ipc/handlers/base.ts`). Exceção: `first_prompt_handlers.ts` registra com `ipcMain.on` manual (valida explicitamente, mas fora do helper).
- **Segredos:** `safeStorage` (`src/ipc/utils/secret_storage.ts`, `src/main/settings.ts`), com fallback base64 `plain:` e `encryptionType: "plaintext"` quando o keyring não está disponível.
- **Isolamento de renderer não confiável:** preview em `WebContentsView` sandbox (`src/main/preview_web_contents_view.ts`) e hardening central de janelas (`src/main/window_security.ts`).
- **Estilo de teste:** spec junto do código (`.test.ts`/`.spec.ts`), harnesses em `src/testing/`, evals em `src/__tests__/evals/`.
- **Lint legado:** coexistem `biome.json`, `.oxlintrc.json`, `.eslintrc.json`, `.prettierrc` e `.oxfmtrc.json`.

## Auditoria de segurança — baseline (estática, primeira sessão)

Achados priorizados (detalhe e correções na auditoria em chat):

- **A1** Electron `40.0.0` fixo com 30+ advisories herdadas (fix em `40.10.6`, mesma major).
- **A2** Segredos em base64/plaintext quando `safeStorage` indisponível (`secret_storage.ts`, `settings.ts`).
- **A3** `createLoggedHandler` loga `JSON.stringify(args)` sem redação (caminho legado de 16 módulos).
- **M1** Sem CSP no renderer privilegiado (`index.html` + nenhum `onHeadersReceived`).
- **M2** Host key SSH do Coolify com TOFU só em memória (`coolify_setup_handlers.ts`).
- **M3** `shell: true` ao executar `installCommand`/`startCommand` do app (`app_runtime_service.ts:548`, `runShellCommand.ts:15`).
- **M4** `docs/adrs/0003` (RBAC + policy layer + vault) segue "Proposed": distância entre intenção e código nos modos cloud/distributed.
- **M5** 49 vulnerabilidades de dependência (24 high, 10 moderate, 15 low); sem job de auditoria no CI e sem Dependabot/Renovate.
- **B1** `first_prompt_handlers.ts` fora do helper truste. **B2** `GITHUB_CLIENT_ID` hardcoded (client id de device flow, público). **B5** `.samba/` adicionado ao `.gitignore` ainda não commitado.

Defesas verificadas: trust guard de IPC, allowlist de canais no preload, contratos zod, sem `dangerouslySetInnerHTML` em `src/`, preview isolado com CSP no proxy, redação em telemetria/erros de git e MCP, guardas de traversal com testes negativos, credenciais git nunca na URL do remote.

## Pendências desta importação

- Estabelecer a linha de base completa: rodar `npm run ts` (bloqueado pelo item acima) e `npm test` integral; a suíte completa ainda não foi executada de ponta a ponta nesta máquina.
- Não revisado a fundo nesta sessão: scripts Python (`samba/`), NATIVE (`native/keychain-reader`), `scaffold/`, histórico git (scan de segredos só na árvore de trabalho).
