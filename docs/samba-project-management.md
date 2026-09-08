# Gestão de projetos e sprints

Na página do projeto, abra **Gestão · sprints, esforço e custos**. O painel é carregado sob demanda e não mantém processos de medição nem polling em segundo plano.

## Dados registrados

- **Esforço**: apontamentos em minutos, data, pessoa, atividade, sprint e tarifa horária opcional em USD. Horas são informadas pela equipe, não inferidas do tempo que o aplicativo ficou aberto. Cada apontamento mantém sua própria tarifa.
- **Entrega**: tarefas do plano agora podem ser classificadas como tarefa, funcionalidade ou correção. O painel mostra as funcionalidades concluídas e suas evidências. Conclusão não equivale à aprovação do cliente. Na visão de projeto, os itens vêm do plano atual; relatórios encerrados preservam os itens das respectivas sprints.
- **Código**: arquivos de código versionados no HEAD, total de linhas (incluindo comentários e linhas vazias), adições/remoções entre commits e quantidade de commits na sprint. Dependências e diretórios comuns de build são excluídos. Linhas não são uma medida de produtividade ou qualidade. Arquivos sem commit não entram no relatório.
- **IA**: cada etapa concluída do agente principal, Build e subagentes orquestrados grava modelo, provedor, origem, timestamp e tokens de entrada/saída reportados pelo SDK. O registro não contém prompts ou código e permanece após excluir um chat. Excluir o projeto remove seus registros.
- **Custos**: estimativas em USD usando tarifas configuradas por milhão de tokens de entrada e saída. A tabela distingue tarifa desconhecida de uma tarifa explicitamente zero. Tokens não reportados ficam desconhecidos. Cache, descontos, impostos, contratos e faturas não são reconciliados. Tarifas atuais recalculam a visão aberta; o relatório encerrado congela as tarifas usadas e o resultado.

## Fluxo do gestor

1. Com o projeto salvo no Git, iniciar a sprint. Uma sprint pode ficar aberta por projeto.
2. Classificar e salvar as tarefas no plano de entrega; registrar horas e tarifas.
3. Atualizar os indicadores para conferir esforço, consumo e código.
4. Salvar o código no Git e as tarefas no plano antes de encerrar a sprint.
5. Encerrar para guardar um retrato imutável: commit, contagens, funcionalidades, evidências, horas, tarifas e custos estimados. Os apontamentos da sprint encerrada também ficam protegidos de alteração.
6. Selecionar qualquer sprint encerrada para consultar seu relatório ou copiá-lo em JSON.

O fechamento registra uma fotografia gerencial, não aprova nem publica a entrega. A aprovação técnica/comercial continua no plano de entrega. Iniciar e encerrar exigem working tree limpo, para não associar funcionalidades a código ainda não salvo.

## Cobertura e persistência

Os dados ficam no SQLite local do Samba Builder, com migração gerada pelo Drizzle. Não há consolidação automática entre computadores da equipe. Não estimamos retroativamente consumo anterior à instalação desta versão, chamadas de CLIs nativas, compactação ou chamadas auxiliares. Etapas canceladas ou falhas cujo uso não seja reportado pelo provedor podem não aparecer. Uma falha de persistência é registrada no log e não interrompe a geração; o painel mostra consumo capturado, não uma garantia de toda a cobrança do provedor.

A gravação gerencial usa revisão otimista para evitar sobrescrita entre janelas e não modifica aprovações de entrega. Se houver conflito, copie o conteúdo do formulário se necessário e use **Atualizar indicadores** antes de repetir. Há limites explícitos de 200 sprints, 5.000 apontamentos e 100 tarifas por projeto; a lista mostra os 50 apontamentos mais recentes, mantendo todos no cálculo.
