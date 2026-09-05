# Cortex MCP Server — ponte Samba Builder ↔ Córtex

Servidor MCP (Model Context Protocol) em Python puro (stdlib, zero dependências)
que expõe o Córtex (RAG em `127.0.0.1:8899`) como ferramentas para o agente do
Samba Builder. O Dyad suporta MCP nativamente (stdio) — este servidor é o
mecanismo oficial de contexto.

## Por que stdlib puro?

- Mesma filosofia do memory-server do Córtex: zero deps externas, roda em qualquer Python 3.9+
- Sem SDK MCP para instalar/manter; protocolo stdio é JSON-RPC 2.0 newline-delimited
- Se o cliente exigir recursos avançados (logging/sampling), migrar para o SDK oficial `mcp` é trivial

## Tools expostas

| Tool | Endpoint Córtex | Uso |
|---|---|---|
| `cortex_units` | `/kunits` (intent=auto, distill) | Knowledge units destiladas: facts, skills, facetas — a base de aprendizado |
| `cortex_design_system` | `/kunits` (intent=skill) | Design system da marca pedida (ex: "sambatech", "pense simples") + fallback open-design |
| `cortex_search` | `/search` | Busca híbrida em notas do vault |
| `cortex_entity` | `/kg/entity` | Entidade do knowledge graph (empresas, pessoas, conceitos) |
| `cortex_health` | `/health` | Status do Córtex |

## Como rodar

```bash
# Córtex ativo (RAG 8899) — pré-requisito
python3 server.py            # modo servidor MCP (stdio) — é o que o Dyad invoca
python3 server.py --test     # smoke test: initialize → tools/list → cortex_health
```

Envs (opcionais):
- `CORTEX_RAG_URL` — default `http://127.0.0.1:8899`
- `CORTEX_MAX_CHARS` — teto de caracteres por resposta de tool (default 2500; protege o contexto do LLM)

## Conectar no Samba Builder (UI)

Settings → MCP → Add server → tipo **stdio**:
- Command: `/usr/bin/python3`
- Args: `/caminho/para/Samba-Builder/samba/cortex-mcp/server.py`

## Boas práticas para as tools

- Respostas sempre truncadas (`CORTEX_MAX_CHARS`) e com fonte em `file://` — o agente cita de onde veio
- `cortex_units` com `distill=true` devolve bullets ≤ max_tokens com data `[YYYY-MM-DD]`
  (datas absolutas: modelos não computam tempo relativo — lição Tars, vault-rag)
- Sempre enviar `intent` quando o tipo for conhecido (skill/fact) — roteia o boost de ordenação

## Teste manual (sem o app)

```bash
printf '%s\n' \
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}' \
'{"jsonrpc":"2.0","method":"notifications/initialized"}' \
'{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"cortex_design_system","arguments":{"brand":"sambatech"}}}' \
| python3 server.py
```
