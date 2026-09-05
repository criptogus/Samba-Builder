#!/usr/bin/env python3
"""
Samba Builder — GitHub Governance Adapter

Liga a política declarativa (governance.yaml) ao GitHub: resolve quem é quem,
verifica membership e aplica branch protection. Autoridade = GitHub (Enterprise
+ SSO do cliente atrás). Zero servidor próprio.

Auth: usa `gh` CLI autenticado (mesma conta do app via device flow) ou
GITHUB_TOKEN env. No produto, o adapter roda no main process do Electron com o
githubAccessToken dos settings — esta CLI é o espelho de desenvolvimento/teste.

Convenção no governance.yaml (roles):
    owner:    [user:octocat, team:minha-org/squad-negocio]
    tech:     [team:minha-org/samba-tech-approvers]
    reviewer: [user:qa-user]
Usuário resolve para papel se for `user:` igual ao login OU membro de `team:`.

Uso:
    python3 github_adapter.py whoami
    python3 github_adapter.py resolve --policy /caminho/governance.yaml
    python3 github_adapter.py check-role --policy ... --user octocat --role tech
    python3 github_adapter.py protect criptogus/Samba-Builder            # dry-run (mostra plano)
    python3 github_adapter.py protect criptogus/Samba-Builder --apply    # aplica branch protection
"""
import argparse
import json
import re
import subprocess
import sys
from typing import List, Optional


def gh(args: List[str], expect_json: bool = True) -> dict:
    """Chama gh api. Falha alto se a API retornar erro."""
    cmd = ["gh", "api", *args]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except FileNotFoundError:
        print("ERRO: gh CLI não encontrado (autentique com `gh auth login`).", file=sys.stderr)
        sys.exit(2)
    if out.returncode != 0:
        print(f"ERRO gh api: {out.stderr.strip()[:300]}", file=sys.stderr)
        sys.exit(1)
    return json.loads(out.stdout) if expect_json else {"raw": out.stdout}


def parse_policy_roles(path: str) -> dict:
    roles: dict = {}
    current: Optional[str] = None
    with open(path) as f:
        for raw in f:
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if stripped == "roles:":
                continue
            m = re.match(r"^\s{2}(owner|tech|reviewer|admin):\s*(\[.*\])?\s*(?:#.*)?$", raw)
            if m:
                current = m.group(1)
                roles.setdefault(current, [])
                inline = m.group(2)
                if inline:
                    items = [x.strip().strip("'\"") for x in inline.strip("[]").split(",") if x.strip()]
                    roles[current].extend(items)
                continue
            if current and re.match(r"^\s{4}-\s+", raw):
                roles[current].append(stripped[2:].strip())
    return roles


def user_teams(login: str) -> List[str]:
    """Teams do usuário nos orgs visíveis (org/team). Pode exigir escopo; best-effort."""
    teams = []
    try:
        data = gh(["user/teams", "--paginate"])
        if isinstance(data, list):
            teams = [f"{t.get('organization', {}).get('login')}/{t.get('slug')}" for t in data]
    except SystemExit:
        pass
    return teams


def matches(entry: str, login: str, teams: List[str]) -> bool:
    if entry.startswith("user:"):
        return entry.split(":", 1)[1].strip().lower() == login.lower()
    if entry.startswith("team:"):
        return entry.split(":", 1)[1].strip().lower() in {t.lower() for t in teams}
    # entrada crua: trata como login GitHub
    return entry.strip().lower() == login.lower()


def main() -> int:
    ap = argparse.ArgumentParser(description="GitHub governance adapter")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("whoami")

    p_resolve = sub.add_parser("resolve")
    p_resolve.add_argument("--policy", required=True)

    p_check = sub.add_parser("check-role")
    p_check.add_argument("--policy", required=True)
    p_check.add_argument("--user", required=True)
    p_check.add_argument("--role", required=True, choices=["owner", "tech", "reviewer", "admin"])

    p_protect = sub.add_parser("protect")
    p_protect.add_argument("repo", help="owner/repo")
    p_protect.add_argument("--apply", action="store_true", help="aplica (default: dry-run)")
    p_protect.add_argument("--branch", default="main")

    args = ap.parse_args()

    if args.cmd == "whoami":
        me = gh(["user"])
        print(f"logado como: {me.get('login')} ({me.get('name', '')})")
        return 0

    if args.cmd == "resolve":
        roles = parse_policy_roles(args.policy)
        print("Papéis da política:")
        for role, entries in roles.items():
            print(f"  {role}: {', '.join(entries) if entries else '(vazio)'}")
        return 0

    if args.cmd == "check-role":
        roles = parse_policy_roles(args.policy)
        entries = roles.get(args.role, [])
        if not entries:
            print(f"'{args.user}' NÃO tem papel {args.role} (política sem entradas para o papel).")
            return 1
        teams = user_teams(args.user)
        ok = any(matches(e, args.user, teams) for e in entries)
        print(f"{'OK' if ok else 'NÃO autorizado'}: '{args.user}' papel {args.role} "
              f"(membro de {len(teams)} teams no GitHub)")
        return 0 if ok else 1

    if args.cmd == "protect":
        protection = {
            "required_status_checks": None,
            "enforce_admins": True,
            "required_pull_request_reviews": {
                "required_approving_review_count": 1,
                "dismiss_stale_reviews": True,
                "require_code_owner_reviews": True,
            },
            "restrictions": None,
            "allow_force_pushes": False,
            "allow_deletions": False,
        }
        url = f"repos/{args.repo}/branches/{args.branch}/protection"
        if args.apply:
            gh(["-X", "PUT", url, "-f", f"body={json.dumps(protection)}"])
            print(f"Branch protection aplicada em {args.repo}:{args.branch} "
                  f"(review obrigatório, CODEOWNERS, sem force push).")
        else:
            print(f"[dry-run] Branch protection que seria aplicada em {args.repo}:{args.branch}:")
            print(json.dumps(protection, indent=2))
            print("Rode com --apply para aplicar. Exige permissão de admin no repo.")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
