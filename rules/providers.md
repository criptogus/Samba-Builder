# Provider rules (language model providers)

Leia antes de mexer em qualquer código de providers: handlers, filtros de
modelos, modo auto, lookup por id. A cadeia de bugs de 2026-09-08 (provider
`deepseek-samba` "Ready" mas modo auto sem modelos) nasceu de violar estas
regras.

## O prefixo `custom::` e os providers legados

Providers custom são gravados no banco (`language_model_providers`) com o id
prefixado `CUSTOM_PROVIDER_PREFIX = "custom::"` (para nunca colidir com os
builtin). **Providers criados ANTES do prefixo existir (ex.: `deepseek-samba`)
têm o id cru no banco — mas SÃO custom.** Os modelos apontam para eles via
`language_models.custom_provider_id` (id cru, consistente).

## Regras de ouro

1. **Nunca detecte "é custom?" pelo prefixo do id.** Use o tipo real vindo do
   banco (`getLanguageModelProviders()` → `provider.type === "custom"`).
   Detectar por prefixo trata o provider legado como builtin → consulta
   `builtin_provider_id` (NULL) → zero modelos → o modo auto reporta
   "Nenhum provider conectado" mesmo com a chave salva.
2. **Lookups por id** (edit/delete de provider) devem casar id cru OU
   prefixado: `where(or(eq(id, x), eq(id, CUSTOM_PROVIDER_PREFIX + x)))`.
   Buscar só com o prefixo falha para providers legados ("Provider with ID ...
   not found").
3. **Updates preservam o id armazenado** — nunca re-prefixar no `.set()`: um
   provider legado re-prefixado ficaria órfão dos modelos (que apontam para o
   id cru) e do `providerSettings` no user-settings.
4. **O campo `envVarName` dos handlers create/edit espera o NOME de uma
   variável de ambiente** (UPPER_SNAKE, ex. `DEEPSEEK_API_KEY`), nunca a chave.
   Colar uma chave ali a grava como nome de env var no banco; o lookup
   (`getEnvVar`) não acha e o provider fica "desconectado" sem explicação. A
   validação `assertValidEnvVarName` (recusa valores que parecem chave) já
   existe — mantenha-a.

## Onde a chave vive

- Provider (id/name/base URL/env var name) e modelos → `sqlite.db` (drizzle).
- A chave em si → `userData/user-settings.json`
  (`providerSettings.<id>.apiKey.value`, safeStorage) — fora do git.
- `writeSettings` faz **merge por provider**: um `providerSettings` parcial
  preserva os providers não tocados (e suas chaves). Remoção é explícita:
  `provider: undefined`. Se o arquivo estiver ilegível, a escrita **aborta**
  (nunca sobrescreve com defaults).

Locais sensíveis: `src/ipc/shared/language_model_helpers.ts`
(`getLanguageModels`, `getLanguageModelProviders`),
`src/ipc/handlers/language_model_handlers.ts` (create/edit),
`src/ipc/utils/get_model_client.ts` (modo auto),
`src/main/settings.ts` (`writeSettings`).
