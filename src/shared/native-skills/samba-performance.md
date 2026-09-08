# Desempenho de aplicações e memória

Identifique primeiro o alvo: aplicação web gerada, backend ou aplicativo desktop. Defina uma jornada reproduzível, versão, plataforma, volume de dados e condições de rede/dispositivo. Separe medição de hipótese; preserve funcionalidade e critérios de aceite. Não conclua vazamento com uma única amostra de RSS nem prometa ganhos percentuais sem comparação.

## Aplicações web

Priorize o caminho crítico: requisições desnecessariamente sequenciais, payload excessivo, consultas repetidas/sem paginação e JavaScript carregado antes de ser usado. Inicie operações independentes em paralelo apenas quando não houver dependência, transação, rate limit ou ordenação exigida. Aguarde trabalho concorrente terminar antes de liberar recursos compartilhados.

Em React/Next.js, confira a versão real e se o projeto usa App Router, Pages Router ou Vite antes de recomendar APIs. Reduza fronteiras cliente e dados serializados quando houver componentes de servidor; carregue editor, gráficos e outros módulos pesados apenas onde usados. Não mova segredos ao cliente. Prefira componentes existentes e imports que permitam eliminar código não usado; não acrescente bibliotecas de cache ou memoização por reflexo.

Evite duplicar estado derivável e efeitos que disparam busca/renderização em cascata. Profile antes de usar memo/useMemo/useCallback. Para listas grandes, pagine ou virtualize conforme navegação e acessibilidade. Reserve dimensões de mídia e priorize somente o recurso realmente crítico da primeira tela. Meça carregamento, estabilidade visual e resposta às interações com ferramentas disponíveis; diferencie dados de laboratório de experiência real de usuários.

Caches precisam de chave com usuário/tenant quando privados, limite, expiração e invalidação após escrita. Nunca use estado global mutável para dados de uma requisição SSR. No backend, examine índices, N+1, limites de resultados, cancelamento, timeout e comportamento sob carga representativa. Não compartilhe dados privados para ganhar velocidade.

## Desktop e recursos

Separe RSS, heap, filhos e swap. Meça abertura, preview, operação longa e retorno ao repouso. Inspecione importações ansiosas, caches, buffers/logs, listeners, timers, watchers e processos sem dono ou encerramento. Use carregamento sob demanda e limites explícitos; não reduza heap às cegas. Verifique cancelamento, fechar/reabrir e limpeza de recursos. Teste macOS/Windows quando acessíveis; declare plataformas não medidas.

## Evidência

Registre cenário, comando/ferramenta, volume, métrica antes/depois e limitações sob condições comparáveis. Execute a jornada funcional após otimizar. Se não houver perfil disponível, apresente a mudança como hipótese e não como ganho comprovado. Em Ask/Plan, faça diagnóstico e recomendação sem alterações.
