# Verificação do agente: de instrução para gate

## O problema

O agente local **já é instruído** a verificar o que escreve:

- `src/prompts/local_agent_prompt.ts:310` — *"After making code changes, use `run_type_checks` to verify that the changes are correct"*.
- `local_agent_prompt.ts:633` — *"Verify with the repo's own commands: before and after every change, run the repository's real verification (its test command and its type/lint command) — never leave the repo in a broken state, even mid-task"*.
- `local_agent_prompt.ts:643` — *"Execute in verifiable batches… after each batch run the repo's real verification"*.

E as ferramentas existem: `run_type_checks`, `run_repo_command`, `run_build` (ver `tools/run_type_checks.ts` e `tools/run_repo_command.ts`). As mensagens de falha dessas ferramentas já empurram o modelo a corrigir e rodar de novo.

O buraco não é capacidade — é **obrigatoriedade**. Nada impede o turno de terminar com o check nunca executado, ou executado e falhando. A verificação é uma instrução que o modelo pode cumprir ou ignorar; a entrega fica com aparência de pronta de qualquer jeito.

Consequência prática: erro entra no repositório e só aparece depois (num CI, num build, na mão de quem usa).

## O que já existe e serve de base

| Peça | Onde | Serve para |
|---|---|---|
| Ferramenta de typecheck com mensagens de correção | `tools/run_type_checks.ts` | executar o check e devolver erro acionável |
| Ferramenta de comando do repositório | `tools/run_repo_command.ts` | rodar o comando real do projeto |
| Flag por app | `chat.app.testingEnabled` (`local_agent_handler.ts:966`) | saber se o projeto tem testes |
| Aviso de limite de passos | `local_agent_handler.ts:2119-2130` | **modelo exato** de XML pós-turno persistido |
| Coleta de XML pós-turno | `local_agent_handler.ts:2106` (`postTurnXmlParts`) | ponto de inserção |
| Padrão de entrega com evidência | `src/delivery/*`, tabelas `project_deliveries` / `project_delivery_approvals` | onde declarar o estado da verificação |

## Desenho proposto

Três partes, nesta ordem — cada uma útil sozinha.

### 1. Detecção (barata, sem risco)

Durante o turno, registrar dois fatos:

- houve **escrita** em arquivo (qualquer ferramenta de edição) e quantos arquivos;
- qual foi o **último resultado** de verificação (`run_type_checks` / `run_repo_command` de check), com timestamp relativo à última escrita.

Estado necessário: `lastWriteStep`, `lastVerificationStep`, `lastVerificationPassed`.

### 2. Ação no fim do turno

No ponto onde o turno finaliza (junto do bloco do limite de passos, `local_agent_handler.ts:2119`):

- **Se escreveu e não há verificação passando depois da última escrita** → rodar o check do projeto por conta própria (reusar a implementação de `run_type_checks`, não o modelo);
- **se falhar** → injetar as falhas como mensagem de usuário e continuar o laço por **uma** rodada de autocorreção (limite explícito; nunca laço aberto);
- **se passar** → registrar a evidência e seguir o fluxo normal.

Regras de contenção, todas obrigatórias:

- não rodar em modo leitura/plano (`readOnly`, `planModeOnly`);
- não rodar quando o turno foi cancelado;
- no máximo **uma** rodada de autocorreção por turno;
- respeitar o limite de passos: a rodada extra conta como passo;
- se o projeto não tem check configurado, não inventar comando — cair no caso 3.

### 3. Transparência (o que evita "parece pronto")

Se, depois da rodada de autocorreção, a verificação ainda não passa (ou não foi possível rodar), **marcar a entrega como não verificada** — no mesmo mecanismo de XML pós-turno já usado pelo aviso de limite:

```xml
<samba-verification status="passed|failed|unavailable" writes="N">…</samba-verification>
```

**Atenção:** esse XML precisa de contraparte na UI, como o `<samba-step-limit>` tem. Sem isso, a tag aparece crua no chat. A contraparte é parte do trabalho, não um detalhe.

## Testes a escrever

- **Unitário (função pura):** dado um turno com N escritas e um resultado de verificação, decidir `ok | precisa-verificar | não-verificável`. É o coração da regra e não deve depender do laço.
- **Integração:** turno que escreve e não verifica → recebe a rodada de autocorreção; verificação falha duas vezes → entrega marcada como não verificada; modo leitura → nada acontece; turno cancelado → nada acontece.

## Ordem de implementação recomendada

1. A função pura de decisão + testes (sem tocar no laço).
2. A coleta de estado no laço + a rodada de autocorreção.
3. O XML + a UI.
4. Só depois: expor isso na entrega (`src/delivery/*`), como evidência obrigatória.

## Limites reconhecidos

- Não substitui o CI: o CI continua sendo a rede de segurança do repositório.
- Não conserta projeto sem check configurado — nesse caso o honesto é dizer "não verificável", não fingir verificação.
- Custa tempo de máquina por turno (rodar o check duas vezes); por isso a rodada é única e só quando houve escrita.
