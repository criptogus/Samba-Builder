#!/usr/bin/env python3
"""
Samba Builder — seed de providers pré-configurados.

Cria (se ausentes) os custom providers DeepSeek e OpenCode no banco do app
(userData/sqlite.db), prontos para uso — só falta colar a chave na UI.

Por que Python stdlib (não better-sqlite3)? O better-sqlite3 do repo é
compilado para a ABI do Electron e falha sob Node do sistema (regra
database-drizzle.md). sqlite3 stdlib é o caminho suportado para escrita externa.

Uso:
    python3 samba/setup/seed-providers.py            # DB dev padrão (./userData/sqlite.db)
    SAMBA_DB=/path/to/sqlite.db python3 samba/setup/seed-providers.py

Env (opcionais):
    SAMBA_LLM_BASE_URL       default http://127.0.0.1:8642/v1  (gateway Hermes/DeepSeek)
    SAMBA_OPENCODE_BASE_URL  default http://127.0.0.1:11435/v1 (proxy OpenAI-compatível do OpenCode)
"""
import os
import sqlite3
import sys
import time

DB = os.environ.get(
    "SAMBA_DB",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "userData", "sqlite.db")),
)
GATEWAY_BASE = os.environ.get("SAMBA_LLM_BASE_URL", "http://127.0.0.1:8642/v1")
OPENCODE_BASE = os.environ.get("SAMBA_OPENCODE_BASE_URL", "http://127.0.0.1:11435/v1")

PROVIDERS = [
    {"id": "deepseek-samba", "name": "DeepSeek (Samba)", "api_base_url": GATEWAY_BASE},
    {"id": "opencode-local", "name": "OpenCode", "api_base_url": OPENCODE_BASE},
]

MODELS = [
    {"provider": "deepseek-samba", "display_name": "DeepSeek V4 Flash", "api_name": "deepseek-v4-flash"},
    {"provider": "opencode-local", "display_name": "DeepSeek V4 Pro (OpenCode)", "api_name": "deepseek-v4-pro"},
]


def main() -> int:
    if not os.path.exists(DB):
        print(f"ERRO: banco não encontrado em {DB}", file=sys.stderr)
        print("Rode o app uma vez (npm run dev) para criar o banco, depois o seed.", file=sys.stderr)
        return 1

    con = sqlite3.connect(DB)
    now = int(time.time())
    try:
        for p in PROVIDERS:
            exists = con.execute(
                "SELECT 1 FROM language_model_providers WHERE id = ?", (p["id"],)
            ).fetchone()
            if exists:
                print(f"provider '{p['id']}' já existe — mantido (preserva edição manual)")
                continue
            con.execute(
                "INSERT INTO language_model_providers (id, name, api_base_url, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (p["id"], p["name"], p["api_base_url"], now, now),
            )
            print(f"provider criado: {p['name']} -> {p['api_base_url']}")

        for m in MODELS:
            exists = con.execute(
                "SELECT 1 FROM language_models WHERE custom_provider_id = ? AND api_name = ?",
                (m["provider"], m["api_name"]),
            ).fetchone()
            if exists:
                print(f"model '{m['api_name']}' já existe — mantido")
                continue
            con.execute(
                "INSERT INTO language_models (display_name, api_name, custom_provider_id, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (m["display_name"], m["api_name"], m["provider"], now, now),
            )
            print(f"model criado: {m['display_name']} (provider {m['provider']})")

        con.commit()
    finally:
        con.close()

    print("Seed OK — providers pré-configurados no Samba Builder.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
