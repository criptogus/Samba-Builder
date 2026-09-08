#!/usr/bin/env python3
"""
Samba Builder — Seed do plugin Playwright MCP (teste de sites/apps no browser)

Registra o Playwright MCP (microsoft/playwright-mcp, Apache-2.0) como MCP
server stdio no Samba Builder. O agente ganha tools de browser: navegar, clicar,
preencher, snapshot de acessibilidade, console, screenshots — testa o app gerado
rodando em localhost direto no browser da máquina do cliente.

SEM modelo com visão: o Playwright MCP usa accessibility snapshots (DOM), então
funciona com DeepSeek (texto). Alternativa para sessões logadas: Browser MCP
(browsermcp.io, extensão Chrome) — mesmo padrão stdio.

Requisitos: npx acessível no PATH do app (node >= 18) e browsers do Playwright
instalados (npx playwright install chromium) na primeira execução.

Uso: python3 samba/setup/seed-mcp-playwright.py   (idempotente)
"""
import json
import sqlite3
import os
import sys

APP_DB = os.path.join(os.path.dirname(__file__), "..", "..", "userData", "sqlite.db")

SERVER = {
    "name": "Playwright",
    "transport": "stdio",
    "command": "npx",
    "args": json.dumps(["@playwright/mcp@latest"]),
    "env_json": None,
    "url": None,
    "headers_json": None,
}


def main() -> int:
    db = os.path.abspath(APP_DB)
    if not os.path.exists(db):
        print(f"ERRO: banco do app não encontrado em {db}")
        print("Rode o app uma vez (npm run dev) antes do seed.")
        return 1
    con = sqlite3.connect(db)
    existing = con.execute("SELECT id FROM mcp_servers WHERE name = ?", (SERVER["name"],)).fetchone()
    if existing:
        con.execute(
            "UPDATE mcp_servers SET transport=?, command=?, args=?, enabled=1, updated_at=unixepoch() WHERE name=?",
            (SERVER["transport"], SERVER["command"], SERVER["args"], SERVER["name"]),
        )
        print(f"Playwright MCP atualizado (id {existing[0]}, já registrado).")
    else:
        con.execute(
            "INSERT INTO mcp_servers (name, transport, command, args, enabled) VALUES (?, ?, ?, ?, 1)",
            (SERVER["name"], SERVER["transport"], SERVER["command"], SERVER["args"]),
        )
        print("Playwright MCP registrado e habilitado.")
    con.commit()
    row = con.execute("SELECT name, transport, command, args, enabled FROM mcp_servers WHERE name='Playwright'").fetchone()
    print(f"Verificado: {row}")
    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
