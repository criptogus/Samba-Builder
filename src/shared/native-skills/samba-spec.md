# Especificação de Produto (PRD como contrato)

O PRD é a origem rastreável de design, arquitetura, segurança, teste e aceite — não só uma descrição de funcionalidade. Sem ele, uma feature "parece pronta" sem estar pronta em segurança, teste e governança.

## Conteúdo obrigatório

- Problema, público, hipótese de valor e métrica de sucesso.
- Personas ou perfis de acesso.
- Jornada principal e jornadas de exceção.
- Requisitos funcionais priorizados.
- Requisitos não funcionais: disponibilidade, performance, privacidade, segurança, acessibilidade, localidade, auditoria.
- Dados sensíveis tratados pelo produto.
- Integrações e dependências.
- Critérios de aceite testáveis.
- Riscos e decisões que exigem aprovação humana.
- Escopo fora da versão (ver /samba-scope-guard).
- Plano de rollout, migração e rollback.

## Matriz requisito → evidência (dentro do PRD)

| Requisito                | Módulo     | Risco   | Teste             | Evidência de aceite                       |
| ------------------------ | ---------- | ------- | ----------------- | ----------------------------------------- |
| Usuário aprova despesa   | Financeiro | Alto    | E2E + autorização | Registro de auditoria + teste de perfil   |
| Gestor exporta relatório | Relatórios | Médio   | Integração        | Arquivo gerado com filtros aplicados      |
| Admin muda permissões    | IAM        | Crítico | E2E + segurança   | Negativa de acesso para usuário sem papel |

Cada requisito da matriz só fecha com a evidência da linha preenchida (ver /samba-quality-engineering). A classificação de risco do projeto (baixo/médio/alto/crítico) define o peso do processo (ver /samba-governance).
