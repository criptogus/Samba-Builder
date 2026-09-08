# Benchmark por cliente (D2 do roadmap-devin)

O equivalente **medido** do fine-tuning do Devin: em vez de treinar pesos, cada
cliente acumula o seu próprio "eval set" — o histórico de tarefas de engenharia
executadas pelo agente com o resultado. A métrica é a **taxa de conclusão na
primeira tentativa**: ela precisa **subir a cada ciclo** de uso (o efeito
observado no caso Devin/Nubank: 2x conclusão, 4x velocidade após especializar).

## Fluxo

1. Após cada tarefa de engenharia concluída num cliente, registre o resultado:
   ```bash
   python3 samba/benchmark/benchmark.py record --client "Cliente X" \
       --task "Migrar data class br para o submódulo novo" \
       --outcome first_try          # ou after_retries | failed
   ```
2. Consulte o placar por cliente (a melhora ao longo do tempo):
   ```bash
   python3 samba/benchmark/benchmark.py report            # todos
   python3 samba/benchmark/benchmark.py report --client "Cliente X"
   ```

## Regras

- Uma linha por tarefa em `samba/benchmark/clients/<cliente>/results.jsonl`.
- `first_try` = o agente acertou sem intervenção; `after_retries` = precisou de
  correções (o agente ou o humano); `failed` = não entregou.
- O objetivo do D2: a taxa de `first_try` sobe por cliente conforme o Córtex
  acumula os padrões do domínio (units de migração/refactor aprovadas) e o
  autopilot converte as falhas em skills do cliente.
- O placar é o critério de saída antes de escalar (D3) e paralelizar (D4): só
  paralelizamos o que já aprendemos.
