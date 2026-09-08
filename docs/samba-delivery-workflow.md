# Entregas no Samba Builder

O plano de entrega fica nos detalhes de cada projeto e reúne cliente, responsável,
prazo, briefing, escopo, critérios de aceite, tarefas, evidências e decisões.
Projetos com prazo vencido, tarefas bloqueadas, revisão pendente ou sem responsável
aparecem na área de atenção da página inicial.

## Fluxo

1. Preencha o briefing diretamente, com o PM Samba ou com uma reunião importada.
2. Defina o escopo e os critérios. Cada linha de critério pode virar uma tarefa.
3. Salve o plano e prepare a tarefa no chat. O usuário revisa e envia a mensagem;
   preparar a tarefa não chama um modelo nem publica código.
4. Registre o resultado de cada tarefa e as evidências de testes, segurança,
   acessibilidade e responsividade. A ação de validação prepara um pedido de QA
   no chat; os campos preenchidos não substituem a execução das verificações.
5. Vincule a revisão a um commit Git sem alterações locais pendentes e registre
   quem aprovou, com a evidência recebida. Salve o plano.
6. Publique a versão aprovada e marque a entrega como concluída.

As aprovações são registros manuais internos, com snapshot do plano e commit,
armazenados em histórico. A interface mostra os últimos 20 registros. Ainda não
há autenticação do cliente, assinatura eletrônica ou portal externo por link.

## Proteção de trabalho

- Rascunhos válidos ficam no armazenamento local da janela e são recuperados ao
  reabrir o projeto. Falhas nesse armazenamento são mostradas ao usuário.
- O salvamento usa revisão otimista e transação SQLite. Um conflito com outra
  janela preserva o rascunho e exige recarregar explicitamente a versão salva.
- Mudanças no plano aprovado invalidam a aprovação na interface.
- Publicações de produção iniciadas pelo Samba, em projetos com plano salvo,
  exigem plano aprovado e o mesmo commit revisado, aprovado e presente no Git.
  Vercel recebe esse SHA explicitamente. Preview continua disponível. Esta
  proteção não controla publicações feitas diretamente pelo provedor ou por CI.
- Planos são locais à instalação; o catálogo compartilhado de templates continua
  independente. Decisões podem ser reutilizadas pela biblioteca de prompts.

## Especialistas e recursos

Em Configurações, ative especialistas sob demanda ou o modo econômico. O limite
de 1 a 3 subagentes é compartilhado entre chats e projetos, com padrão 2. Tarefas
excedentes aguardam na fila; reduzir o limite não interrompe chamadas em curso.
O modo econômico usa um subagente e a política de suspensão de preview ocioso
após 10 minutos.

Especialistas duráveis herdam o modelo explicitamente escolhido no chat,
incluindo provedor e esforço. A seleção é persistida ao criar o especialista,
para que mudar o chat depois não troque o modelo de trabalho já enfileirado.
Com Auto, continuam os padrões de cada função. Consentimentos permanecem ativos.

Cada plano aceita um limite de tokens para subagentes internos, verificado antes
da próxima etapa de modelo. O consumo registrado por etapas concluídas permanece
mesmo se uma etapa posterior falhar. Chamadas já iniciadas podem ultrapassar o
limite. Tokens não informados pelo provedor, o agente principal e CLIs nativas
não entram nessa conta. Não é um orçamento monetário nem a fatura total.

## Validação

Testes unitários cobrem critérios, consumo, seleção de modelos, concorrência,
recuperação de planejamento e proteção do commit publicado. Testes Electron
cobrem persistência, recuperação de rascunho, conflitos, preparação de tarefas,
histórico de aprovação com Git/SQLite reais e navegação. Nenhum desses testes
publica na nuvem ou usa modelos pagos. A execução visual local foi feita no macOS;
Windows ainda precisa de uma rodada de validação no sistema operacional.
