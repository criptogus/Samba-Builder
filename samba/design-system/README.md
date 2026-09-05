# Design System Toolkit — Samba Builder

Funcionalidade do produto: **o programador gera o design system de um projeto e o
salva como template** para reutilizar nos próximos.

## Fases (ordem do produto)

**Fase 1 — Gerar (implementada, núcleo):** `extract` lê um projeto (app Samba
Builder: Tailwind + shadcn) e produz o `design-system.json` canônico:

- `tokens.semantic.light|dark` — vars shadcn do `globals.css` (`--background`,
  `--primary`, `--sidebar-*`, …)
- `tokens.radius`, `tokens.fonts` (fontFamily custom), `tokens.brandColors`
  (cores de marca em HEX), `tokens.animations`
- `resolved.light|dark` — cores semânticas resolvidas em HEX (preview/thumb)
- `meta.shadcn` — baseColor/style do `components.json`

**Fase 2 — Template (implementada, núcleo):** `save-template` guarda em
`~/.samba-builder/design-templates/<slug>.json` (nome, descrição, tags, projeto de
origem); `list-templates` lista; `apply-template` aplica num projeto-alvo
(escreve o `globals.css` do alvo com as vars do template).

## Uso

```bash
# Fase 1: gerar o design system de um projeto
python3 design.py extract <app_dir> [--name "Nome"] [--out design-system.json]

# Fase 2: salvar como template
python3 design.py save-template design-system.json --name "Marca X" --desc "..." --tags "brand,corp"

# Reuso
python3 design.py list-templates
python3 design.py apply-template <slug> <app_dir_alvo>
```

## Arquitetura no produto (próximos passos)

- O núcleo é deliberadamente **sem dependências e fora de `src/`** — a UI e os
  handlers do app (Electron IPC) chamam a mesma lógica (portar para TS ou invocar
  via subprocess/MCP).
- Pontos de integração no app:
  1. **Ação no projeto**: "Design system → Gerar" (extrai do app em disco) →
     preview visual (cores resolvidas em HEX) → "Salvar como template".
  2. **Página Templates** (`src/routes/templates.ts` já existe para templates de
     apps): seção própria de design system templates; aplicar na criação de app
     novo (seed do scaffold com o template).
  3. **Córtex**: o design system gerado alimenta a base de conhecimento
     (knowledge unit por cliente/marca) — o mesmo desenho do open-design, agora
     com os design systems reais dos projetos da fábrica.

## Limitações v1

- `brandColors` perde o agrupamento aninhado (vira chaves planas `DEFAULT`/`dark`);
  melhorar o parser de cores aninhadas do tailwind na próxima iteração.
- `apply-template` escreve só `globals.css`; o `tailwind.config.ts` (colors
  mapeando as vars + fontes) entra na próxima iteração.
- Extrai o tema light/dark e tokens; componentes (shadcn registry) não entram no
  escopo v1.
