# Histórico de testes da entrega

O executor de testes do Samba agora persiste resumos no SQLite durante seu ciclo coordenado, depois da restauração do ambiente de testes. A captura serve ao painel Tests e ao agente que usa o mesmo executor.

Cada registro guarda ID, horário de início/fim, origem, contagens de aprovados/falhos/inconclusivos e número de arquivos. O commit só é registrado se o Git estiver limpo antes e depois e o SHA permanecer igual. Alterações locais ou falha de leitura do Git produzem um resultado sem vínculo verificável de versão. Esse vínculo não certifica dependências externas nem a qualidade dos próprios testes.

Falha de infraestrutura, relatório vazio, arquivo sem casos ou falha na restauração do ambiente impedem o status aprovado. A captura não salva títulos, erros brutos, URLs, logs ou credenciais. Falhas de persistência são registradas no log do aplicativo sem interromper a execução dos testes; não há afirmação de persistência bem-sucedida nesses casos.

A aba Revisão apresenta as últimas 30 execuções, com atualização manual, separadas das evidências manuais. O histórico completo permanece no banco e é excluído junto com o projeto. Não existe canal IPC para o renderer fabricar uma execução. Resultados anteriores à atualização ou de ferramentas externas não são importados. Rejeições de pré-validação anteriores à aquisição dos recursos do executor não entram no histórico.

Esta etapa registra resultados; não substitui as regras de aprovação existentes por um teste verde isolado. Rastreabilidade por requisito, importação autenticada de CI e scanners especializados continuam pendentes. Não foram adicionados processos residentes ou dependências de execução.

## Validação desta alteração

36 testes de serviço e regressão passaram, incluindo captura pelo executor, descarte do vínculo para código alterado, restauração com falha e exclusão em cascata. Um cenário no Electron confirmou captura inconclusiva, consulta IPC e exibição após reabrir o projeto. Build, checagem de tipos, lint e consistência da migração passaram. Não foram executados scanners ou testes em aplicações de clientes.
