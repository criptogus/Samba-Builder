# O que aprender com o Open Code Review (Alibaba) para o nosso Reviewer

> **Status (2026-09-08):** o viável sem instalar nada foi implementado — `REQ-25` (regras determinísticas),
> `REQ-26` (cobertura declarada) e `REQ-27` (ancoragem de linha) estão no código, com placar do ruleset. Continuam
> abertos: `REQ-28` (modo scan), o placar do **modelo** em `REQ-29` e `REQ-30` (decisão do humano).
>
> Análise de 2026-09-08 a partir de evidência direta do repositório
> [`alibaba/open-code-review`](https://github.com/alibaba/open-code-review) (branch `main`): metadados, README,
> layout de `docs/`, `internal/` e raiz — e da leitura do nosso próprio Reviewer. Nada aqui foi implementado.

## 1. O que o projeto deles é (fatos)

- **OpenCodeReview (OCR)** — CLI de code review com IA, Go, Apache-2.0, ~31k estrelas, criado em 2026-05 e com
  commits no mesmo dia desta análise. Nasceu como assistente interno de review da Alibaba ("tens of thousands of
  developers", "millions of code defects") e foi aberto.
- **Arquitetura híbrida, declarada no próprio resumo do repo**: *"deterministic pipelines + LLM Agent, precise
  line-level comments, built-in multi-language ruleset (NPE, thread-safety, XSS, SQL injection)"*.
- **Como funciona**: lê o diff do Git, envia os arquivos alterados para um LLM com **tool-use** (ler arquivo
  completo, buscar no código, inspecionar outros arquivos do mesmo changeset) e produz comentários estruturados
  **ancorados por linha**. Além do diff, `ocr scan` revisa **arquivos inteiros** (sem diff) para auditar bases
  desconhecidas ou diretórios sem mudança relevante.
- **Os três problemas que ele diz existir em agentes genéricos** (o argumento de venda, e a lista de defeitos a
  evitar): **cobertura incompleta** ("agents cut corners on larger changesets"), **position drift** ("reported
  issues frequently don't match the actual code location") e **qualidade instável**.
- **Benchmark public**: AACR-Bench — 50 repositórios, 200 PRs reais, 10 linguagens, 1.505 defeitos anotados por
  80+ engenheiros. Métricas: F1, Precision, Recall, tempo médio, tokens médios. Alega **precisão/F1 maiores com o
  mesmo modelo gastando ~1/9 dos tokens**, e **recall menor de propósito** (trocar cobertura por menos ruído).
- **Formato de entrega**: CLI, pacote npm `@alibaba-group/open-code-review`, **GitHub Action** (`action.yml`),
  scripts de install, `plugins/`, `extensions/`, `skills/`, `.claude-plugin/`, config em `.opencodereview/`.
  Apoia Claude Code, Codex e Cursor — ou seja, **plugam o reviewer dentro de harnesses de agentes existentes**.
- **Organização interna (Go)**: `agent`, `config`, `delegate`, `diff`, `gitcmd`, `llm`, `llmloop`, `mcp`, `model`,
  `pathutil`, `scan`, `session`, `suggestdiff`, `telemetry`, `tool`, `viewer`. Documentos que chamam atenção:
  `ASSURANCE_CASE.md`, `ROADMAP.md`, `GOVERNANCE.md` e badge OpenSSF Gold.

## 2. O que nós já temos

O nosso Reviewer é um **subagente do agente local**, embutido no app:

| Peça | Onde | O que faz |
|---|---|---|
| Alvo do review | `src/pro/main/ipc/handlers/local_agent/subagents/review_target.ts` | Monta o diff do Git entre commits, com **orçamento por arquivo (96 KiB) e total (192 KiB)** e **lista de exclusões com motivo** (binário, limite por arquivo, limite agregado), além de um hash do conjunto |
| Saída estruturada | `.../subagents/review_result.ts` | Zod: `status: findings \| no_findings \| partial`, findings com `severity/path/line?/title/impact/remediation` (máx. 100), `summary` |
| Confiança na saída | `.../review_result.ts` | A saída do modelo é tratada como **não confiável**: JSON inválido ou `path` fora dos arquivos revisados vira `status: "partial"` — nunca "review limpo" |
| Persona e modelo | `subagent_manager.ts` | `reviewer` com modelo próprio e prompt "Samba Builder Reviewer. Be independent, concise, evidence-based, and read-only." |
| Regras de segurança já escritas | `src/prompts/supabase_prompt.ts`, `neon_prompt_rules.ts` | `SUPABASE_SERVICE_ROLE_BROWSER_RULE`, `SUPABASE_GRANTS_AND_RLS_RULE`, `NEON_NO_BROWSER_DATABASE_URL_RULE`… |

Ou seja: **temos a metade "LLM" da arquitetura híbrida e boa parte do rigor de formato**. Falta a metade
determinística e a medição.

## 3. Gaps, em ordem de retorno

### A. Pré-passe determinístico — `REQ-25` (P1, ~3–5 dias)

Eles rodam um conjunto de regras **antes/acima** do LLM; nós jogamos tudo no modelo, inclusive coisas que são
verificação mecânica. E as regras que importam para os nossos apps já estão escritas como *instruções* de prompt
(o que depende do modelo lembrar) em vez de *checagens* (o que não depende).

- Candidatas, todas verificáveis por análise do diff: `dangerouslySetInnerHTML`/`innerHTML` (XSS), concatenação
  em SQL, **service role do Supabase no browser**, **variável sensível exposta ao cliente**
  (`VITE_*`/`NEXT_PUBLIC_*`), **tabela nova sem RLS**, segredo em arquivo versionado.
- Entregável: `src/ipc/services/review/ruleset/` produzindo findings no **mesmo schema** (`severity/path/line/
  title/impact/remediation`) e mesclados aos do modelo, com origem marcada (`rule:<id>` vs `model`).
- **Aceite:** Given um diff que introduz `service_role` em código de browser, Then o finding aparece mesmo com o
  modelo falhando ou devolvendo JSON inválido. Given um diff limpo, Then nenhuma regra produz ruído.

### B. Cobertura explícita no resultado — `REQ-26` (P1, ~2 dias)

Já calculamos `exclusions` com motivo, mas isso **não chega ao resultado**: o Reviewer pode devolver
`no_findings` tendo ignorado metade dos arquivos, e nada denuncia. É exatamente o defeito nº 1 da lista deles.

- Entregável: campo de cobertura na saída (`filesReviewed`, `filesExcluded` com motivo) e regra de consistência:
  arquivo alterado que não foi revisado **nem excluído** rebaixa o status para `partial`.
- **Aceite:** Given 10 arquivos alterados e 4 excluídos por limite, Then o relatório diz "6 de 10 revisados" e o
  motivo de cada exclusão. Given um arquivo alterado não coberto, Then `status: "partial"`, nunca `no_findings`.

### C. Ancoragem de posição — `REQ-27` (P1, ~2 dias)

`line` hoje é texto livre: nada confirma que aquela linha pertence ao diff. Eles tratam "position drift" como
defeito de primeira classe.

- Entregável: validar cada finding contra os **hunks do diff** (linha alterada) usando o `review_target` que já
  temos; finding fora do diff é marcado como não ancorado em vez de exibido como se estivesse.
- **Aceite:** Given um finding em linha que não pertence ao diff, Then ele é marcado/descartado com motivo
  visível, e o relatório informa quantos ficaram sem âncora.

### D. Modo scan (sem diff) — `REQ-28` (P2, ~3 dias)

`ocr scan` revisa arquivos inteiros. Nós só revisamos diff — e temos um fluxo de **importar app** em que a
pergunta natural do usuário é "esse código que eu trouxe é seguro?".

- **Aceite:** Given um app importado sem alterações, Then é possível pedir uma revisão de arquivos/diretórios
  escolhidos, com o mesmo formato de findings e os mesmos limites de orçamento.

### E. Medir a qualidade do review — `REQ-29` (P2, ~4 dias)

Nós **não temos nenhum número** sobre o nosso Reviewer: nem precisão, nem cobertura, nem custo. Sem isso, toda
comparação é opinião — e eles ganharam a discussão justamente publicando medição.

- Entregável: vocabulário e placar (precision, recall, F1, tokens, tempo) + um fixture interno com defeitos
  plantados (segredo no cliente, RLS ausente, XSS, SQL concatenado) para rodar a cada mudança do Reviewer.
- **Aceite:** Given o fixture, Then o comando produz o placar; mudanças no prompt/regras que piorarem precision
  aparecem no diff do número, não em impressão.

### F. Revisão fora do app (CLI/Action) — `REQ-30` (P3, revisa decisão anterior)

No plano de paridade com o Kilo eu registrei "code reviews de PR **fora de escopo** porque exigiria infra de
servidor". O OCR mostra que existe um caminho **sem servidor nosso**: binário/CLI + GitHub Action, com a chave do
usuário (BYOK), o que é coerente com o nosso "local-first". Isso **não** é copiar o produto deles; é admitir que a
decisão anterior estava baseada numa premissa que o mercado já resolveu de outro jeito. Decisão de produto, não
técnica — fica registrada para o humano decidir.

## 4. O que **não** copiar

- **Reescrever em Go / virar CLI-first.** Nosso Reviewer vive onde o usuário está (dentro do app, sobre o que o
  agente acabou de mudar). O valor a importar é a *arquitetura híbrida* e o rigor de medição, não a linguagem.
- **Baixar recall sem medir.** Eles podem trocar recall por precisão porque sabem quanto perderam. Sem placar
  interno (item E), a mesma escolha vira só "revisar menos".
- **Regras sem contexto de projeto.** Um ruleset fixo multi-linguagem gera ruído em quem não usa aquela stack; as
  nossas regras devem ser por capacidade detectada (Supabase conectado? Vite? etc.), reusando o que já existe em
  `frameworkType`/`resolveLinkedDatabaseProvider`.

## 5. Fontes

- README, metadados (Apache-2.0, Go, ~31k estrelas, topics `agent`, `agent-skills`, `code-review`,
  `repository-level-context`), árvore de raiz, `docs/` e `internal/` de
  `github.com/alibaba/open-code-review`.
- Nosso código: `review_target.ts`, `review_result.ts`, `subagent_manager.ts`, `supabase_prompt.ts`,
  `neon_prompt_rules.ts` (caminhos citados na seção 2).
