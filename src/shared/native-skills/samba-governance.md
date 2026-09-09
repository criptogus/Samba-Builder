# Governança Corporativa

Governança é capacidade real dos produtos — papéis, aprovação, auditoria, rollout e rollback — incorporada desde a primeira versão, proporcional à classe de risco.

## Obrigatório

- RBAC ou ABAC conforme complexidade; princípio do mínimo privilégio.
- Separação de funções críticas.
- Auditoria imutável (append-only) para ações sensíveis.
- Aprovação em dois níveis para operações de alto impacto.
- Política de retenção e descarte de dados.
- Fluxo de exceção e emergência.
- Trilhas de aprovação por mudança — quem aprovou o quê, quando e sob qual contexto.
- Ambiente de staging separado; controle de mudanças, release notes e rollback.
- Secret scanning em pre-commit e CI.

## Classificação de operações (política proporcional)

| Classe      | Exemplos                                                             | Política                                                   |
| ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Baixo risco | Alterar preferências pessoais, rascunhos                             | Autorização normal, log básico                             |
| Médio risco | Editar dados compartilhados, exportar relatório                      | Permissão explícita, auditoria detalhada                   |
| Alto risco  | Publicar, integrar serviço externo, alterar acesso                   | Confirmação explícita, auditoria e possível aprovação      |
| Crítico     | Pagamento, deleção irreversível, mudança de permissão administrativa | Dupla aprovação, justificativa, alerta e trilha inviolável |

Todo projeto recebe uma **classificação de risco** (baixo/médio/alto/crítico) no início — a governança e os gates são proporcionais a ela: uma landing page não passa pelo processo de uma plataforma financeira com dados pessoais, SSO e aprovações.
