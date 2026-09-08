# Revisão da base do projeto

Novos projetos criados pelo fluxo de criação do Samba recebem um plano de entrega com `foundationRequired: true`. O campo é persistido no banco e não pode ser removido pelo salvamento do plano. Apagar a pasta de documentação não libera a aprovação nem a publicação desse projeto. Projetos legados sem base e sem essa marca mantêm o comportamento anterior.

Na aba Revisão do plano, a seção Base para manutenção verifica PRD, arquitetura, stack, design system, qualidade e operação. Documentos ausentes, vazios, com links simbólicos, maiores que 256 KB ou iguais ao rascunho inicial atual precisam ser corrigidos. A inspeção usa caminhos fixos e não faz varredura do repositório.

Após ler o documento no projeto, o responsável registra seu nome e uma nota de revisão. O registro é salvo com o hash do conteúdo dentro do plano. É uma declaração humana, não certificação automática do conteúdo. Salvar o plano persiste o registro; uma mudança no arquivo invalida a correspondência e exige nova revisão. Aprovação e publicação verificam novamente a documentação no processo principal e continuam exigindo o commit Git aprovado.

A interface permite atualizar os documentos sob demanda. Não há processo residente, serviço externo ou scanner instalado. A leitura limita cada arquivo a 256 KB.

Esta etapa não resolve toda a auditoria: resultados de testes e scanners ainda precisam ganhar registros de execução próprios, vinculados ao commit e aos requisitos. Os campos de qualidade continuam sendo evidências manuais. Também permanecem pendentes a avaliação de capacidade/recuperação da arquitetura e a validação contínua de UX e acessibilidade.

A implementação não altera o aplicativo já instalado nem publica projetos automaticamente.
