# Base versionada dos projetos

Novos projetos criados de templates React, externos ou da equipe recebem `project-docs/` antes do primeiro commit local. A base contém README, PRD, ARCHITECTURE, TECH_STACK, DESIGN_SYSTEM, TESTING, OPERATIONS, DECISIONS e CHANGELOG em Markdown. Não utiliza serviços, processos residentes ou chamadas adicionais a modelos para criar a estrutura.

A estrutura é um rascunho explícito, não uma aprovação automática. O agente recebe instruções em AI_RULES.md, AGENTS.md e na continuação do blueprint para preencher as decisões a partir do briefing, respostas já dadas e código real, antes de implementar. Mudanças posteriores devem atualizar documentos e código no mesmo commit. Isso orienta o agente; não é um validador semântico que garante documentação completa.

Ao aprovar um blueprint, o processo principal grava uma cópia JSON com data e conteúdo aprovado em `project-docs/approvals/`. A escrita usa coordenação por projeto, ocorre antes de liberar a implementação e é idempotente por hash. Não inclui caminhos dos anexos. Uma aprovação de blueprint não equivale à aprovação de arquitetura ou entrega.

Os documentos existentes não são sobrescritos. Ambas as estratégias de troca de template preservam `project-docs`. Projetos importados anteriormente não recebem alterações retroativas silenciosas; a aprovação de um blueprint também garante a estrutura quando aplicada a um projeto importado.

A página de detalhes destaca o conector GitHub existente. O usuário escolhe a conta/organização, cria um repositório privado ou conecta um existente e sincroniza as versões. Sem autenticação ou escolha de destino, a etapa permanece pendente. Não há criação automática em uma organização presumida nem novo bloqueio de publicação. A conexão exibida vem dos metadados do aplicativo e não representa confirmação de sincronização do HEAD remoto.

Nunca incluir segredos na documentação; OPERATIONS orienta registrar nomes de variáveis e procedimentos de acesso. O design system deve referenciar os tokens efetivos do código; a cor do blueprint não torna um design system completo.

Validação: testes de sistema de arquivos para completude da estrutura, preservação, idempotência e recusa de symlinks; integração real do blueprint com persistência após renomeação; regressão dos fluxos de criação/renomeação.
