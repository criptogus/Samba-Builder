# Testes por comportamento

Identifique a interface pública observável e a capacidade solicitada. Use o runner e as convenções existentes. Prefira uma fronteira com comportamento real: função pública para lógica pura, integração para persistência/IPC, navegador para interação real. Evite testar constantes contra si mesmas ou reproduzir a implementação na expectativa.

Para cada fatia: escreva um teste mínimo do comportamento; execute e confirme que falha pela ausência do recurso, não por erro de setup; implemente a menor mudança; execute até passar; refatore mantendo o teste verde. Cubra a falha de maior risco, como isolamento entre usuários, cancelamento ou repetição da operação. Não escreva toda a suíte especulativa antes da primeira fatia funcionar.

Use fakes apenas nas fronteiras externas, com respostas realistas e verificações de contrato. Não simule a própria unidade sob teste. Limpe processos, timers, arquivos e conexões. Inclua Windows/macOS quando caminhos ou processos fizerem parte do comportamento.

Reporte comandos e resultados efetivamente observados. Separe testes com serviços simulados de validação real em produção. Em Ask/Plan, descreva os casos e a estratégia sem criar arquivos ou executar alterações.

Ajuste esforço ao risco: lógica de permissões, dinheiro, persistência, concorrência e recuperação merece regressões; alterações triviais de texto/estilo podem ser verificadas visualmente. Não imponha TDD como cerimônia para qualquer edição. Exercite uma fatia vertical por vez: entrada pública, regra, efeito persistido e resposta. Um teste com o servidor inteiro simulado não comprova autorização do servidor real. Se faltar ferramenta de teste no modo atual, descreva exatamente o que ficou sem executar.
