# Performance e Resiliência

Produtos rápidos e resilientes desde o desenho — com orçamento explícito e degradação graciosa.

## Regras

- Orçamento de performance por tipo de tela; paginação, cache e carregamento progressivo.
- Índices de banco guiados por consultas reais.
- Timeout em **toda** chamada externa; retry exponencial com jitter.
- Idempotência em webhooks e jobs.
- Circuit breaker para integrações vulneráveis.
- Fila para tarefas longas; dead-letter queue para processamento crítico.
- Backups e restauração testada.
- Degradação graciosa quando integração ou IA falhar.
- Meça gargalos com carga comparável antes de otimizar; priorize pelo impacto medido.
