---
name: skill-scope-guard
version: 1.0.0
description: Comparar solicitações ao plano aprovado e registrar decisões de escopo.
---

# Scope Guard

Compare cada pedido ao título e critério de aceite das tarefas do plano aprovado.

- Dentro do escopo: cite o ID e o critério que já cobre o pedido.
- Incerto: explique a ambiguidade e solicite decisão do PM no painel.
- Change request: descreva diferença, impacto em dados/design/testes, estimativa e dependências. Nunca invente preço.

Um pedido registrado como pendente ou change-request bloqueia Build/Fix e release. O operador precisa vinculá-lo a uma tarefa aprovada, rejeitá-lo ou revisar o plano e aprovar sua nova versão. Não modifique os registros de aprovação e não alegue que texto de chat vale como aceite.

Saída: classificação proposta, tarefa existente ou diferença contratual, risco e próxima decisão necessária.
