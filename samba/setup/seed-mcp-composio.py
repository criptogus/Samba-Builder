#!/usr/bin/env python3
"""
Samba Builder — seed do MCP server Composio.

Registra o Composio (https://connect.composio.dev/mcp) como MCP server no banco
do app (userData/sqlite.db), habilitado, com a Connect Key do Hermes
(Authorization: Bearer ck_...). A chave nunca é impressa.

Formato do header: a coluna headers_encrypted espera "plain:" + base64(JSON),
o fallback suportado pelo secret_storage do app (src/ipc/utils/secret_storage.ts)
— o build lê e decodifica normalmente mesmo sem keyring.

Uso:
    COMPOSIO_CONNECT_KEY=ck_xxx python3 samba/setup/seed-mcp-composio.py   # chave explícita
    python3 samba/setup/seed-mcp-composio.py                                 # lê do ~/.hermes/config.yaml (mcp_servers.composio)
"""
import base64
import json
import os
import re
import sqlite3
import sys
import time
from typing import Optional

DB = os.environ.get(
    "SAMBA_DB",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "userData", "sqlite.db")),
)
MCP_URL = "https://connect.composio.dev/mcp"
SERVER_NAME = "Composio"


def find_connect_key() -> Optional[str]:
    """Chave: env primeiro, depois mcp_servers.composio no config.yaml do Hermes."""
    env_key = os.environ.get("COMPOSIO_CONNECT_KEY", "").strip()
    if env_key:
        return env_key
    cfg = os.path.expanduser("~/.hermes/config.yaml")
    if not os.path.exists(cfg):
        return None
    try:
        with open(cfg) as f:
            lines = f.readlines()
    except OSError:
        return None
    # Mini-parse: seção mcp_servers: -> "  composio:" -> "      Authorization: Bearer ck_..."
    in_composio = False
    for line in lines:
        raw = line.rstrip("\n")
        if re.match(r"^mcp_servers:\s*$", raw):
            in_composio = False
            continue
        m = re.match(r"^(\s*)([A-Za-z0-9_-]+):\s*$", raw)
        if m and len(m.group(1)) == 2:
            in_composio = m.group(2) == "composio"
            continue
        if in_composio:
            m2 = re.match(r"^\s*Authorization:\s*Bearer\s+(\S+)\s*$", raw)
            if m2:
                return m2.group(1)
    return None


def main() -> int:
    if not os.path.exists(DB):
        print(f"ERRO: banco não encontrado em {DB}", file=sys.stderr)
        return 1
    key = find_connect_key()
    if not key:
        print(
            "ERRO: Connect Key do Composio não encontrada. Exporte COMPOSIO_CONNECT_KEY "
            "ou configure mcp_servers.composio no ~/.hermes/config.yaml.",
            file=sys.stderr,
        )
        return 1

    header_json = json.dumps({"Authorization": f"Bearer {key}"}, ensure_ascii=False)
    headers_encrypted = "plain:" + base64.b64encode(header_json.encode("utf-8")).decode("ascii")

    con = sqlite3.connect(DB)
    now = int(time.time())
    try:
        row = con.execute(
            "SELECT id, headers_encrypted FROM mcp_servers WHERE name = ?", (SERVER_NAME,)
        ).fetchone()
        if row:
            if row[1] is None or row[1] == "":
                con.execute(
                    "UPDATE mcp_servers SET transport = 'http', url = ?, headers_encrypted = ?, "
                    "enabled = 1, updated_at = ? WHERE id = ?",
                    (MCP_URL, headers_encrypted, now, row[0]),
                )
                print(f"MCP server '{SERVER_NAME}' atualizado com a chave (id {row[0]}).")
            else:
                print(f"MCP server '{SERVER_NAME}' já existe com chave — mantido (preserva edição manual).")
        else:
            con.execute(
                "INSERT INTO mcp_servers (name, transport, command, args, env_json, headers_json, "
                "env_encrypted, headers_encrypted, url, enabled, oauth_enabled, created_at, updated_at) "
                "VALUES (?, 'http', NULL, NULL, NULL, NULL, NULL, ?, ?, 1, 0, ?, ?)",
                (SERVER_NAME, headers_encrypted, MCP_URL, now, now),
            )
            print(f"MCP server '{SERVER_NAME}' criado e habilitado (http).")
        con.commit()
    finally:
        con.close()
    print("Seed MCP Composio OK — a chave não foi impressa.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
