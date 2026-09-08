#!/usr/bin/env python3
"""
Samba Builder — P6 do roadmap-hermes: publicar conhecimento aprovado como PR.

Espelho corporativo: quando há conhecimento novo APROVADO (skills evoluídas via
samba/skills/evolution/evolve.py, propostas de melhoria aprovadas em
samba/autopilot/proposals/approved/, relatórios de aprendizado em samba/learn),
este script abre um PR no GitHub — o merge NUNCA é automático nem silencioso:
o PR é a proposta de publicação e um humano (ou o gate de governança) aprova.

Requisitos: gh CLI autenticado (gh auth status). Sem rede fora do gh.
Uso:
  python3 samba/autopilot/publish.py [--dry-run] [--repo <owner/repo>]
  --dry-run: mostra o que seria publicado sem criar branch/PR.
"""

import argparse
import datetime
import os
import subprocess
import sys

KNOWLEDGE_PATHS = [
    "samba/skills",            # skills evoluídas (lições aprovadas)
    "samba/autopilot/proposals",  # propostas de melhoria (approved/)
    "samba/learn",             # relatórios de aprendizado
]

def run(cmd, cwd=None, check=True):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}: {r.stderr.strip()}")
    return r.stdout.strip()

def repo_root():
    return run(["git", "rev-parse", "--show-toplevel"])

def knowledge_delta(root):
    """Mudanças (tracked ou untracked) nos caminhos de conhecimento."""
    entries = []
    for p in KNOWLEDGE_PATHS:
        out = run(["git", "status", "--porcelain", p], cwd=root, check=False)
        for line in out.splitlines():
            if not line.strip():
                continue
            # evita staged de outros (wip de outro agente): só mostra/usa o que
            # está nos nossos caminhos de conhecimento
            entries.append(line)
    return entries

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--repo", default=None, help="owner/repo (default: origin do repo)")
    ap.add_argument("--title", default=None)
    args = ap.parse_args()

    root = repo_root()
    delta = knowledge_delta(root)
    if not delta:
        print("nada a publicar — rode evolve.py/improve.py e aprove primeiro (sem merge silencioso)")
        return 0

    date = datetime.date.today().isoformat()
    branch = f"knowledge/{date}"
    title = args.title or f"knowledge({date}): conhecimento aprovado para o time"

    body = [
        f"## Publicação de conhecimento — {date}",
        "",
        "Conhecimento aprovado no Samba Builder (espelho corporativo). Merge por",
        "um humano — nunca automático. Propostas e mudanças:",
        "",
        "```",
    ]
    body.extend(delta)
    body.append("```")

    # corpo detalhado: propostas aprovadas (se houver)
    approved = []
    for p in KNOWLEDGE_PATHS:
        for f in run(["git", "ls-files", "--others", "--exclude-standard", p],
                     cwd=root, check=False).splitlines():
            if "approved" in f and f.endswith(".md"):
                approved.append(f)
    if approved:
        body += ["", "## Propostas aprovadas", ""]
        for f in approved:
            body += [f"### {f}", ""]
            try:
                with open(os.path.join(root, f)) as fh:
                    txt = fh.read()
                body.append(txt[:1500])
            except OSError:
                pass

    if args.dry_run:
        print(f"[dry-run] branch: {branch}")
        print(f"[dry-run] title: {title}")
        print(f"[dry-run] {len(delta)} mudanças de conhecimento:")
        for line in delta:
            print(f"  {line}")
        if approved:
            print(f"[dry-run] propostas aprovadas: {approved}")
        print("[dry-run] nada foi criado")
        return 0

    origin = args.repo or run(["git", "config", "--get", "remote.origin.url"], cwd=root)
    # extrai owner/repo de git@github.com:o/r.git ou https://github.com/o/r.git
    origin = origin.replace("git@github.com:", "").replace("https://github.com/", "")
    origin = origin.removesuffix(".git")

    run(["git", "fetch", "origin", "main"], cwd=root)
    run(["git", "checkout", "-b", branch, "origin/main"], cwd=root)
    for p in KNOWLEDGE_PATHS:
        run(["git", "add", p], cwd=root)
    run(["git", "commit", "-m", title, "-m", "P6 do roadmap-hermes: conhecimento aprovado espelhado como PR (merge humano)."], cwd=root)
    run(["git", "push", "-u", "origin", branch], cwd=root)
    pr = run(["gh", "pr", "create", "--repo", origin, "--title", title, "--body", "\n".join(body)])
    print(f"PR aberto: {pr}")
    print(f"branch local: {branch} (volte com: git checkout main)")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as e:
        print(f"erro: {e}", file=sys.stderr)
        sys.exit(1)
