#!/usr/bin/env python3
"""
Cortex MCP Server — expõe o Córtex (RAG 127.0.0.1:8899) como tools MCP (stdio)
para o Samba Builder (fork Dyad). Python stdlib puro, sem dependências.

Protocolo: JSON-RPC 2.0, newline-delimited sobre stdio (transporte MCP stdio).
Tools: cortex_units, cortex_design_system, cortex_search, cortex_entity, cortex_health.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

RAG_URL = os.environ.get("CORTEX_RAG_URL", "http://127.0.0.1:8899").rstrip("/")
MAX_CHARS = int(os.environ.get("CORTEX_MAX_CHARS", "2500"))
PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {"name": "cortex-mcp", "version": "0.1.0"}

TOOLS = [
    {
        "name": "cortex_units",
        "description": (
            "Busca knowledge units destiladas no Córtex (facts, skills, facetas de aprendizado) "
            "relevantes para a query. Use ANTES de gerar código quando precisar de padrões de "
            "projetos anteriores, fatos de clientes, convenções ou aprendizado acumulado. "
            "Responde bullets com data e fonte."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "O que você precisa saber (ex: 'stack de landing page de cliente', 'padrões de formulário')"},
                "intent": {"type": "string", "enum": ["fact", "skill", "episodic", "entity", "auto"], "description": "Tipo de conhecimento (auto = detecta)"},
                "limit": {"type": "integer", "description": "Máximo de units (default 5)"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "cortex_design_system",
        "description": (
            "Retorna o design system da marca pedida (ex: 'sambatech', 'pense simples') e, se a "
            "marca não existir no Córtex, fallback para referências abertas de design system. "
            "Use no início de todo projeto para aplicar a identidade visual correta."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "brand": {"type": "string", "description": "Nome da marca/cliente (ex: 'sambatech')"},
            },
            "required": ["brand"],
        },
    },
    {
        "name": "cortex_search",
        "description": "Busca híbrida (FTS5 + TF-IDF) em notas do vault Córtex. Use para contexto amplo quando cortex_units não bastar.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "integer", "description": "Máximo de notas (default 5)"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "cortex_entity",
        "description": "Consulta uma entidade no knowledge graph do Córtex (empresas, pessoas, conceitos, tecnologias) e retorna relações.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nome canônico da entidade (ex: 'SambaTech')"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "cortex_health",
        "description": "Verifica se o Córtex está acessível e retorna status (notas indexadas, units).",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def rag_get(path: str, params: Optional[dict] = None) -> dict:
    url = RAG_URL + path
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def truncate(text: str, max_chars: int = MAX_CHARS) -> str:
    return text if len(text) <= max_chars else text[:max_chars] + f"\n… [truncado em {max_chars} chars]"


def fmt_err(e: Exception) -> str:
    if isinstance(e, urllib.error.HTTPError):
        return f"erro HTTP {e.code} do Córtex ({RAG_URL})"
    return f"erro ao acessar Córtex em {RAG_URL}: {e}"


def _units_payload(data: dict) -> str:
    units = (data or {}).get("units") or []
    if not units:
        return "Nenhuma unit encontrada no Córtex."
    lines = []
    for u in units[: int(data.get("limit", 5))]:
        date = u.get("date") or ""
        lines.append(f"- [{date}] ({u.get('type')} conf={u.get('confidence')}) {u.get('content', '').strip()[:600]}")
        src = u.get("source") or u.get("link")
        if src:
            lines.append(f"  fonte: {src}")
    return truncate("\n".join(lines))


def call_tool(name: str, args: dict) -> dict:
    args = args or {}
    try:
        if name == "cortex_health":
            data = rag_get("/health")
            return {"ok": True, "text": f"Córtex OK: {data.get('status')} — notas={data.get('notes_indexed')} memories={data.get('memories')} kg={data.get('kg_entities')}"}

        if name == "cortex_units":
            data = rag_get("/kunits", {
                "q": args.get("query"), "intent": args.get("intent", "auto"),
                "limit": args.get("limit", 5), "distill": "true", "max_tokens": 300,
            })
            return {"ok": True, "text": _units_payload(data)}

        if name == "cortex_design_system":
            brand = (args.get("brand") or "").strip().lower()
            data = rag_get("/kunits", {
                "q": f"design system {brand}", "intent": "skill", "limit": 4, "distill": "true", "max_tokens": 300,
            })
            units = (data or {}).get("units") or []
            if not units:
                data = rag_get("/kunits", {"q": "open-design brand-grade design systems", "intent": "skill", "limit": 3, "distill": "true", "max_tokens": 300})
            return {"ok": True, "text": _units_payload(data) or f"Design system para '{brand}' não encontrado no Córtex."}

        if name == "cortex_search":
            data = rag_get("/search", {"q": args.get("query"), "limit": args.get("limit", 5)})
            results = (data or {}).get("results") or []
            if not results:
                return {"ok": True, "text": "Nenhuma nota encontrada."}
            lines = []
            for r in results[:5]:
                lines.append(f"- ({r.get('score', 0):.2f}) {r.get('title', '')}\n  {str(r.get('snippet', ''))[:300]}\n  fonte: {r.get('path', '')}")
            return {"ok": True, "text": truncate("\n".join(lines))}

        if name == "cortex_entity":
            data = rag_get("/kg/entity/" + urllib.parse.quote(args.get("name", "")))
            return {"ok": True, "text": truncate(json.dumps(data, ensure_ascii=False, indent=1)[:MAX_CHARS])}

        return {"ok": False, "text": f"Tool desconhecida: {name}"}
    except Exception as e:  # noqa: BLE001 — erro vira texto para o agente
        return {"ok": False, "text": fmt_err(e)}


def dispatch(msg: dict) -> Optional[dict]:
    method = msg.get("method")
    msg_id = msg.get("id")
    if method == "initialize":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": SERVER_INFO,
        }}
    if method == "notifications/initialized":
        return None
    if method == "ping":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {}}
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": TOOLS}}
    if method == "tools/call":
        params = msg.get("params") or {}
        res = call_tool(params.get("name", ""), params.get("arguments") or {})
        content = [{"type": "text", "text": res["text"]}]
        result: dict[str, object] = {"content": content}
        if not res["ok"]:
            result["isError"] = True
        return {"jsonrpc": "2.0", "id": msg_id, "result": result}
    return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Método não suportado: {method}"}}


def main() -> int:
    if "--test" in sys.argv:
        print("Smoke test: conectando no Córtex…")
        try:
            health = rag_get("/health")
            print(f"health: {health}")
        except Exception as e:  # noqa: BLE001
            print(f"FALHA: {e}")
            return 1
        print(f"tools disponíveis: {[t['name'] for t in TOOLS]}")
        print("Smoke test OK")
        return 0

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            resp = dispatch(msg)
            if resp is not None:
                sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
                sys.stdout.flush()
        except Exception as e:  # noqa: BLE001
            sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": msg.get("id"), "error": {"code": -32603, "message": str(e)}}) + "\n")
            sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
