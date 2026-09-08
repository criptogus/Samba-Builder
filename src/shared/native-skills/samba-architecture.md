# Mapa do projeto

Comece pelos manifests, árvore de diretórios, pontos de entrada e documentação existente. Exclua dependências, builds, arquivos gerados e binários. Pesquise nomes antes de ler arquivos grandes; siga apenas as dependências necessárias para a pergunta.

Mapeie responsabilidades, fronteiras e fluxo de dados de uma jornada concreta. Para cada nó ou conexão, cite um arquivo ou símbolo que a sustente. Separe relações confirmadas de inferências; não invente um grafo apenas a partir dos nomes dos diretórios.

Entregue um mapa compacto, preferencialmente Mermaid quando suportado, uma descrição do fluxo principal e os pontos de extensão. Para uma mudança proposta, liste produtores, consumidores, contratos afetados e testes de maior valor. Identifique acoplamento e duplicação com exemplos, sem propor reescrita total por padrão.

Se autorizado a salvar documentação, inclua revisão/data e como atualizar o mapa. Caso contrário, apresente no chat. Esta skill não instala indexador, dashboard ou watcher e não lê o repositório inteiro em memória.

## Projetar um sistema novo e comprovar capacidade

Antes de escolher infraestrutura, registre na política de engenharia o perfil de risco, pico de usuários, volume e crescimento dos dados, orçamento mensal, disponibilidade pretendida e os tempos toleráveis de recuperação e perda de dados. Trate números sugeridos como hipóteses, com responsável e teste de validação. Se o produto não armazena dados, justifique por que restauração de banco não se aplica.

Desenhe contexto e contêineres C4 proporcionais à solução e ligue cada componente a contratos e arquivos reais. Compare opções em ADR: modularidade, persistência, consistência, operação e custo. Comece pela menor arquitetura que atende às metas; só separe serviços quando a carga, o isolamento ou a autonomia operacional justificarem o custo.

Em dados privados, crie requisitos e testes negativos de autorização: principal autenticado, outro usuário, outra organização e papel sem permissão, incluindo chamadas diretas ao servidor. Para operação crítica, registre também requisitos de carga/concorrência e recuperação, com testes executáveis e resultados associados à versão. Simule falhas externas, repetição de eventos, tempo limite e retomada sem duplicar efeitos. Não confunda um GET rápido com capacidade comprovada sob pico.

Defina sinais de saúde, métricas e alertas com responsável e procedimento de resposta. Registre migrations, compatibilidade e rollback, retenção e restauração. Execute testes de carga apenas em ambiente autorizado e isolado; nunca ensaie restauração sobre dados de produção. Se ainda não existe ambiente ou dado de teste, registre a lacuna; não invente prova operacional.

Cada requisito deve apontar para tarefas, arquivos no Git e uma execução que verifique seu aceite. A vinculação humana de um teste não prova automaticamente sua cobertura: revise as asserções e preserve evidências relevantes. Atualize PRD, arquitetura, operações e decisões junto do código.
