# Samba Builder

**O Lovable da SambaTech** — fork brandado do [Dyad](https://github.com/dyad-sh/dyad)
(21k+ ⭐, Apache 2.0) para produzir projetos de clientes com DeepSeek, alimentado
pelo **Córtex** (second brain + RAG) — que evolui a cada projeto entregue.

## Decisões (ADRs)

| #   | Decisão                                                                | Por quê                                                                                                         |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | **Fork brandado** do Dyad (Apache 2.0), não uso vanilla                | Identidade Samba Builder desde já; core aberto permite evolução própria                                         |
| 2   | **LLM via gateway Hermes local** (`127.0.0.1:8642`, OpenAI-compatible) | Chave DeepSeek única e centralizada; nada exposto nas máquinas; já ativo                                        |
| 3   | **Conhecimento no Córtex atual** (vault + RAG `127.0.0.1:8899`)        | Design system SambaTech e aprendizado já vivem lá; projetos entram com namespace próprio (00-Inbox → distiller) |
| 4   | Integração via **MCP nativo do Dyad**                                  | Mecanismo oficial de tools; sem hack no código core; `samba/cortex-mcp/`                                        |

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  Samba Builder (fork Dyad — Electron + React)                │
│  prompt → agente → arquivos no disco → preview → deploy      │
│    LLM: custom provider → 127.0.0.1:8642 (DeepSeek v4 flash) │
│    Contexto: MCP tools do Córtex (samba/cortex-mcp)          │
└────────────┬──────────────────────────────────┬──────────────┘
             ▼                                  ▼
┌──────────────────────────┐      ┌────────────────────────────┐
│  Córtex (RAG 8899)       │      │  Learning loop             │
│  /kunits · /search · /kg │      │  samba/learn/learn.py      │
│  design system SambaTech │      │  projeto → 00-Inbox →      │
│  knowledge units (1.7k+) │      │  distiller → units →       │
│                           │      │  próximo projeto nasce    │
│                           │      │  com esse contexto        │
└──────────────────────────┘      └────────────────────────────┘
```

## Estrutura do repo

- `samba/cortex-mcp/` — **MCP server** (Python stdlib, zero deps): expõe units/design system/search/kg do Córtex como tools do agente. Ver `samba/cortex-mcp/README.md`.
- `samba/learn/` — **learning loop** (CLI): relatório estruturado de projeto → 00-Inbox do Córtex → pipeline canônico de captura/destilação.
- Resto = upstream Dyad (não editar fora de `samba/` sem necessidade — rebase limpo).

## Setup (runbook)

Pré-requisitos:

1. **Córtex ativo**: RAG em `127.0.0.1:8899` (memory-server).
2. **Gateway LLM ativo**: Hermes em `127.0.0.1:8642` (OpenAI-compatible, DeepSeek). A chave usada é a `API_SERVER_KEY` do gateway — entra na config do app, nunca no código.

App (primeira execução):

```bash
cd ~/Projects/Samba-Builder
npm install            # já feito
npm run init-precommit # hooks (uma vez)
npm run dev            # Electron em modo dev
```

Provider custom (Settings → Providers → Custom):

- Base URL: `http://127.0.0.1:8642/v1`
- API key: valor da `API_SERVER_KEY` do gateway
- Model: `deepseek-v4-flash`

Córtex no agente (Settings → MCP → Add server → stdio):

- Command: `/usr/bin/python3`
- Args: `/Users/gustavocaetano/Projects/Samba-Builder/samba/cortex-mcp/server.py`

Composio (integrado via `npm run samba:seed-mcp`):

- Registra o MCP server remoto `https://connect.composio.dev/mcp` (transport http)
  com a Connect Key do Hermes (`~/.hermes/config.yaml → mcp_servers.composio`) —
  chave gravada no formato `plain:` que o secret_storage do app decodifica;
  nunca versionada/impressa. Ajuste/edição pela UI (Settings → MCP).

Testar sem o app:

```bash
python3 samba/cortex-mcp/server.py --test
python3 samba/learn/learn.py --project /tmp/dummy-projeto --name "Teste" --dry-run
```

## Learning loop (pós-projeto)

```bash
python3 samba/learn/learn.py --project ~/Projetos/landing-x \
    --name "Landing Cliente X" --client "Cliente X" \
    --summary "Landing institucional, Next.js + Tailwind" \
    --notes "Hero com vídeo; aplicado design system SambaTech" --memory
```

→ relatório em `00-Inbox/` (entra no fluxo do Córtex: heartbeat → distiller → knowledge units)
→ validação humana marca o check-list de aprendizado → vira unit → próximo projeto herda.

## Licença — limites do fork

- Core do Dyad: **Apache 2.0** (uso comercial e fork permitidos).
- `src/pro/` (features avançadas): **FSL-1.1-ALv2** — uso interno e serviços
  profissionais para clientes **permitidos**; redistribuir como produto que
  substitui o Dyad **proibido**. Samba Builder = uso interno da SambaTech →
  dentro da licença. **Não publicar o app empacotado publicamente.**
- Código novo em `samba/`: MIT.

## Roadmap

**Fundação (feita)**

- [x] Fork clonado + npm install validado (Node 24 em `~/.local/node24`)
- [x] Repo GitHub privado: `criptogus/Samba-Builder` (origin) + `upstream` = dyad-sh/dyad
- [x] MCP server do Córtex (units, design system, search, kg) + seed no app (`samba:seed-cortex`)
- [x] Learning loop v1 (relatório → 00-Inbox → memória)
- [x] App rodando em dev (fix: skip move-to-Applications em dev)
- [x] Rebrand v1: nome/logo/pt-BR default 100% coberto
- [x] Anti-Dyad v1+v2 (trial/upsell/cloud) + **v3: zero escritos "Dyad" no app**
      (376 arquivos; só créditos/técnico preservados; pasta de apps → `samba-apps`)
- [x] Providers pré-configurados: `samba:seed` (DeepSeek gateway :8642 + OpenCode Go)
- [x] Composio nativo (`samba:seed-mcp`) · Playwright MCP (`samba:seed-playwright`) ·
      cua-driver computer use (`samba:seed-cua`) — 4 plugins MCP ativos
- [x] Governança: MODELO (single/governed), `gate.py` (submit/approve/veto/check/audit
      com hash encadeado), `github_adapter.py` (papéis↔GitHub, testado), proposta-comercial
- [x] Design System Toolkit (extract/save/list/apply) em `samba/design-system/`
- [x] Skills nativos: `samba/skills/` + meta-skill de evolução por feedback
      (Codex: UI NativeSkillsLibrary)

**Auto-evolução (roadmap-hermes — implementado)**

- [x] P0 Córtex no fluxo do agente (bloco `cortex_knowledge` no prompt: retrieval
      automático de units/search/entity/design_system antes de tarefas de domínio)
- [x] P1 Memória por projeto (`docs/PROJECT_MEMORY.md` — lida e mantida pelo agente)
- [x] P2 Jeito Samba injetado no prompt (bonito/elegante/rápido/inovador/simples/seguro)
- [x] P3 Auto-evolução governada — `samba/autopilot/improve.py` (propostas com
      evidência → aprovação humana via `gate.py`; nunca merge silencioso)
- [x] P4 Qualidade medida — `samba/quality/score.py` (LLM-as-judge local, rubric
      Samba, chave BYOK; `npm run samba:score -- <app>`)
- [x] P5 Vigilância — `samba/autopilot/health.py` + `telemetry.py` (erros do app →
      feedback JSONL local com redação de segredos; agendável via cron/launchd)
- [x] P6 Espelho corporativo — `samba/autopilot/publish.py` (conhecimento aprovado
      → PR no GitHub; merge humano)
- [x] Zero Dyad: backend desligado (catálogo/templates/update/quota locais),
      conectores diretos Supabase (PAT) e Neon (API key), links → sambatech.com,
      scaffold dos apps gerados sem assinatura dyad.sh
- [x] UI Governança (`GovernancePanel`) e UI Design System (`DesignSystemDialog`)
      — componentes na main; registro IPC entra com o commit do trabalho em
      andamento (arquivos compartilhados com outro agente)

**Pendências reais (próximos)**

- [ ] Merge do trabalho em andamento na main (Codex: 108 arquivos em wip — ativa
      o registro das UIs de governança/design system + painel de management)
- [ ] Rebuild + instalar com as UIs ativas
- [ ] Adapter GitHub no app (branch protection automática por política)
- [ ] Piloto: primeiro projeto de cliente real de ponta a ponta
- [ ] Loop automático pós-projeto agendado (cron do autopilot + eval de qualidade)

