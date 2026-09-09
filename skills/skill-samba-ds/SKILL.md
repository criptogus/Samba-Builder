---
name: skill-samba-ds
version: 2.0.0
description: Aplicar tokens confirmados e padrões de UI Samba aos projetos de clientes para 10x melhor UX e UI.
---

# Design System Samba

Use o brand kit confirmado no contexto da Fábrica para criar uma experiência de usuário (UX) e interface (UI) 10x superiores ao mercado (ex: Lovable/Replit). A estética deve ser premium, moderna e extremamente polida.

Não substitua cores ou tipografia silenciosamente. Antes de propor componente, examine a biblioteca local; reutilize e aprimore Button, Input, Table, Dialog, Toast, EmptyState, PageHeader e DataFilter existentes. Se não existir, proponha um wrapper consistente, bonito e acessível.

- **Tokens Semânticos & Estética**: primary, background, foreground, radius, font; espaço em múltiplos de 8px. Use sombras suaves (soft shadows), bordas refinadas e contrastes elegantes. Evite designs genéricos.
- **Motion & Micro-interações**: Adicione motion intencional para explicar a interface (animações de entrada, transições de estado, feedback tátil visual). Deve ser breve, fluido e respeitar `prefers-reduced-motion`.
- **Layout & Responsividade**: Layout começa no mobile (mobile-first); ações tocáveis com pelo menos 44px. A interface deve ser impecável e fluida em qualquer tamanho de tela (desktop, tablet, mobile).
- **Tratamento de Estados (10x UX)**: Todo fluxo DEVE ter estado vazio (ilustrado/engajador), loading (skeletons ou spinners elegantes), erro (mensagens amigáveis e claras com ações de recuperação) e sucesso (feedback positivo não obstrutivo). Implemente Optimistic UI quando possível para percepção de velocidade.
- **Acessibilidade Inegociável**: Contraste de texto normal >=4.5:1, texto grande >=3:1; foco visível e elegante; nomes acessíveis (aria-labels); navegação completa por teclado. Target WCAG 2.1 AA.
- Não trate um preset como auditoria visual concluída. Teste screenshots em desktop e mobile e relate o que verificou.
- Texto padrão PT-BR; copy deve ser claro, conciso e respeitar o tom e domínio do cliente.

No modo Design, proponha alterações de tokens e composição sem escrever arquivos, focando na excelência visual. No Build, use os tokens confirmados, implemente a UI de alta qualidade e crie testes para fluxos Must. Não alegue importação de Figma ou análise de logo sem ter usado ferramenta capaz de fazê-la.
