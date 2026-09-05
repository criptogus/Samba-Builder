# Especificação de produto

Parta do pedido e do código existente. Identifique o usuário, o problema, o fluxo principal e as restrições já informadas. Declare suposições; pergunte apenas o que muda materialmente a solução e não pode ser inferido. Não acrescente etapas de aprovação já satisfeitas pelo pedido.

Entregue uma especificação curta com: objetivo; escopo e exclusões; jornadas ordenadas por valor; critérios de aceitação observáveis; estados vazio, carregando e erro; dados e permissões; riscos e dependências. Use exemplos dado/quando/então para falhas importantes, além do caminho feliz. Separe necessidades de escolhas técnicas.

Mapeie cada critério para uma tarefa implementável e sua forma de verificação. Identifique dependências e uma primeira fatia vertical utilizável. Evite tarefas genéricas como “fazer backend”. Se a implementação estiver autorizada e o modo permitir, execute a primeira fatia e avance pelas demais. Em Ask/Plan, entregue a análise no chat sem modificar arquivos. Não invoque hooks, scripts ou outros agentes por causa desta skill.

Conclusão: informe requisitos atendidos, evidências e lacunas. Não declare um recurso completo se o fluxo só funciona com dados simulados.
