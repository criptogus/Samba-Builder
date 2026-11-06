# Product

## Register

product

## Users

Consultores e desenvolvedores da software house Samba, no Mac ou no Windows. Eles entregam o app de um cliente: plano aceito, Security Gate verde e handoff que outro dev opera sem conversa paralela. Trazem as próprias chaves de modelo (BYOK). O código do cliente fica em um repositório Git normal.

Não é o público deste ciclo: founder sozinho no primeiro uso, cliente final dentro do Builder, ou quem procura uma vitrine no estilo Lovable.

Quem compra o resultado é o funil Assessment → Piloto → BaaS. O Builder é custo e qualidade dessa entrega, não um SKU de prateleira.

## Product Purpose

Samba Builder é o sistema operacional da fábrica Samba. O trabalho segue briefing → plano aprovado → marca → build → verificação → handoff. Publicar ou abrir staging sem plano aprovado e gate verde falha fechado. Sucesso é um app de cliente em staging, com checklist e evidência, em até um dia útil de trabalho de uma pessoa Samba mais o Builder.

Local-first continua: rápido, privado, sem prender o código num runtime proprietário. Não há créditos, marketplace nem onboarding de "primeira hora" para quem nunca viu um terminal.

## Brand Personality

Calmo e capaz, no tom de uma ferramenta de entrega, não de um brinquedo de geração. A interface diz o que o gate bloqueou e qual é o próximo passo. Progresso aparece com sobriedade. Termos de fábrica (plano, Must, scan, handoff) ficam visíveis para quem opera a entrega.

## Anti-references

- **Vitrine consumer:** promessa de app no primeiro prompt, mascote, confete, onboarding que esconde plano e gate.
- **Enterprise clutter:** banners empilhados, upsell permanente, grade de cards sem ação.
- **Dev-tool cru:** despejar stack trace sem dizer o que fazer.
- **Gloss genérico de startup de IA:** texto em degradê, glow roxo, hero decorativo.

## Design Principles

1. **O gate falha fechado.** Plano, marca, Must e scan não têm atalho. Consentir um comando não é waiver.
2. **A entrega é o produto.** Handoff é pull request, artefatos e checklist. Chat sem isso não é entrega.
3. **Um próximo passo.** Estado vazio, bloqueio ou falha nomeia o que aconteceu e uma ação óbvia.
4. **O código é do cliente.** Repositório normal, sem runtime proprietário no que vai para produção.
5. **Medir o que importa.** Tempo de plano aprovado até staging, e a parcela de publishes que passou pelo gate.

## Accessibility & Inclusion

- Contraste de texto no alvo WCAG 2.1 AA (4.5:1) nos temas claro e escuro.
- Fluxos de configuração operáveis por teclado.
- Alternativa a `prefers-reduced-motion` em cada animação.
- Strings de interface via i18n. O operador Samba trabalha em pt-BR.
