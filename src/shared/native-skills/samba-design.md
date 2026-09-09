# Design Excellence

Toda entrega precisa de **direção visual deliberada** — nunca um conjunto genérico de componentes. Funcional não é pronto para cliente: pronto exige design intencional verificado em tela.

## Entregáveis mínimos ANTES de gerar telas

Brief visual (personalidade, público, contexto, tom, referências e antirreferências) → direção de arte (paleta semântica, contraste, tipografia, escala espacial, raios, sombras, iconografia, motion — em tokens, sem duplicar valores por tela) → hierarquia por tela (primária, secundária, crítica, vazio, erro) → mapa de jornadas (onboarding, happy path, erros, loading, permissão negada, offline, recuperação) → estratégia responsiva justificada → critérios de acessibilidade (contraste, foco, teclado, labels, semântica, feedback além da cor) → inventário de componentes reutilizados do sistema → **pronto visualmente = screenshots avaliadas em desktop, tablet e mobile nos estados vazio/loading/sucesso/erro/permissão**.

## Proibido (cara de IA)

Gradiente sem função · cards dentro de cards · excesso de bordas/sombras/glassmorphism · dashboard denso sem hierarquia · botões com peso idêntico (uma primária sempre) · texto técnico/longo (microcopy orientada à ação) · paleta de baixo contraste ou status só por cor · componentes recriados na página em vez de reutilizar o sistema.

## Direção dominante por produto (escolha UMA e sustente)

| Produto | Direção |
|---|---|
| ERP/operação | Densidade controlada, escaneável, tabelas excelentes, filtros claros, permissões visíveis |
| SaaS B2B | Espaço generoso, hierarquia tipográfica, comandos rápidos, visual sóbrio |
| Premium/marca | Editorial, imagem forte, motion intencional, tipografia expressiva |
| Time técnico | Densidade útil, atalhos, terminal bem tratado, logs legíveis |
| Campo/mobile | Interfaces grandes, fluxos curtos, offline, uma ação por etapa |

## Rubric visual (0-100; pronto para cliente exige ≥80 e sem falha crítica de a11y/segurança/fluxo)

Hierarquia/legibilidade 25 · Coerência do design system 20 · Direção de arte 20 · UX e estados 20 · Acessibilidade e responsividade 15 — com screenshots como evidência (ver /samba-quality-engineering).

## Processo

Construa uma tela representativa antes de espalhar o padrão; explore escala tipográfica, alinhamento e respiro. Preserve marca e componentes existentes; referências orientam princípios, não cópia. Conteúdo específico com resultado real — nunca invente depoimentos ou métricas. Centralize duração/easing com movimento reduzido (ver /samba-motion). Simplificar a UI nunca remove autenticação, autorização por tenant ou validação no servidor. Inspecione a interface **renderizada** (não "por compilar") em desktop/mobile, conteúdo longo, zoom, foco e estados; corrija a dimensão mais fraca observada. Teclado, leitor de tela e compreensão exigem avaliação humana. Registre o observado, as limitações e os componentes alterados. /samba-art-direction detalha a direção de arte para identidade marcante.
