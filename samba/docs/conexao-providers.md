# Conexão de Providers (BYOK) — guia e troubleshooting

Como conectar um provider de LLM no Samba Builder (BYOK — a chave do usuário,
sem backend) e o que cada erro significa. Consolidado em 2026-09-08 após a
cadeia de bugs do provider DeepSeek (`deepseek-samba`).

## Como conectar (o fluxo correto)

1. **Settings → Providers** → selecione o provider (ex.: DeepSeek).
2. No painel do provider, cole a chave no campo **"API Key"** (com os botões
   Save/Test) — é o campo principal, NÃO o form de edição do provider.
3. Save (ou Test) → o card do provider mostra **"Ready"**.
4. No chat, o modelo **Auto** resolve para o primeiro provider conectado.

> ⚠️ **O form de edição do provider** (o "lápis"/edit) tem o campo
> "Environment variable name" — ele espera o **NOME** de uma variável de
> ambiente (ex.: `DEEPSEEK_API_KEY`), **não a chave**. Colar a chave ali a
> grava como nome de env var no banco; o lookup então procura uma variável de
> ambiente com aquele nome (não existe) e o provider fica "desconectado" sem
> explicação. Desde 2026-09-08 o app **recusa** chave nesse campo com uma
> mensagem clara (`looksLikeAnApiKey` em `language_model_handlers.ts`).

## Erros e significados

| Erro                                       | Causa                                                                                                             | Correção                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Nenhum provider conectado via API…`       | O modo auto não achou nenhum provider com chave E modelos                                                         | 1) Chave salva no campo API Key? 2) Provider tem modelos? 3) Bug do prefixo (abaixo) — já corrigido |
| `Provider with ID "X" not found` (no edit) | Provider **legado** (id sem o prefixo `custom::`) não era achado pelo lookup prefixado                            | Corrigido: o lookup aceita id cru OU prefixado                                                      |
| "Ready" no card MAS erro no chat           | O filtro de modelos tratava o provider legado como builtin (consulta `builtin_provider_id` = NULL → zero modelos) | Corrigido: filtro usa o tipo real do provider (do banco)                                            |
| Chave some do `user-settings.json`         | Escrita parcial sobrescrevia o mapa de providers inteiro (spread raso)                                            | Corrigido: merge por provider; remoção explícita via `undefined`                                    |

## Arquitetura: o prefixo `custom::` e os providers legados

Providers custom são armazenados no banco com o id prefixado
(`CUSTOM_PROVIDER_PREFIX = "custom::"`) para nunca colidir com os builtin.
**Providers criados antes do prefixo existir (ex.: `deepseek-samba`) têm o id
cru no banco mas SÃO custom.**

Regras de ouro para o código (a fonte dos 3 bugs de 2026-09-08):

1. **Nunca detecte "é custom?" pelo prefixo** — use o tipo real vindo do
   banco (`getLanguageModelProviders()` → `provider.type === "custom"`). O
   prefixo é detalhe de armazenamento, não de identidade.
2. **Lookups por id** (edit/delete de provider) devem casar id cru OU
   prefixado (`eq(id, x) OR eq(id, CUSTOM_PROVIDER_PREFIX + x)`).
3. **Updates preservam o id armazenado** (nunca re-prefixar: um provider
   legado re-prefixado ficaria órfão dos seus modelos, que apontam para o id
   cru via `custom_provider_id`).
4. `language_models.custom_provider_id` dos modelos antigos aponta para o id
   cru — consistente com o provider cru no banco.

Locais sensíveis: `src/ipc/shared/language_model_helpers.ts`
(`getLanguageModels` — filtro), `src/ipc/handlers/language_model_handlers.ts`
(create/edit — prefixo), `src/ipc/utils/get_model_client.ts` (modo auto).

## Onde a chave vive

- O provider (id/name/base URL/env var name) → `sqlite.db`
  (`language_model_providers`); os modelos → `language_models`.
- **A chave em si** → `userData/user-settings.json`
  (`providerSettings.<id>.apiKey.value`, criptografado via safeStorage) —
  **fora do git** (`userData/` no `.gitignore`).
- O `user-settings.json` tem backup automático (`.bak`) a cada escrita; se o
  arquivo estiver ilegível, o app **aborta a escrita** (nunca sobrescreve com
  defaults) desde 2026-09-08.
