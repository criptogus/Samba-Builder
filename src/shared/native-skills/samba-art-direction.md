# Direção de Arte (UI Art Direction)

Produtos visualmente **autores** — distintos, premium e coerentes — nunca derivados genéricos. Use quando o produto exige identidade marcante (marca, premium, B2B com personalidade); o /samba-design cobre a linha de base para todas as entregas.

## Entregáveis antes das telas

1. **Moodboard textual e referências** — direção de personalidade (ex.: "construtora editorial confiável", "ferramenta cirúrgica para devs") + referências e antirreferências explícitas.
2. **Direção visual** — a tese: para quem, qual sensação, qual tarefa. Uma frase que qualquer tela nova precise respeitar.
3. **Design tokens semânticos** — cor (função, não decoração), tipografia (hierarquia e escala), espaço, grid, raio, elevação, motion — centralizados, sem valores arbitrários por tela.
4. **Densidade informacional** — a regra de respiro/densidade do produto (ERP denso vs. SaaS generoso) decidida e consistente.
5. **Tipografia, grids e espaçamento** — escala precisa, alinhamento real, ritmo vertical.
6. **Motion com propósito** — continuidade, resposta discreta, um momento expressivo; duração/easing centralizados + movimento reduzido (ver /samba-motion).
7. **Estados de interação** — hover, foco visível, ativo, desabilitado, carregando, erro, vazio, permissão negada — todos desenhados, nenhum acidente.

## Gate obrigatório

Nenhuma tela principal é aprovada sem avaliação visual em **três breakpoints** e nos estados vazio, loading, sucesso, erro e permissão negada — com screenshots como evidência.

## Anti-padrões de "cara de IA"

Gradiente sem função, glassmorphism decorativo, cards aninhados sem necessidade, sombras difusas em tudo, emojis como identidade, ícones inconsistentes, landing page para produto operacional, paleta pastel de baixo contraste. Se parece "gerado", a direção não foi deliberada.

## Evidência

Registre o brief visual, os tokens e as screenshots revisadas (desktop/tablet/mobile + estados) em `project-docs/DESIGN_SYSTEM.md` — a avaliação visual é parte do critério de pronto, não um extra.
