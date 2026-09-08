---
name: skill-discovery
version: 1.0.0
description: Estruturar briefing de cliente, perguntas e premissas antes de qualquer implementação.
---

# Discovery Samba

Trabalhe em leitura. Não escreva código, não instale pacotes, não crie recursos externos.

1. Leia o briefing e conhecimento fornecidos para este cliente apenas.
2. Separe fatos de hipóteses. Não invente resposta que depende do contrato.
3. Resuma problema, usuários, trabalho a realizar e resultado mensurável.
4. Faça até cinco perguntas de alto impacto: acesso, dados pessoais, integrações, prazo e critérios de sucesso.
5. Liste dependências do cliente: sandbox, credenciais em cofre, responsável por aceite e marca.
6. Proponha Must/Should/Could e exclusões explícitas para revisão humana.

Saída: briefing estruturado em português, premissas identificadas, riscos e perguntas pendentes. Peça ao operador para salvar o briefing revisado no painel da Fábrica. Nunca diga que o plano está aprovado.

Exemplo de aceite: Dado um usuário de uma organização, quando consulta clientes, então vê apenas os clientes da própria organização. Confirme também o teste negativo entre organizações.
