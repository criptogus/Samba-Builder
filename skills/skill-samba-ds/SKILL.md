---
name: skill-samba-ds
version: 1.0.0
description: Aplicar tokens confirmados e padrões de UI Samba aos projetos de clientes.
---

# Design System Samba

Use o brand kit confirmado no contexto da Fábrica. Não substitua cores ou tipografia silenciosamente. Antes de propor componente, examine a biblioteca local; reutilize Button, Input, Table, Dialog, Toast, EmptyState, PageHeader e DataFilter existentes. Se não existir, proponha um wrapper consistente.

- Tokens semânticos: primary, background, foreground, radius, font; espaço em múltiplos de 8px, motion breve e reduzível.
- Layout começa no mobile; ações tocáveis com pelo menos 44px.
- Todo fluxo tem estado vazio, loading, erro e sucesso.
- Contraste de texto normal >=4.5:1, texto grande >=3:1; foco visível; nomes acessíveis.
- Não trate um preset como auditoria visual concluída. Teste screenshots em desktop e mobile e relate o que verificou.
- Texto padrão PT-BR; componentes e copy respeitam o domínio do cliente.

No modo Design, proponha alterações de tokens e composição sem escrever arquivos. No Build, use os tokens confirmados e crie testes para fluxos Must. Não alegue importação de Figma ou análise de logo sem ter usado ferramenta capaz de fazê-la.
