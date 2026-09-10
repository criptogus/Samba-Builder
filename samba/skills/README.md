# Samba Builder — Skill System

**PM Samba:** skill nativa original para descobrir um problema real, escolher um diferencial útil e orientar um produto simples, com design marcante. Use `/samba-pm` no início da mensagem ou encontre **PM Samba** em Library → Prompts → Skills nativas. [Instruções e versão portátil](../../src/shared/native-skills/samba-pm/SKILL.md).

Skills nativas curadas em `src/shared/native-skills/`, com propostas de evolução a partir de feedback. O script de evolução gera propostas; não aplica regras automaticamente nem comprova a qualidade das aplicações. A referência do comportamento instalado é [docs/native-skills](../../docs/native-skills/README.md).

## Arquitetura: como um skill vira "nativo"

O fork do Samba monta o system prompt do agente em `src/prompts/` (system_prompt,
local_agent_prompt, guides por framework). Dois pontos de injeção nativa:

1. **Diretrizes sempre ativas** — seção de "princípios Samba" no prompt montado do
   fork (atualmente `PROJECT_GENERATION_GUIDANCE` de `src/shared/product_coach_guidance.ts`). É onde entram os
   skills de processo/qualidade que valem para TODO build (curadoria abaixo).
2. **Contexto por app** — `AGENTS.md`/`DESIGN.md` gravados na raiz de cada app
   gerado (o agente do Samba já respeita AI rules do projeto). É onde entram o
   design system do cliente (vindo do Córtex) e refs de DESIGN.md.
3. **Ferramentas** — via MCP (Córtex, Composio, markitdown) para contexto e ações.

A curadoria abaixo lista o que merece virar nativo; a instalação mecânica nos
pontos 1-2 é a fase "integrar skills" (próxima do roadmap).

## Curadoria (repos avaliados — set/2026)

### 🟢 Nativos (recomendado, alto valor p/ produzir apps de clientes)

| Skill                     | Origem                                                    | Por quê                                                                                                                                           |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **karpathy-guidelines**   | multica-ai/andrej-karpathy-skills (MIT, 210k★)            | 4 princípios anti-pitfall (think first, simplicidade, mudança cirúrgica, goal-driven). 1 arquivo, zero peso — vira seção fixa do prompt           |
| **design-taste-frontend** | Leonxlnx/taste-skill (MIT)                                | Anti-slop de UI: layout/tipografia/motion com "dials" (variação/motion/densidade). É a diferença entre app genérico e app com intenção de design  |
| **ui-ux-pro-max**         | nextlevelbuilder/ui-ux-pro-max (MIT, 125k★)               | Motor de raciocínio de design: 192 regras por indústria + 79 estilos + gerador de design system. Ideal para o blueprint inicial do app do cliente |
| **DESIGN.md refs**        | VoltAgent/awesome-design-md (MIT, 114k★)                  | 73+ design systems reais em DESIGN.md (formato que o agente lê). Base visual + padrão para gerarmos o DESIGN.md da Samba/do cliente               |
| **document skills**       | anthropics/skills (docx/pdf/pptx/xlsx — source-available) | Clientes pedem entregáveis além de código (proposta, doc, deck). O Hermes já usa estas; o Samba Builder herda o padrão p/ docs do projeto         |

### 🟡 Opcionais (adotar quando o caso aparecer)

| Skill                   | Origem                        | Quando                                                                                                                      |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Understand-Anything** | Egonex-AI (MIT, 80k★)         | Quando o cliente pede evoluir app EXISTENTE: grafo de conhecimento do código antes de mexer (Hermes é plataforma suportada) |
| **markitdown**          | microsoft (MIT, 178k★)        | Ingestão de material do cliente (PDF/PPT/docs → markdown p/ o Córtex). Já roda no seu stack (venv) — expor via MCP          |
| **spec-kit**            | github/spec-kit (MIT, 134k★)  | Fluxo spec→plan→tasks→converge para projetos grandes/multifase; o Samba já tem Plan mode, então só para contratos complexos |
| **superpowers**         | obra/superpowers (MIT, 282k★) | Metodologia TDD/worktrees/review — ótima p/ o DEV do próprio Samba Builder (Hermes tem plugin), pesada p/ dentro do produto |
| **mattpocock/skills**   | mattpocock (AI Hero)          | grill-me/to-spec/domain-modeling p/ refinar requisito com o cliente — útil no kickoff de projeto grande                     |

### 🔴 Não levar agora (decisões conscientes)

| Repo                                                           | Motivo                                                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| affaan-m/ECC (246k★)                                           | Sistema de "performance do harness" p/ Claude Code — pesado, sobrepõe o que o Samba já faz; avaliar se o produto crescer p/ equipes grandes |
| msitarzewski/agency-agents                                     | Personae de especialistas: o Samba Builder é um agente de build, não um "agency" — o Córtex já tem os workers da Samba                      |
| ComposioHQ/awesome-claude-skills                               | Skills "X Automation" duplicam as tools que o Composio já entrega via MCP (conectado) — seria bloat de prompt                               |
| punkpeye/awesome-mcp-servers                                   | Catálogo de referência (não skills) — usar para escolher MCPs pontuais                                                                      |
| anthropics/claude-code, lobehub/lobehub, remotion-dev/remotion | Produtos/frameworks, não skills de build (remotion: só se o Samba Builder passar a gerar vídeo)                                             |

## Estrutura

```
samba/skills/
  README.md            ← este catálogo
  feedback/            ← feedbacks dos devs (JSONL) — entrada do loop de evolução
  evolution/
    SKILL.md           ← meta-skill: como evoluir skills com feedback
    evolve.py          ← agrega feedbacks → propostas de patch (dry-run/apply)
    proposals/         ← propostas geradas (exigem aprovação humana)
  native/              ← skills curados aprovados (fase integrar)
```
