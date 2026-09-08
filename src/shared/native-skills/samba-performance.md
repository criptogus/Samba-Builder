# Desempenho e memória

Defina o cenário reproduzível: inicialização, projeto aberto, preview, editor, tarefa longa e retorno ao repouso. Registre versão, plataforma e condições. Separe RSS, heap, memória de processos filhos e swap; não atribua o consumo de toda a máquina a um aplicativo.

Inspecione processos e ciclo de vida, caches sem limite, listeners/timers, watchers, grandes arrays, logs acumulados e dependências carregadas na abertura. Compare amostras antes, durante e após a operação. Quando houver ferramentas de profiling disponíveis, identifique objetos retidos e seus donos. Não conclua vazamento com uma única amostra de RSS.

Priorize carregamento sob demanda, limites de buffers/cache, paginação, cancelamento e encerramento de processos ociosos. Evite reduzir limites de heap às cegas. Preserve funcionalidades e valide encerramento/reabertura em macOS e Windows quando acessíveis.

Reporte cenário, métricas observadas, causa confirmada ou hipótese, alteração e comparação sob condições equivalentes. Se não puder medir uma plataforma, declare a limitação. Não prometa percentuais de redução sem medição.
