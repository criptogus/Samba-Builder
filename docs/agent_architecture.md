# Agent Architecture

Previously, Samba used a pseudo tool-calling strategy using custom XML instead of model's formal tool calling capabilities. Now that models have gotten much better with tool calling, particularly with parallel tool calling, it's beneficial to use a more standard tool calling approach which will also make it much easier to add new tools.

- The heart of the local agent is in `src/pro/main/ipc/handlers/local_agent/local_agent_handler.ts` which contains the core agent loop: which keeps calling the LLM until it chooses not to do a tool call or hits the maximum number of steps for the turn.
- `src/pro/main/ipc/handlers/local_agent/tool_definitions.ts` contains the list of all the tools available to the Samba local agent.

## Add a tool

If you want to add a new tool, you will want to create a new tool in the `src/pro/main/ipc/handlers/local_agent/tools` directory. You can look at the existing tools as examples.

Then, import the tool and include it in `src/pro/main/ipc/handlers/local_agent/tool_definitions.ts`

Finally, you will need to define how to render the custom XML tag (e.g. `<samba-$foo-tool-name>`) inside `src/components/chat/SambaMarkdownParser.tsx` which will typically involve creating a new React component to render the custom XML tag.

## Consentimento e evidência

Toda tool declara no `ToolDefinition` o que faz e **quando precisa de aprovação**. Duas regras que não podem ser quebradas ao adicionar uma tool:

- `defaultConsent` define o padrão, mas **ação irreversível sempre pede aprovação**. A classificação de comandos de repositório vive em `tools/command_risk.ts` (publicar, destruir, rede, `sudo`, dependências) e avalia cláusula por cláusula (`npm test && git push` é barrado pelo `git push`; `--dry-run` não pede). Um aviso de risco **fura o "sempre permitir"** do usuário.
- `modifiesState` alimenta os guardas de leitura/plano: uma tool que muda estado não pode ser apresentada como leitura.

O agente também precisa **provar** o que fez: rode a verificação do projeto tocado e registre a evidência no padrão de entrega (`src/delivery`). O relato do modelo não substitui a execução — ver `docs/samba-test-evidence.md`.

Para a visão geral do produto e dos fluxos, veja [architecture.md](architecture.md).

## Testing

You can add an E2E test by looking at the existing local agent E2E tests which are named like `e2e-tests/local_agent*.spec.ts`

You can define a tool call testing fixture at `e2e-tests/fixtures/engine` which allows you to simulate a tool call.
