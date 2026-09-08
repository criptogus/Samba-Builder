#!/usr/bin/env python3
"""
Samba Builder — Autopilot: Health Check (P5.1)

Verifica a saúde de um projeto/app gerado pelo Samba Builder, sem rede.
Checks locais, determinísticos:
    (a) git: o diretório é um repo e a working tree está limpa?
    (b) arquivos principais: package.json e src/ existem?
    (c) dependências: node_modules presente (quando package.json pede deps)?
    (d) memória do projeto: docs/PROJECT_MEMORY.md existe (P1)?

Saída: um relatório por seção com veredito [ok|alerta|erro].
Exit code: 0 = ok (sem alerta/erro) | 1 = alertas | 2 = erros.

Uso:
    python3 health.py ~/samba-apps/busy-sloth-snap
    python3 health.py .            # app no diretório atual
"""
import os
import subprocess
import sys
from typing import Optional

DEFAULT = None  # o diretório do app é obrigatório como 1º argumento


def _v(message: str) -> str:
    """Filtra vars de ambiente de caminhos/secrets para não vazar nada."""
    for k in ("HOME", "USER", "PATH"):
        val = os.environ.get(k)
        if val:
            message = message.replace(val, "${%s}" % k)
    return message


def _run_git_porcelain(app_dir: str) -> Optional[str]:
    """Rodapé do git. Roda apenas com a variável de ambiente bloqueando rede."""
    env = dict(os.environ)
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_CONFIG_NOSYSTEM"] = "1"
    try:
        proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=app_dir,
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
        )
        if proc.returncode != 0:
            return None  # não é repo git
        return proc.stdout.strip()
    except Exception:
        return None


def check_git(app_dir: str):
    if not os.path.isdir(os.path.join(app_dir, ".git")):
        return "ok", "sem repo git (não versionado)"
    out = _run_git_porcelain(app_dir)
    if out is None:
        return "alerta", "repo git presente, mas `git status` falhou (não é repo?)"
    if not out:
        return "ok", "working tree limpa"
    n = len([l for l in out.splitlines() if l.strip()])
    preview = " | ".join(l[:60] for l in out.splitlines()[:3])
    return "alerta", f"{n} arquivo(s) fora do commit (working tree suja): {preview}"


def check_main_files(app_dir: str):
    problems = []
    pkg = os.path.join(app_dir, "package.json")
    src = os.path.join(app_dir, "src")
    if not os.path.isfile(pkg):
        problems.append("package.json ausente")
    if not os.path.isdir(src):
        problems.append("src/ ausente")
    if problems:
        return "erro", "; ".join(problems)
    return "ok", "package.json e src/ presentes"


def check_deps(app_dir: str):
    pkg = os.path.join(app_dir, "package.json")
    nm = os.path.join(app_dir, "node_modules")
    if not os.path.isfile(pkg):
        return "ok", "sem package.json — nada a verificar"
    has_deps = False
    try:
        with open(pkg) as f:
            import json
            data = json.load(f)
            has_deps = bool(
                data.get("dependencies") or data.get("devDependencies")
            )
    except Exception:
        has_deps = True  # não leu: assume que pode haver deps
    if not has_deps:
        return "ok", "package.json sem dependências declaradas"
    if os.path.isdir(nm) and any(os.scandir(nm)):
        return "ok", "node_modules presente (deps instaladas)"
    return "alerta", "node_modules ausente — rode `npm install`/`pnpm install`"


def check_project_memory(app_dir: str):
    pm = os.path.join(app_dir, "docs", "PROJECT_MEMORY.md")
    if os.path.isfile(pm):
        return "ok", "docs/PROJECT_MEMORY.md presente (P1)"
    return "alerta", "docs/PROJECT_MEMORY.md ausente — memória do projeto não iniciada (P1)"


def main() -> int:
    if len(sys.argv) < 2:
        print("uso: python3 health.py <diretorio-do-app>")
        return 2
    app_dir = os.path.abspath(os.path.expanduser(sys.argv[1]))
    if not os.path.isdir(app_dir):
        print(f"erro: diretório não encontrado: {app_dir}")
        return 2

    checks = [
        ("git", check_git),
        ("arquivos principais", check_main_files),
        ("dependencias", check_deps),
        ("memoria do projeto", check_project_memory),
    ]

    print(f"Samba Builder — Health Check")
    print(f"App: {_v(app_dir)}")
    print(f"{'=' * 56}")

    verdicts = []
    for label, fn in checks:
        verdict, detail = fn(app_dir)
        verdicts.append(verdict)
        mark = {"ok": "  ok ", "alerta": "alerta", "erro": " erro "}[verdict]
        print(f"[{mark}] {label:<18} {_v(detail)}")

    print("=" * 56)
    if "erro" in verdicts:
        overall, code = "erros presentes", 2
    elif "alerta" in verdicts:
        overall, code = "ok, com alertas", 1
    else:
        overall, code = "ok", 0
    print(f"Resultado: {overall} (exit {code})")
    return code


if __name__ == "__main__":
    sys.exit(main())
