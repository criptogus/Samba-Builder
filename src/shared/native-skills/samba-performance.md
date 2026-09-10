# Performance, Resiliência e Eficiência

Performance e estabilidade são requisitos não-funcionais de primeira classe. O produto deve ser rápido sob carga real e degradar graciosamente sob falha.

## Orçamento de Performance (Web & UI)

- **Core Web Vitals**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 em conexões móveis simuladas (4G rápido).
- **Bundle Size & Code Splitting**: Carregamento tardio (`React.lazy` ou import dinâmico) para rotas pesadas, editores (Monaco), bibliotecas de gráficos e modais secundários.
- **Renderizações Desnecessárias**:
  - Estabilize callbacks (`useCallback`) e seletores de estado (Jotai, Zustand, TanStack Query).
  - Virtualize listas longas (mais de 50 itens) com `react-window` ou `@tanstack/react-virtual`.
  - Evite passar novos objetos/arrays literais inline em props de componentes de lista.
- **Mídia & Assets**: SVGs otimizados, imagens em WebP/AVIF com dimensões explícitas para evitar layout shift, lazy loading nativo (`loading="lazy"`).

## Banco de Dados e Camada de Acesso

- **Elimine N+1**: Use joins explícitos ou lote de chaves (`inArray`) no Drizzle/Prisma; nunca faça queries dentro de loops `.map()`.
- **Indexação por Consulta Real**: Crie índices compostos baseados nos filtros de `WHERE` e cláusulas `ORDER BY` mais frequentes.
- **Paginação Obrigatória**: Nunca faça `select()` aberto sem `limit` e `offset` (ou paginação baseada em cursor).
- **Conexões e Pool**: Configure limites de pool de conexões compatíveis com o ambiente (ex.: PgBouncer / Supabase connection pooler para serverless).

## Resiliência em Serviços e Integrações Externas

- **Timeout Estrito**: Defina timeout em **toda** chamada HTTP/RPC externa (máximo 5s para APIs síncronas, 15s para LLMs/geração).
- **Retry com Backoff e Jitter**: Para erros transitórios (502, 503, 504, 429), use backoff exponencial com jitter aleatório para evitar avalanche no destino.
- **Circuit Breaker**: Isole dependências instáveis para que a falha de um parceiro não derrube o sistema principal.
- **Idempotência Garantida**: Webhooks de pagamentos e jobs de fila devem exigir chave de idempotência (`idempotency-key`) no cabeçalho ou tabela de processamento.
- **Degradação Graciosa**: Se o provedor de IA, busca ou CDN estiver instável, mostre fallback visual claro, dados em cache ou modo simplificado — nunca tela branca ou erro genérico silencioso.

## Profiling e Diagnóstico Antes de Otimizar

1. Meça antes de mexer: capture tempo de resposta de API e CPU/memória no DevTools Profiler.
2. Identifique se o gargalo é de rede (RTT, payload grande), I/O de disco/banco (query lenta) ou processamento JS (bloqueio da main thread).
3. Após o fix, execute teste com carga equivalente e comprove a redução do tempo ou consumo.
