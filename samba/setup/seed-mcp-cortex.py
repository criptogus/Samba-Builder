#!/usr/bin/env python3
"""
Samba Builder — Seed do plugin MCP do Córtex (second brain da Samba)

Registra o MCP server do Córtex (samba/cortex-mcp/server.py, stdio) no app. O
agente do Samba Builder ganha as tools cortex_units / cortex_design_system /
cortex_search / cortex_entity / cortex_health — todo novo projeto nasce
consultando o que a fábrica já aprendeu (design systems, padrões, units).

Requisito: Córtex RAG vivo em 127.0.0.1:8899 (hermes second-brain).

Uso: python3 samba/setup/seed-mcp-cortex.py   (idempotente)
"""
import json
import os
import shutil
import sqlite3
import sys

APP_DB = os.path.join(os.path.dirname(__file__), "..", "..", "userData", "sqlite.db")
SERVER_PATH = os.path.join(os.path.dirname(__file__), "..", "cortex-mcp", "server.py")


def find_python() -> str:
    for cand in ("/usr/bin/python3", shutil.which("python3") or ""):
        if cand and os.path.exists(cand):
            return cand
    print("ERRO: python3 não encontrado")
    sys.exit(1)


def main() -> int:
    db = os.path.abspath(APP_DB)
    if not os.path.exists(db):
        print(f"ERRO: banco do app não encontrado em {db}")
        return 1
    server = os.path.abspath(SERVER_PATH)
    if not os.path.exists(server):
        print(f"ERRO: server do Córtex não encontrado em {server}")
        return 1

    python = find_python()
    name = "Córtex (Second Brain)"
    args = json.dumps([server])
    con = sqlite3.connect(db)
    existing = con.execute("SELECT id FROM mcp_servers WHERE name = ?", (name,)).fetchone()
    if existing:
        con.execute(
            "UPDATE mcp_servers SET transport='stdio', command=?, args=?, enabled=1, updated_at=unixepoch() WHERE name=?",
            (python, args, name),
        )
        print(f"{name} atualizado (id {existing[0]}).")
    else:
        con.execute(
            "INSERT INTO mcp_servers (name, transport, command, args, enabled) VALUES (?, 'stdio', ?, ?, 1)",
            (name, python, args),
        )
        print(f"{name} registrado e habilitado.")
    con.commit()
    row = con.execute("SELECT name, transport, command, args, enabled FROM mcp_servers WHERE name=?", (name,)).fetchone()
    print(f"Verificado: {row}")
    print(f"Server: {server} ({python})")
    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
