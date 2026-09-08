#!/usr/bin/env python3
"""
Samba Builder — Seed do plugin cua-driver (computer use real no desktop)

Registra o cua-driver (trycua/cua, open source, cross-platform: macOS/Windows/
Linux) como MCP server stdio no Samba Builder. O agente ganha computer use de
verdade: opera QUALQUER app da máquina do cliente em background (sem roubar
foco/cursor) — abrir o browser, navegar o site gerado, testar o app desktop —
lendo a árvore de acessibilidade do sistema (modo ax) em vez de screenshots.

Por que ax importa: funciona com LLM de TEXTO (DeepSeek). Quando o gateway
tiver modelo com visão, os modos som/vision (screenshots numerados) entram.

Instalação por máquina (uma vez): binário + permissões TCC
    curl -fsSL https://cua.sh/install | bash   # ou: hermes computer-use install
    cua-driver permissions grant               # Accessibility + Screen Recording
Verifique com: cua-driver doctor

Uso: python3 samba/setup/seed-mcp-cua.py   (idempotente)
"""
import json
import os
import shutil
import sqlite3
import subprocess
import sys

APP_DB = os.path.join(os.path.dirname(__file__), "..", "..", "userData", "sqlite.db")


def find_binary() -> str:
    for cand in ("/Users/gustavocaetano/.local/bin/cua-driver",):
        if os.path.exists(cand):
            return cand
    found = shutil.which("cua-driver")
    if found:
        return found
    print("ERRO: cua-driver não encontrado. Instale com: hermes computer-use install")
    sys.exit(1)


def main() -> int:
    db = os.path.abspath(APP_DB)
    if not os.path.exists(db):
        print(f"ERRO: banco do app não encontrado em {db}")
        print("Rode o app uma vez (npm run dev) antes do seed.")
        return 1

    binary = find_binary()
    version = "?"
    try:
        out = subprocess.run([binary, "--version"], capture_output=True, text=True, timeout=10)
        version = out.stdout.strip() or out.stderr.strip() or version
    except Exception:
        pass

    con = sqlite3.connect(db)
    name = "Computer Use (cua-driver)"
    args = json.dumps(["mcp"])
    existing = con.execute("SELECT id FROM mcp_servers WHERE name = ?", (name,)).fetchone()
    if existing:
        con.execute(
            "UPDATE mcp_servers SET transport='stdio', command=?, args=?, enabled=1, updated_at=unixepoch() WHERE name=?",
            (binary, args, name),
        )
        print(f"{name} atualizado (id {existing[0]}).")
    else:
        con.execute(
            "INSERT INTO mcp_servers (name, transport, command, args, enabled) VALUES (?, 'stdio', ?, ?, 1)",
            (name, binary, args),
        )
        print(f"{name} registrado e habilitado.")
    con.commit()
    row = con.execute("SELECT name, transport, command, args, enabled FROM mcp_servers WHERE name=?", (name,)).fetchone()
    print(f"Verificado: {row}")
    print(f"Binário: {binary} ({version.strip()})")
    con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
