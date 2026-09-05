#!/usr/bin/env python3
"""
Samba Builder — Learning Loop (fase 1)

Fecha o ciclo: projeto entregue → aprendizado destilado → Córtex evolui.
A cada projeto de cliente, este script gera um relatório estruturado que entra
na 00-Inbox do Córtex (fluxo canônico 0-Captura → distiller → knowledge units),
para o próximo projeto nascer com esse contexto.

Uso:
    python3 learn.py --project ~/Projetos/landing-cliente-x \
        --name "Landing Cliente X" \
        --client "Cliente X" \
        --summary "Landing institucional + seção de contato, Next.js" \
        [--notes "decisões: hero com vídeo, cores do design system Samba"]

Flags:
    --memory   também grava memória episódica via POST /memory no RAG
    --out      pasta de saída (default: 00-Inbox do Córtex)
    --dry-run  mostra o relatório sem escrever
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime

CORTEX_RAG_URL = os.environ.get("CORTEX_RAG_URL", "http://127.0.0.1:8899").rstrip("/")
DEFAULT_INBOX = os.path.expanduser("~/Documents/Second Brain/00-Inbox")
MAX_CHARS = 4000


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "projeto"


def detect_stack(project_dir: str) -> dict:
    """Detecta stack a partir de package.json (sem instalar nada)."""
    stack = {"deps": [], "dev_deps": [], "frameworks": [], "db": [], "ui": []}
    pkg_path = os.path.join(project_dir, "package.json")
    if not os.path.exists(pkg_path):
        return stack
    try:
        with open(pkg_path) as f:
            pkg = json.load(f)
    except (json.JSONDecodeError, OSError):
        return stack
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    stack["deps"] = sorted(deps)[:40]
    all_deps = " ".join(deps)
    fw_map = {
        "next": "Next.js", "vite": "Vite", "react": "React", "astro": "Astro",
        "vue": "Vue", "svelte": "Svelte", "remix": "Remix", "expo": "Expo/React Native",
    }
    db_map = {
        "supabase": "Supabase", "prisma": "Prisma", "drizzle": "Drizzle", "pg": "Postgres (pg)",
        "mongoose": "MongoDB/Mongoose", "redis": "Redis", "sqlite": "SQLite",
    }
    ui_map = {
        "tailwindcss": "Tailwind", "shadcn": "shadcn/ui", "chakra": "Chakra", "mantine": "Mantine",
        "radix": "Radix", "material-ui": "MUI", "antd": "Ant Design", "styled-components": "styled-components",
        "@base-ui": "Base UI",
    }
    for k, v in fw_map.items():
        if k in all_deps:
            stack["frameworks"].append(v)
    for k, v in db_map.items():
        if k in all_deps:
            stack["db"].append(v)
    for k, v in ui_map.items():
        if k in all_deps:
            stack["ui"].append(v)
    # estrutura top-level (sem node_modules/.git)
    top = []
    for entry in sorted(os.listdir(project_dir)):
        if entry.startswith(".") or entry in ("node_modules", "dist", "out", "build"):
            continue
        top.append(entry + ("/" if os.path.isdir(os.path.join(project_dir, entry)) else ""))
    stack["structure"] = top[:25]
    return stack


def build_report(args, stack: dict) -> str:
    today = date.today().isoformat()
    lines = []
    lines.append("---")
    lines.append("title: Samba Project — " + args.name)
    lines.append("type: project-learning")
    lines.append(f"created: {today}")
    lines.append("status: draft")
    lines.append("confidentiality: internal")
    lines.append("client: " + (args.client or "n/a"))
    lines.append("project_dir: " + args.project)
    lines.append("---")
    lines.append("")
    lines.append(f"# Projeto: {args.name}")
    lines.append("")
    lines.append("> Relatório de aprendizado gerado pelo Samba Builder (learning loop).")
    lines.append("> Fonte: projeto real entregue. Destilar em units após validação humana.")
    lines.append("")
    if args.summary:
        lines.append("## Resumo")
        lines.append("")
        lines.append(args.summary)
        lines.append("")
    lines.append("## Stack detectada")
    lines.append("")
    if stack["frameworks"]:
        lines.append("- Frameworks: " + ", ".join(stack["frameworks"]))
    if stack["db"]:
        lines.append("- Banco: " + ", ".join(stack["db"]))
    if stack["ui"]:
        lines.append("- UI: " + ", ".join(stack["ui"]))
    if stack["deps"]:
        lines.append(f"- Principais deps: {', '.join(stack['deps'][:20])}")
    lines.append("")
    lines.append("## Estrutura")
    lines.append("")
    lines.append("```")
    lines.append("\n".join(stack.get("structure", [])))
    lines.append("```")
    lines.append("")
    if args.notes:
        lines.append("## Decisões e observações")
        lines.append("")
        lines.append(args.notes)
        lines.append("")
    lines.append("## Aprendizado (pós-validação)")
    lines.append("")
    lines.append("- [ ] O que funcionou (manter como padrão)")
    lines.append("- [ ] O que não funcionou (evitar)")
    lines.append("- [ ] Componentes/padrões reutilizáveis?")
    lines.append("- [ ] Atualizar design system?")
    lines.append("")
    lines.append(f"_Gerado por Samba Builder em {datetime.now().strftime('%Y-%m-%d %H:%M')}_")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Samba Builder — learning loop")
    ap.add_argument("--project", required=True, help="caminho do projeto gerado")
    ap.add_argument("--name", required=True, help="nome do projeto")
    ap.add_argument("--client", default="", help="cliente (opcional)")
    ap.add_argument("--summary", default="", help="resumo do que foi construído")
    ap.add_argument("--notes", default="", help="decisões/observações do build")
    ap.add_argument("--memory", action="store_true", help="grava memória episódica no RAG")
    ap.add_argument("--out", default=DEFAULT_INBOX, help="pasta de saída")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    project = os.path.abspath(os.path.expanduser(args.project))
    if not os.path.isdir(project):
        print(f"ERRO: projeto não encontrado: {project}", file=sys.stderr)
        return 1

    stack = detect_stack(project)
    report = build_report(args, stack)

    if args.dry_run:
        print(report)
        return 0

    os.makedirs(args.out, exist_ok=True)
    fname = f"Samba-Project-{slugify(args.name)}-{date.today().isoformat()}.md"
    fpath = os.path.join(args.out, fname)
    with open(fpath, "w") as f:
        f.write(report)
    print(f"Relatório salvo: {fpath}")

    if args.memory:
        content = {
            "title": args.name,
            "client": args.client,
            "summary": args.summary[:500],
            "stack": stack["frameworks"] + stack["db"] + stack["ui"],
            "report": fpath,
        }
        url = CORTEX_RAG_URL + "/memory?type=episodic&user_id=samba-builder&content=" + urllib.parse.quote(json.dumps(content, ensure_ascii=False))
        req = urllib.request.Request(url, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                resp = json.loads(r.read().decode())
            print(f"Memória episódica gravada: {resp}")
        except Exception as e:  # noqa: BLE001
            print(f"Aviso: não foi possível gravar memória ({e}) — relatório já está na inbox.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
