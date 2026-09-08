# Piloto — o engenheiro da Samba (D6)

Roteiro operacional para rodar o **fluxo D1–D5 completo com UM cliente real**: um
repo existente, uma tarefa de engenharia real (migração/refactor/manutenção), o
Córtex do domínio do cliente, a entrega governada. O case resultante é o
"case Nubank" da Samba — o benchmark de venda de *engenharia de código com IA*.

> Pré-requisito do produto: o Samba Builder com a main atual (D1–D5) + o app
> instalado. Nada aqui exige backend — é BYOK (a chave do cliente ou a nossa).

---

## 1. Escolha do cliente e da tarefa

- **Perfil do cliente:** quem tem um repo vivo com uma dor de escala — uma
  migração repetitiva, um refactor transversal, dívida mecânica — o mesmo perfil
  do case Nubank/Devin (trabalho de alto volume, discreto, verificável).
- **A tarefa certa:** ~1–2 semanas de trabalho manual estimado, divisível em
  sub-tarefas com critério de done verificável (compila/testa). NÃO começar por
  uma tarefa criativa ou ambígua — o piloto prova confiabilidade mecânica.
- **O contrato do piloto (deixar explícito):** repo do cliente, branch/PRs,
  quem aprova (o cliente), métricas que vamos registrar, janela de tempo.

## 2. Setup (meio dia)

1. **Importar o repo** no Samba Builder (GitHub ou pasta local) — vira um app.
2. **Mapear** — 1ª tarefa de reconhecimento: o agente registra o *Repository
   map* no `PROJECT_MEMORY.md` (estrutura, comandos de verificação, convenções).
3. **Córtex do cliente:** criar a base de conhecimento do domínio (arquitetura,
   padrões, histórico) — o que a equipe do cliente ensina uma vez.
4. **Benchmark (D2):** registrar 2–3 tarefas pequenas de calibragem com o
   `samba/benchmark/benchmark.py record` — a taxa de 1ª tentativa do baseline.

## 3. Execução (o fluxo D1–D5)

1. **Tarefa de escala (D3):** o agente produz o plano (sub-tarefas + critério de
   done), executa em lotes verificados (`run_repo_command` com os comandos reais
   do repo) e reporta o progresso.
2. **Frentes independentes (D4):** quando o plano decompõe limpo, o coordenador
   paraleliza com workers via `spawn_agent` e entrega um diff consolidado.
3. **Autonomia longa (D5):** o agente roda com checkpoint ao vivo (seção
   *Active task* no PROJECT_MEMORY), orçamento declarado e alerta só nas
   decisões — o cliente acompanha por marcos, não por passo.
4. **Governança:** cada lote/diff passa pela aprovação do cliente no painel de
   Governança (nunca merge silencioso) — `python3 samba/governance/gate.py`.
5. **Qualidade (P4):** o avaliador `samba/quality/score.py` pontua a entrega
   contra a rubrica do "jeito Samba" antes do fechamento.

## 4. Métricas a registrar (o placar)

| Métrica | Como medir |
|---|---|
| Taxa de 1ª tentativa | `python3 samba/benchmark/benchmark.py report --client <nome>` |
| Horas de engenheiro economizadas | estimativa do cliente × horas do piloto |
| Qualidade | `score.py` (0–100) + revisão do cliente |
| Tempo até a entrega | calendário do piloto |
| Diffs rejeitados / retrabalho | contagem nas rodadas de aprovação |

## 5. Critérios de saída (do roadmap D6)

- [ ] Tarefa concluída com os testes verdes do repo (verificação real, não a do scaffold)
- [ ] Diffs aprovados pelo cliente (governança)
- [ ] Métricas D1–D5 registradas (horas, qualidade, tempo, taxa de 1ª tentativa)
- [ ] Case documentado para vendas (template abaixo)

## 6. Template do case (para vendas)

```md
# Case: <cliente> — <tarefa> com o Samba Builder

- **Problema:** <o monólito/refactor/ETL do cliente — o que era manual e caro>
- **Escala:** <N arquivos / N sub-tarefas / estimativa original em horas>
- **O que o agente fez:** <fluxo — mapear → plano → lotes → paralelo → governança>
- **Resultado:** <testes verdes; diffs aprovados; prazo real>
- **Métricas:** <horas economizadas ×; custo vs manual; taxa de 1ª tentativa>
- **Diferencial Samba:** <dados nunca saem (BYOK/local); Córtex do domínio do
  cliente; governança humana; custo = a chave — sem assinatura por agente>
- **Depoimento:** <1 frase do cliente>
```

---

*O piloto é a prova do "nível Devin" com o posicionamento Samba: local-first,
domínio do cliente no Córtex, humano aprovando — e o case vira o benchmark de
venda de engenharia de código com IA.*
