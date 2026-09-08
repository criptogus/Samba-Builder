# Samba Builder — handoff para o time Samba

> Documento curto de contexto: o que é, o que já faz, para onde vai.
> Repo: `criptogus/Samba-Builder` (privado) · docs aprofundados em `samba/README.md` e `samba/docs/roadmap-hermes.md`.

## O que é

**Plataforma da Samba para criar apps com IA, rodando 100% local.** É um fork do
[Dyad](https://github.com/dyad-sh/dyad) (open source, 21k★) que a gente rebrandou
e **desligou todo o backend do Dyad** — não existe servidor nosso nem assinatura:
o usuário cola a chave de um provider (DeepSeek por padrão) e o agente constrói o
produto na máquina dele. Dados do cliente nunca saem do ambiente local.

O uso é como num Lovable/bolt: você descreve o produto em conversa → o agente
planeja, escreve o código (React + TypeScript full-stack), mostra o preview →
você itera. A diferença: **cada cliente/projeto pode ter o próprio conhecimento**
(Córtex), **o software se avalia e se melhora sozinho com aprovação humana** e
**a governança é do jeito Samba** (single para uso pessoal, governed para time).

## Features principais (o que já existe)

| Feature | Como funciona |
|---|---|
| **Agente de construção local** | Conversa → app completo (plano → código → preview → itera). A lista de modelos mostra **só os conectados** (chave presente) — sem confusão |
| **BYOK, zero assinatura** | Chave do provider direto na UI (DeepSeek `api.deepseek.com` por padrão). Nada de Pro/upgrade/trial — tudo liberado |
| **Zero backend do Dyad** | Catálogo de modelos/templates/update/quota locais. Sem telemetria remota, sem help bot, sem logs enviados. Links de marca → sambatech.com |
| **Conectores diretos** | GitHub (device flow nativo) · Supabase (cola o **PAT** `sb_pat_...`) · Neon (cola a **API key**) — sem OAuth de terceiros |
| **Córtex no fluxo do agente** | RAG local (knowledge units + design system + entidades + busca híbrida). O agente **consulta sozinho** o conhecimento do domínio antes de construir — cada cliente vira memória |
| **Memória por projeto** | `docs/PROJECT_MEMORY.md`: decisões e preferências registradas pelo agente — o projeto "lembra" entre sessões |
| **Qualidade medida (score)** | LLM-as-judge local com o **jeito Samba** (bonito, elegante, rápido, inovador, simples, seguro): `npm run samba:score -- <app>` → nota com evidências por dimensão |
| **Governança** | Modo `single` (livre) ou `governed` (corporativo): ciclo draft → in_review → approved com submit/approve/veto — painel no app + CLI (`gate.py`) + auditoria com hash |
| **Design System Toolkit** | Extrair o design system de um projeto (vars shadcn/tailwind) → salvar como template → aplicar em outro (UI no app + CLI) |
| **Auto-evolução** | Telemetria local de erros → analisador propõe melhorias **com evidência** → aprovação humana → conhecimento vira skill/PR. **Nunca merge silencioso** |
| **MCPs ativos** | Composio (500+ apps) · Playwright (24 tools) · cua-driver (computer use) · Córtex |
| **Apps dos clientes limpos** | Scaffold gerado sem assinatura do Dyad ("Made with Samba Builder" → sambatech.com) |

## Roadmap — pilares "estilo Hermes" (todos implementados)

Ordem lógica: *enxerga → lembra → aprende → se mede → se vigia → só então melhora sozinho*.

| Pilar | Entrega |
|---|---|
| **P0 — Conhecimento no fluxo** | Córtex consultado automaticamente pelo agente (retrieval antes de tarefas de domínio/design) |
| **P1 — Memória** | Projeto mantém decisões entre sessões (`PROJECT_MEMORY.md`) |
| **P2 — Jeito Samba no prompt** | Princípios de qualidade + design via Córtex injetados no agente |
| **P3 — Auto-evolução governada** | Propostas de melhoria com evidência → aprovação humana via gate |
| **P4 — Qualidade medida** | Score LLM-as-judge com rubric do jeito Samba |
| **P5 — Vigilância** | Health check + telemetria local de erros (redige segredos) |
| **P6 — Conhecimento corporativo** | Conhecimento aprovado espelhado como **PR** no GitHub (merge humano) |

## Próximos passos (fora do código)

1. **Merge do trabalho em andamento** (Codex está evoluindo em paralelo: biblioteca de skills nativa, publish cloud, perf de memória) — ativa as UIs de governança/design system no build instalado
2. **Adapter GitHub no app** — branch protection automática por política
3. **Piloto com cliente real** — primeiro projeto de ponta a ponta (criar → score → memória → governança) para validar o fluxo de venda/entrega
4. **Cron do autopilot** agendado + eval de qualidade contínua

## Stack e operação

- **Stack**: Electron + React + TypeScript (Base UI), Node 24 (`~/.local/node24`), oxlint/tsgo, vitest
- **Estrutura**: `src/` (app) · `samba/` (governança `gate.py`, design system `design.py`, qualidade `score.py`, autopilot, skills, seeds de MCP) · `scaffold/` (template dos apps gerados)
- **Build local sem assinatura**: `SAMBA_LOCAL_DESKTOP_BUILD=true npm run package`
- **Licença**: core Apache-2.0 · `src/pro/` FSL-1.1-ALv2 (uso interno Samba + serviços a clientes permitidos; não publicar o app empacotado publicamente) · código novo em `samba/`: MIT
- **Testes**: ~7.8k testes; suíte integrada valida o fluxo BYOK ponta a ponta

*Para o time: o jeito certo de começar é rodar o app (npm install + `npm run dev`),
conectar a chave DeepSeek em Settings → Providers e pedir um app simples ao agente.
O resto — Córtex, memória, governança — aparece sozinho no fluxo.*
