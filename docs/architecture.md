# Arquitetura do Samba Builder

Como o produto funciona por dentro, para quem vai evoluir o código. Se algo aqui estiver desatualizado, corrija o documento junto com o código — este arquivo é parte da entrega.

> Este é o documento do **fork**. Para o histórico/contexto do projeto original (Electron, IPC, ciclo de um pedido), veja as seções abaixo — elas continuam válidas — mas ignore links e nomes de repositório do upstream: aqui o produto é o Samba Builder.

## O que o produto é

Um app **Electron** de desktop que constrói aplicações de clientes com IA, com o diferencial de uma **camada de fábrica** em volta do loop de geração:

- **Briefing → plano aprovado → marca → execução → segurança → handoff**, com evidência registrada em cada etapa.
- **Córtex** (o second brain local): base de conhecimento do projeto + RAG, que injeta lições aprendidas no prompt e aprende com o resultado de cada turno.
- **Tudo local e BYOK**: as chaves de IA são do usuário, o backend roda na máquina, o código do cliente vive em repositórios normais (editáveis fora da ferramenta).

## Modelo de processo (Electron)

O app tem dois lados:

- **renderer** — a UI React (sandboxed, sem acesso ao sistema);
- **main** — o processo Node privilegiado (filesystem, processos, banco, git).

Eles conversam por **IPC**. O IPC é a fronteira de segurança do produto: tudo que sai do renderer é pedido, não permissão.

- Frontend: React + **TanStack Router** (não Next/React Router) e **TanStack Query** para tudo que é apoiado em IPC.
- Primitivos de UI: **Base UI** (`@base-ui/react`), nunca Radix.
- Erros de main que **não são bug** (validação, entidade ausente, auth, recusa do usuário) são lançados como `SambaError` com `SambaErrorKind`, para ficarem fora da telemetria de exceção. Ver `rules/samba-errors.md`.

## Onde cada coisa vive

| Área                                            | Caminho                                 |
| ----------------------------------------------- | --------------------------------------- |
| Processo principal, janelas, paths, settings    | `src/main`, `src/paths`                 |
| Handlers e serviços de IPC                      | `src/ipc`                               |
| **Local agent**: tools, execução, consentimento | `src/pro/main/ipc/handlers/local_agent` |
| Prompts do agente e blocos injetados            | `src/prompts`                           |
| Padrão de entrega e evidência                   | `src/delivery`                          |
| Skills nativas (contrato do produto)            | `src/shared/native-skills`              |
| Fábrica, qualidade, governança, Córtex MCP      | `samba/`                                |
| Pacotes com suíte própria                       | `packages/`                             |
| Regras por área (leia antes de mexer)           | `rules/`                                |
| Testes E2E (Playwright/Electron)                | `e2e-tests/`                            |
| Documentação de produto (pt-BR)                 | `samba/docs`, `docs/`                   |

## Ciclo de vida de um pedido

1. **Modo.** O chat opera em modos distintos (Agent, Build, Ask, Plan) — ver `rules/chat-modes.md`. O modo define o que o agente pode fazer, não só como responde.
2. **Montagem do prompt.** O pedido vai ao modelo junto com o contexto do projeto e os blocos injetados — incluindo as lições do Córtex para aquele projeto (`<project_lessons>`, montado em `src/delivery/lessons.ts` e injetado no stream do chat).
3. **Agente local.** No modo de execução, o agente roda um loop com **tools** (ler/escrever arquivos, rodar comandos, instalar dependências, consultar o banco, crawl). Cada tool declara o que faz e se modifica estado (`modifiesState`), o que alimenta os guardas de leitura/plano.
4. **Aplicação.** As edições acontecem no diretório do projeto do cliente. O agente não "descreve" a mudança: ele a aplica e roda a verificação.
5. **Verificação e evidência.** Typecheck, testes, verificação de segurança e análise de dependências do projeto; o resultado vira **evidência** no padrão de entrega (`src/delivery`), com o pacote exportável que responde: o que foi combinado, o que foi verificado, o que falta.
6. **Aprendizado.** Ao fim do turno, o desfecho (funcionou / não funcionou) realimenta a lição usada — lição que ajuda ganha força; que atrapalha perde, e só é contraditada com evidência.

## Consentimento: aprovação onde não dá para voltar

A regra do produto é **pedir aprovação exatamente onde a ação é irreversível** — publicar (`git push`, `npm publish`, deploy), destruir (`push --force`, `reset --hard`, `rm -rf`), sair para a rede (`curl`, `ssh`, `rsync`), usar `sudo` ou mexer em dependências.

Dois detalhes que definem o comportamento:

- A classificação é feita por **cláusula de comando** (`src/pro/main/ipc/handlers/local_agent/tools/command_risk.ts`): `npm test && git push` é barrado pelo `git push`. `--dry-run` não pede aprovação.
- Um aviso de risco **fura o "sempre permitir"** do usuário: memória não é consentimento para o irreversível.

## Node do projeto

O app roda em Electron, mas os comandos do **projeto do cliente** precisam do Node que aquele projeto declara. `src/ipc/utils/node_runtime.ts` lê `engines.node`, escolhe a maior versão instalada que satisfaz e a coloca à frente do `PATH` dos comandos e do preview. Sem isso, projetos modernos falham com `EBADENGINE` antes de qualquer coisa útil rodar.

## Onde o conhecimento vive

Fora do `.app`, no `userData`:

- `sqlite.db` — projetos, chats, mensagens, unidades de conhecimento do Córtex (`knowledge_units`, `knowledge_usage`), MCPs;
- `user-settings.json` — preferências e credenciais (as chaves nunca entram no repositório).

Consequência prática para quem mexe em release/instalação: trocar o bundle **não** toca no conhecimento; apagar o `userData` apaga tudo. Ver [RELEASING.md](RELEASING.md).

## Por que o Samba Builder é agêntico (e como isso se paga)

O projeto original evitava agentes por custo. Aqui o loop agêntico existe porque é **governado**: orçamento por turno, modos que restringem o que o agente pode fazer, modelo local quando faz sentido (BYOK) e gates que verificam o resultado em vez de confiar no relato do modelo.

O custo é controlado por: escolha de modelo por tarefa, limites de iteração, cache diário de geração de narrativa e a regra de que tarefas de volume rodam na API direta, não no caminho caro.

## Leitura obrigatória antes de mexer

- `AGENTS.md` (este diretório) e os `rules/*.md` da área que você toca.
- `docs/samba-delivery-workflow.md` — o padrão de entrega.
- `docs/samba-engineering-quality.md` — o que conta como pronto.
- `docs/samba-test-evidence.md` — como a evidência de teste é registrada.
- `docs/RELEASING.md` — publicar.
