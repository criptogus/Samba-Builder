# Samba Builder

**O Lovable da SambaTech** — fork brandado do [Dyad](https://github.com/dyad-sh/dyad)
(21k+ ⭐, Apache 2.0) para produzir projetos de clientes com DeepSeek, alimentado
pelo **Córtex** (second brain + RAG) — que evolui a cada projeto entregue.

## Decisões (ADRs)

| # | Decisão | Por quê |
|---|---|---|
| 1 | **Fork brandado** do Dyad (Apache 2.0), não uso vanilla | Identidade Samba Builder desde já; core aberto permite evolução própria |
| 2 | **LLM via gateway Hermes local** (`127.0.0.1:8642`, OpenAI-compatible) | Chave DeepSeek única e centralizada; nada exposto nas máquinas; já ativo |
| 3 | **Conhecimento no Córtex atual** (vault + RAG `127.0.0.1:8899`) | Design system SambaTech e aprendizado já vivem lá; projetos entram com namespace próprio (00-Inbox → distiller) |
| 4 | Integração via **MCP nativo do Dyad** | Mecanismo oficial de tools; sem hack no código core; `samba/cortex-mcp/` |

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

- [x] Fork clonado + npm install validado
- [x] MCP server do Córtex (units, design system, search, kg)
- [x] Learning loop v1 (relatório → 00-Inbox → memória)
- [ ] App rodando em dev + provider DeepSeek via gateway funcionando
- [ ] MCP do Córtex conectado e tools chamáveis no chat
- [ ] Branding v1 (nome/ícone, identidade Samba — design system aprovado)
- [ ] Piloto: primeiro projeto de cliente real de ponta a ponta
- [ ] Loop automático pós-projeto (cron/trigger) + eval de qualidade do que o Córtex devolve
