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
    SAMBA_OPENCODE_BASE_URL  default https://opencode.ai/zen/go/v1 (OpenCode Go, OpenAI-compatible)
"""
import os
import sqlite3
import sys
import time

DB = os.environ.get(
    "SAMBA_DB",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "userData", "sqlite.db")),
)
DEEPSEEK_BASE = os.environ.get("SAMBA_DEEPSEEK_BASE_URL", "https://api.deepseek.com")
# OpenCode Go (assinatura flat): endpoint OpenAI-compatible — deepseek-v4-pro/flash
# (https://opencode.ai/docs/go). Chave: opencode.ai/auth (cole na UI). Mesma chave do Zen.
OPENCODE_BASE = os.environ.get("SAMBA_OPENCODE_BASE_URL", "https://opencode.ai/zen/go/v1")
# Defaults anteriores do seed — se o provider ainda estiver neles, migra para o Go
OPENCODE_PREVIOUS_DEFAULTS = [
    "http://127.0.0.1:11435/v1",      # proxy local (v1 do seed)
    "https://opencode.ai/zen/v1",     # Zen pay-as-you-go (v2 do seed)
    "http://127.0.0.1:8642/v1",       # gateway local do Hermes (v3 do seed — revertido p/ API direta)
]

PROVIDERS = [
    {"id": "deepseek-samba", "name": "DeepSeek", "api_base_url": DEEPSEEK_BASE},
    {"id": "opencode-local", "name": "OpenCode", "api_base_url": OPENCODE_BASE},
]

MODELS = [
    {"provider": "deepseek-samba", "display_name": "DeepSeek V4 Flash", "api_name": "deepseek-v4-flash"},
    {"provider": "opencode-local", "display_name": "DeepSeek V4 Pro (OpenCode)", "api_name": "deepseek-v4-pro"},
    {"provider": "opencode-local", "display_name": "DeepSeek V4 Flash (OpenCode)", "api_name": "deepseek-v4-flash"},
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
            row = con.execute(
                "SELECT api_base_url FROM language_model_providers WHERE id = ?", (p["id"],)
            ).fetchone()
            if row:
                if row[0] in OPENCODE_PREVIOUS_DEFAULTS:
                    con.execute(
                        "UPDATE language_model_providers SET api_base_url = ?, updated_at = ? WHERE id = ?",
                        (p["api_base_url"], now, p["id"]),
                    )
                    print(f"provider '{p['id']}': base_url migrada -> {p['api_base_url']}")
                else:
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
