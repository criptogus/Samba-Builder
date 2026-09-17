# Observabilidade, Telemetria e Monitoramento

Nunca entregue um sistema cego. Operar exige visibilidade em tempo real do que acontece, com rastreabilidade ponta a ponta e respeito rigoroso à privacidade por padrão.

## Pilares de Observabilidade em Produção

### 1. Logs Estruturados (JSON)

- Emita logs sempre no formato JSON com campos fixos: `timestamp`, `level`, `service`, `traceId`, `userId` (anonimizado), `action`, `durationMs`.
- **Sanitização de Dados**: Nunca registre senhas, tokens de autorização, dados de cartão de crédito ou CPF/documentos pessoais nos logs. Use mascaramento automático (`***`).
- Níveis claros:
  - `DEBUG`: Apenas em desenvolvimento ou investigações pontuais.
  - `INFO`: Ações de negócio relevantes (usuário criou projeto, checkout aprovado, exportação concluída).
  - `WARN`: Condições anômalas recuperadas (retry acionado, cache miss de fallback).
  - `ERROR`: Falha na operação com stack trace e contexto (ex.: erro no banco ou serviço terceiro indisponível).

### 2. Rastreamento e Correlação (Correlation IDs)

- Toda requisição recebida na borda (API/HTTP ou IPC) deve gerar ou herdar um `X-Request-Id` / `traceId`.
- Esse identificador deve acompanhar toda a cadeia de chamadas: do controller aos serviços internos, queries no banco e chamadas a APIs de IA ou parceiros.
- Ao reportar erros para o usuário, forneça apenas o código de rastreio para suporte (ex.: _"Erro de comunicação (Ref: req_982f1)"_).

### 3. Métricas e Sinais Dourados (Google SRE)

- **Latência**: Tempo de resposta do percentil 95 (p95) e p99 para rotas de leitura e escrita.
- **Tráfego**: Requisições por segundo (RPS) ou transações processadas.
- **Erros**: Taxa de erro 4xx vs. 5xx (SLO de disponibilidade de fluxos críticos ≥ 99.9%).
- **Saturação**: Uso de memória no Node/Electron, conexões no pool de banco e ocupação de filas de background.

### 4. Health Checks e Liveness

- Forneça endpoints `/health` (liveness: o processo está rodando) e `/ready` (readiness: conectado ao banco e serviços vitais).
- Falha no health check deve disparar alerta antes que os usuários comecem a registrar chamados.

## Monitoramento Específico para Produtos com Agentes de IA

Em qualquer sistema que orquestre LLMs ou agentes, registre para cada turno:

- **Modelo e Versão**: Nome exato (`claude-3-5-sonnet`, `gemini-1.5-pro`, `deepseek-v3`).
- **Contagem de Tokens e Custo**: Prompt tokens, completion tokens, tempo de primeira resposta (TTFT) e duração total.
- **Ferramentas Invocadas**: Nome das tools acionadas, status de sucesso/falha e contagem de retries por tool.
- **Intervenções Humanas**: Se houve rejeição de consentimento, interrupção ou edição manual pelo usuário.
- **Trilha de Avaliação**: Rastreabilidade do prompt de sistema e do hash da instrução usada na geração.
