# O que aprender com Swarm e Django

Dois repositórios, dois ensinamentos diferentes: o **Swarm** (division-sh/swarm) traz posições de arquitetura para sistemas de agentes; o **Django** traz o que faz um projeto sobreviver a anos de contribuição. Nenhum dos dois deve ser copiado — o SB é um app de código, o Swarm é um runtime de entidades. O que transporta são os princípios.

## Do Swarm: as posições, e onde o SB está

| Posição do Swarm                                                                                                                                                                 | Onde o SB está hoje                                                                                    | Lacuna                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **O controle é determinístico.** O modelo raciocina em sessões isoladas e emite eventos; código determinístico decide o que cada resultado muda. Não existe roteador alucinando. | O agente local decide tudo: quais ferramentas rodar, quando parar, se verifica.                        | O gate de verificação em `docs/verificacao-do-agente.md` é exatamente esta posição aplicada. O mesmo vale para consentimento e risco: hoje é instrução de prompt, deveria ser regra tipada.                                                                                            |
| **Trabalho é entidade durável em máquina de estados**, sobrevive a crash e espera dias.                                                                                          | Já temos fila durável (retoma prompts enfileirados após reinício) e a regra `rules/state-machines.md`. | O **run** em si não é entidade: um turno que morre no meio perde trabalho. `project_deliveries` é um embrião disso.                                                                                                                                                                    |
| **Toda transição é uma transação** — guard, acumula, computa, commita, emite, tudo ou nada.                                                                                      | Temos gates e evidência de entrega (`src/delivery`).                                                   | A evidência não é atômica com o estado da entrega: dá para ter one delivery com evidência parcial.                                                                                                                                                                                     |
| **Replay e fork a partir do log.**                                                                                                                                               | Registramos tudo (`messages`, `agent_messages`, `knowledge_usage`).                                    | Não há como reproduzir um run para depurar um turno ruim — só reler texto.                                                                                                                                                                                                             |
| **Isolamento por entidade.** Cada unidade roda isolada, centenas ao mesmo tempo.                                                                                                 | Agentes (Codex, Cursor, nós) trabalham **na mesma árvore git**.                                        | O maior incidente desta sessão: `core.bare=true` no `.git/config`, worktree contaminado por commit de fixture, push rejeitado por corrida, `reset --hard` em cima de trabalho de terceiro. O repositório tem orientação de worktree no `AGENTS.md`, mas é **conselho, não mecanismo**. |
| **Custo medido por unidade.**                                                                                                                                                    | Registramos tokens por turno.                                                                          | Falta orçamento por run/entrega — com BYOK, quem paga é o usuário.                                                                                                                                                                                                                     |
| **Condições tipadas e não-Turing-completas** (CEL), em vez de roteamento por modelo.                                                                                             | Regras de risco e consentimento em código + prompt.                                                    | Falta a parte declarativa: a regra deveria ser dado verificável, não texto que o modelo interpreta.                                                                                                                                                                                    |

## Do Django: o que um projeto maduro já automatiza

O SB está mais perto do Django do que parece: `CONTRIBUTING.md`, `AGENTS.md` com índice de 30 regras, hooks de pre-commit (husky), comando único de verificação (`npm run verify`) e processo de release documentado (`docs/RELEASING.md`). As lacunas são estreitas e específicas:

- **`.git-blame-ignore-revs`** — o Django tem; nós não tínhamos. O produto passou por **cinco** rebrands em massa, então o blame dessas linhas apontava para quem renomeou a marca, não para quem escreveu a lógica. **Feito nesta passada.**
- **Lint de segurança de workflows** (`zizmor.yml`) — o Django tem. **Rodado nesta passada**: 238 achados, resumidos abaixo.
- **Automação local obrigatória**: temos pre-commit, não temos **pre-push**. Foi por isso que 12 testes quebrados chegaram ao `main` sem ninguém ver — e o CI não acusava porque o billing o mantinha parado.
- **Entrada única de verificação**: já temos. A regra do Django de "confirme que a falha é pré-existente num main limpo antes de culpar sua mudança" também já está no `AGENTS.md`.

## A auditoria de workflows (resultado real)

`uvx zizmor .github/workflows/` nos 21 workflows:

| Achado                  | Quantos | Por que importa                                                                                                            |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `unpinned-uses`         | 81      | Action referenciada por tag pode ser movida para código malicioso. O repositório já pina algumas por hash — falta o resto. |
| `artipacked`            | 18      | Checkout com `persist-credentials` dentro de artefato publicado.                                                           |
| `excessive-permissions` | 12      | Workflow com mais permissão do que o passo precisa.                                                                        |
| `template-injection`    | 8       | Entrada não confiável interpolada em `run:` — injeção de comando.                                                          |
| `dangerous-triggers`    | 5       | `pull_request_target`/`workflow_run` sem contenção.                                                                        |
| `github-app`            | 3       | Token de app fora do padrão seguro.                                                                                        |

Três coisas tornam isto urgente agora, e todas vêm do dia de hoje: o repositório **virou público** (fork passa a ser superfície de ataque real), o **CI destravou** (os workflows que estavam parados voltaram a executar com segredos) e o guard de release **apagou uma release legítima** porque a regra estava só no YAML, sem auditoria.

## Backlog priorizado

1. **Gate determinístico de verificação no agente** — desenho em `docs/verificacao-do-agente.md`. É a posição do Swarm com maior retorno: o modelo não decide se verifica.
2. **Isolamento de agentes por worktree** — mecânico, não conselho. Elimina a classe de incidentes de hoje (árvore compartilhada, `core.bare`, commit de fixture, corrida de push).
3. **Pre-push rodando `npm run ts` + testes afetados** — as 12 falhas entraram no `main` sem serem vistas.
4. **zizmor no CI + pinagem das actions** — começar por `template-injection` e `dangerous-triggers`, que são exploráveis de fora.
5. **Run durável, retomável e com replay** — hoje um turno interrompido perde trabalho e não é reproduzível.
6. **Orçamento por run/entrega** — com BYOK, o custo é do usuário.

## O que este documento não é

Não é proposta de transformar o SB no Swarm. Não temos (nem queremos) um runtime de entidades genérico: temos um app de código com um agente dentro. O que copiamos é o **princípio** — determinismo no controle, durabilidade no trabalho, isolamento entre unidades — e o que copiamos do Django é o **hábito**: automatizar a checagem em vez de escrevê-la numa regra que ninguém lê.
