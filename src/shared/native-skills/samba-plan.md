# Plano de implementação

Leia os pontos de entrada e as regras do projeto antes de propor alterações. Liste o comportamento atual e o desejado, os módulos afetados e as invariantes que devem continuar válidas. Escolha a menor mudança capaz de cumprir o pedido; não crie uma plataforma para resolver uma única função.

Divida o trabalho em fatias verticais com arquivos prováveis, dependências, critério de conclusão e comando de validação descoberto no projeto. Investigue cedo riscos de migração, compatibilidade Windows/macOS, serviços externos e autenticação. Distinga atividades locais de operações que publicam ou geram custos.

Quando autorizado e em modo com escrita, implemente uma fatia por vez, valide a fronteira modificada e atualize o plano com evidências. Se uma premissa falhar, revise as tarefas dependentes. Preserve alterações do usuário e não faça commits, pushes ou deploys sem autorização aplicável. Não crie subagentes automaticamente.

Entregue o resultado verificável com mudanças, testes executados e pendências reais. Em Ask/Plan, produza apenas o plano e os critérios, sem executar mudanças.
