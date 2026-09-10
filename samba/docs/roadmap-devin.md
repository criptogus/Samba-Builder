# Samba Builder — Roadmap "nível Devin"

> Meta: chegar à capacidade do **Devin** (agente de engenharia autônomo) dentro
> do Samba Builder, mantendo o que nos diferencia — local-first/BYOK, Córtex
> (conhecimento por cliente) e governança com aprovação humana.
> Benchmark de referência: caso Nubank/Devin (migração de ETL de ~6M linhas,
> 100k classes — 8–12x em horas de engenharia, 20x em custo).
> Complementa `samba/docs/roadmap-hermes.md` (P0–P6 — a base de conhecimento
> e auto-evolução sobre a qual isto constrói).

## A tese

O Devin entrega 4 capacidades sobre um **codebase existente**:

1. **Operar** — entender um repo grande e editar com segurança (navegar, refatorar, migrar);
2. **Aprender** — especializar-se no padrão do domínio (fine-tuning; no caso Nubank: 2x conclusão, 4x velocidade);
3. **Escalar** — executar tarefas de engenharia de verdade por horas, em lotes, com verificação;
4. **Paralelizar** — "um exército de agentes" com um humano só gerenciando e aprovando.

O Samba Builder hoje é um **construtor greenfield** (conversa → app novo). A base
para virar também um **engenheiro de codebase** já existe: o agente local com
tools de verificação (typecheck/testes), os subagentes explorer/implementer, o
GitHub nativo, o Córtex (RAG por domínio), o score, o autopilot e a governança.

**O que nos diferencia do Devin no fim do caminho:** o Devin roda no cloud da
Cognition (o código do cliente sai da empresa); nós rodamos **na máquina do
cliente** com o conhecimento do domínio **curado por cliente** (Córtex) e a
entrega **governada** (nada entra sem aprovação). O Devin generaliza; nós
especializamos por cliente — que é exatamente onde a Samba entrega valor.

## A ordem (rígida)

_opera → aprende → escala → paraleliza → autonomia → piloto_

Cada fase só começa quando a anterior produz a sua métrica — a ordem é a
proteção contra o erro em escala: não paralelizamos o que ainda não aprendemos,
não damos autonomia ao que ainda não verificamos.

---

## D1 — Operar o que existe (o coração do "nível Devin")

**Outcome:** _Enable a Samba e seus clientes a delegar trabalho de engenharia
sobre repositórios existentes — não só apps novos — para que projetos legados
(migrações, refactors, bugs) saiam do gargalo de engenheiro-hora._

**O que muda hoje:** o agente só constrói a partir do scaffold. Passa a:

- **Importar** um repo real (git clone via GitHub nativo/URL) como alvo de trabalho;
- **Mapear** o repo antes de tocar: arquitetura, padrões, pontos de risco — o Córtex indexa o repo (units de estrutura por projeto);
- **Executar tarefas de engenharia** (bug fix, refactor dirigido, migração de padrão) usando o que já existe: explorer/implementer, typecheck/testes como guarda antes de cada mudança;
- **Entregar o diff revisável** (nunca merge silencioso — a governança existente).

**Alavancas prontas:** subagente explorer (navegação de código), tools de
verificação (`run_type_check`/testes), GitHub nativo (device flow), scaffold de
import (base do upstream), memória por projeto.

**Métrica:** % de tarefas de engenharia concluídas com testes verdes e diff
aprovado sem edição manual do engenheiro (baseline 0 → alvo 50%+ no piloto).

---

## D2 — Aprender o domínio (o "fine-tuning pobre")

**Outcome:** _Enable o agente a ficar visivelmente melhor a cada tarefa dentro
de um cliente — medido por benchmark — para que a especialização (o que o Devin
faz com pesos) seja alcançada com curadoria + RAG, sem depender do modelo._

**O que construir:**

- **Benchmark por cliente**: um eval set do domínio (exemplos bons e ruins de
  tarefas daquele cliente — como o eval set da Nubank), rodado a cada ciclo;
- **Padrões no Córtex**: as lições de cada tarefa concluída (o que funcionou, o
  que o cliente aprova) viram units consultadas **antes** de cada tarefa nova
  (o bloco `cortex_knowledge` já instrui o retrieval — falta o alimentador
  automático pós-tarefa);
- **Loop do autopilot**: erros e rejeições do cliente → propostas → skills do
  domínio (o P3/P5 do roadmap-hermes aplicado por cliente).

**Alavancas prontas:** Córtex (units/search), bloco `cortex_knowledge` no prompt,
autopilot (telemetry → improve), score (rubric por cliente), PROJECT_MEMORY.

**Métrica:** taxa de conclusão na primeira tentativa por tarefa sobe a cada
ciclo do benchmark (o efeito Nubank: 2x conclusão, 4x velocidade).

---

## D3 — Escalar tarefas (o "job" do engenheiro)

**Outcome:** _Enable o time do cliente a delegar migrações e refactors inteiros
— não só tarefas únicas — para que semanas virem dias sem multiplicar
engenheiros._

**O que construir:**

- **Modo tarefa**: o usuário descreve o padrão (ex.: "migrar data classes de X
  para Y, respeitando imports e edge cases" — o caso Nubank);
- O agente **planeja as subtarefas** (a lista com dependências e critérios de
  done — cada item verificável: compila + testes);
- Executa em **lotes com verificação contínua** (nunca acumula mudança não
  verificada) e **submete a aprovação por lote** (o ciclo draft→review do gate).

**Alavancas prontas:** subagentes (spawn/implementer), tools de verificação,
governança (submit/approve/veto + painel), score pós-lote.

**Métrica:** volume de mudanças entregues por hora de engenheiro (referência do
caso: 8–12x); % de lotes aprovados sem correção manual.

---

## D4 — Paralelizar (o "exército de Devins")

**Outcome:** _Enable a Samba a executar N frentes independentes de uma migração
ao mesmo tempo — com um coordenador e um humano aprovando — para que o tempo de
entrega caia ~1/N com qualidade estável._

**O que construir:**

- **Orquestrador de workers**: o coordenador divide o plano (D3) em frentes
  independentes, cada worker roda num **worktree/workspace isolado** (a regra do
  git multi-agente: nunca dois agentes no mesmo working tree);
- **Consolidação**: o coordenador integra as frentes, roda a verificação
  conjunta e submete a aprovação (o painel de governança como a fila do humano);
- **Orçamento por worker** (tempo/tokens/custo — a base do autopilot).

**Alavancas prontas:** `spawn_agent` (subagentes), worktrees git, governança
(fila de aprovação), autopilot (orçamento), o aprendizado do roadmap-hermes
("nunca automático sem aprovação").

**Risco controlado pela ordem:** o paralelo só vem depois do D2 (o padrão do
cliente já é conhecido) — sem isso, paralelizamos erros.

**Métrica:** tempo de migração de N itens cai ~1/N; taxa de conflito entre
frentes < 5%; qualidade (score) estável vs. execução sequencial.

---

## D5 — Autonomia longa com supervisão

**Outcome:** _Enable o usuário a delegar e voltar — com o trabalho visível,
orçado e retomável — para que a supervisão seja gestão, não operação._

**O que construir:**

- **Sessões longas com checkpoints**: o agente trabalha por horas com estado
  persistente (plano, progresso, decisões — o PROJECT_MEMORY evolui para o
  "diário de execução");
- **Plano ao vivo**: o usuário vê o que está sendo feito (o streaming de chat
  vira um painel de progresso por subtarefa);
- **Orçamento explícito** e **resume** (parar/retomar sem perder contexto);
- **Alertas só na decisão**: o usuário é chamado quando há aprovação, bloqueio
  ou mudança de plano (o padrão do watchdog: zero ruído entre eventos).

**Alavancas prontas:** streaming do chat, memória por projeto, governança,
autopilot (orçamento/telemetria), watchdog do cron.

**Métrica:** horas de trabalho autônomo por intervenção humana (alvo: uma
decisão por lote, não por arquivo); % de sessões que terminam sem retrabalho.

---

## D6 — O engenheiro da Samba (piloto e posicionamento)

**Outcome:** _Enable a Samba a vender "engenharia de código com IA" — não só
"app builder" — provando o fluxo completo num cliente real, para que o produto
suba de posição (de ferramenta de criação para agente de engenharia do
cliente)._

**O que é:** o piloto real atravessa D1–D5 com UM cliente: um repo existente,
uma migração/refactor real, o Córtex do domínio do cliente, a entrega governada.
O case vira o benchmark de venda (o "case Nubank" da Samba).

**Critérios de saída do piloto:** tarefa concluída com testes verdes, diffs
aprovados pelo cliente, métricas D1–D5 registradas (horas, qualidade, tempo) e o
case documentado para vendas.

---

## Métricas consolidadas (o placar do "nível Devin")

| Pilar          | Métrica                                                                  | Referência (Devin/Nubank)      |
| -------------- | ------------------------------------------------------------------------ | ------------------------------ |
| D1 Operar      | % tarefas concluídas com testes verdes + diff aprovado sem edição manual | 50%+ no piloto                 |
| D2 Aprender    | taxa de 1ª tentativa sobe por ciclo do benchmark por cliente             | 2x conclusão / 4x velocidade   |
| D3 Escalar     | volume de mudanças por hora de engenheiro                                | 8–12x / 20x custo              |
| D4 Paralelizar | tempo de migração ~1/N com qualidade estável                             | "army of Devins"               |
| D5 Autonomia   | horas autônomas por intervenção humana                                   | gestão, não operação           |
| D6 Piloto      | case real com métricas registradas                                       | o case vira o produto de venda |

## Princípios (herdados do roadmap-hermes — inegociáveis)

1. **Local-first/BYOK**: o código do cliente nunca sai da máquina dele (o
   diferencial contra o Devin cloud — não abrir mão).
2. **"Automático" nunca é merge silencioso**: toda mudança passa por aprovação
   humana (a governança existente) — o Devin entrega PRs; nós entregamos
   submissões governadas.
3. **Medir antes de escalar**: o benchmark do domínio (D2) precede o paralelo
   (D4); o score precede a autonomia (D5).
4. **Conhecimento é do cliente**: units do Córtex e skills aprendidas num
   cliente não vazam para outro (isolamento por cliente).
5. **O engenheiro não substitui o construtor**: o modo greenfield (o produto
   atual) e o modo engenheiro (D1+) convivem — o usuário escolhe o alvo.

## Riscos e mitigação

- **Repo legado é um mundo**: cada repo tem o padrão dele → o D2 (benchmark +
  Córtex por cliente) é obrigatório antes de escalar.
- **Paralelo sem aprendizado = erro em escala**: ordem rígida D1→D2→D3→D4.
- **Autonomia sem verificação**: o D5 só depois do D1–D4 (guarda de testes/
  typecheck em cada mudança é pré-requisito de qualquer autonomia).
- **Virar o Devin (perder o diferencial)**: o posicionamento final é o
  **engenheiro local com conhecimento do domínio** — nunca um cloud genérico.
- **Ordem tentadora**: o paralelo (D4) parece o atalho — é o mais caro de
  reverter se entrar antes do D2.

_Estado: D0 (fundação) concluída — agente local, verificação, subagentes,
Córtex, memória, score, governança, autopilot. Próximo passo executável: D1
(importar repo real como alvo do agente) + D2 (benchmark por cliente)._
