#!/usr/bin/env python3
"""
Samba Builder — Governance Gate (v1)

Gerencia o ciclo negócio↔tecnologia de um projeto e valida gates antes de ações
sensíveis. Trilha de auditoria em `.samba/audit/*.jsonl` (append-only, hash
encadeado). Política em `governance.yaml` na raiz do projeto.

Estados: draft → in_review → approved | (veto → draft) → staging → production

Uso (na raiz do projeto):
    python3 gate.py init --owner "ana@corp"                 # cria governance.yaml + .samba/
    python3 gate.py status                                   # estado atual + gates
    python3 gate.py submit --by owner@corp                   # negócio: draft -> in_review
    python3 gate.py approve --by tech@corp --role tech       # ok da tecnologia
    python3 gate.py veto --by qa@corp --role reviewer        # bloqueia
    python3 gate.py check --action deploy_production         # gate p/ produção
    python3 gate.py approve --by tech@corp --role tech --self-ok   # 2º par (tech aprovando o próprio trabalho)

Regras v1 (espelho do MODELO.md):
- submit: só owner (negócio)
- approve: só tech (aprovador técnico); aprovação do próprio trabalho exige 2º aprovador
- veto: tech ou reviewer; volta para draft
- deploy_production: exige approved, sem veto ativo, e approval de tech na trilha
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import Optional

GOV_FILE = "governance.yaml"
AUDIT_DIR = ".samba/audit"
STATE_FILE = ".samba/state.json"

DEFAULT_POLICY = """\
# Governança do projeto — Samba Builder (schema: samba/governance/policy.schema.yaml)
# mode: single = um dev faz tudo (sem gates) | governed = papéis + aprovações
project: {name}
mode: {mode}
roles:
  owner: []        # usuários/teams da área de negócio (ex: user:ana, team:org/squad)
  tech: []         # tech leads / aprovadores técnicos
  reviewer: []     # QA/segurança (podem vetar)
  admin: []        # plataforma (política/auditoria)
gates:
  deploy_production: [approved]
"""


def load_mode(root: str) -> str:
    """single (sem arquivo ou mode: single) | governed (arquivo com mode governed/default)."""
    path = os.path.join(root, GOV_FILE)
    if not os.path.exists(path):
        return "single"
    with open(path) as f:
        for raw in f:
            m = re.match(r"^\s*mode:\s*(single|governed)\s*(?:#.*)?$", raw.strip())
            if m:
                return m.group(1)
    return "governed"  # arquivo existe sem mode explícito → conservador

# Mapa: papel -> emails (da política). Resolução real (GitHub teams) = adapter futuro.
def load_policy(root: str) -> dict:
    """Parseia a seção `roles:` do governance.yaml (inline `[a, b]` ou itemizada `- a`)."""
    path = os.path.join(root, GOV_FILE)
    if not os.path.exists(path):
        return {}
    roles: dict = {}
    in_roles = False
    current: Optional[str] = None
    with open(path) as f:
        for raw in f:
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if stripped == "roles:":
                in_roles = True
                continue
            if in_roles and not raw.startswith(" "):
                in_roles = False  # saiu da seção roles (nova chave top-level)
                continue
            if in_roles:
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
                    roles[current].append(stripped[2:].strip().strip("'\""))
    return roles


def load_state(root: str) -> dict:
    p = os.path.join(root, STATE_FILE)
    if not os.path.exists(p):
        return {"state": "draft", "vetos": []}
    with open(p) as f:
        return json.load(f)


def save_state(root: str, state: dict) -> None:
    os.makedirs(os.path.join(root, ".samba"), exist_ok=True)
    with open(os.path.join(root, STATE_FILE), "w") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def append_audit(root: str, entry: dict) -> None:
    audit_dir = os.path.join(root, ".samba", "audit")
    audit_log = os.path.join(audit_dir, "audit.jsonl")
    os.makedirs(audit_dir, exist_ok=True)
    prev = "GENESIS"
    if os.path.exists(audit_log):
        with open(audit_log, "rb") as f:
            for line in f:
                if line.strip():
                    prev = line.decode().strip()
    prev_hash = hashlib.sha256(prev.encode()).hexdigest()
    entry["prev_hash"] = prev_hash
    entry["ts"] = datetime.now(timezone.utc).isoformat()
    with open(audit_log, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def is_allowed(roles: dict, role: str, by: str) -> bool:
    return by in roles.get(role, [])


def main() -> int:
    ap = argparse.ArgumentParser(description="Samba Builder governance gate")
    ap.add_argument("cmd", choices=["init", "status", "submit", "approve", "veto", "check", "audit"])
    ap.add_argument("--root", default=".", help="raiz do projeto")
    ap.add_argument("--by", default="", help="quem executa (email/usuário)")
    ap.add_argument("--role", default="", help="papel declarado (owner/tech/reviewer/admin)")
    ap.add_argument("--action", default="", help="ação para check")
    ap.add_argument("--out", default="", help="arquivo de saída (audit)")
    ap.add_argument("--name", default="meu-projeto", help="nome do projeto (init)")
    ap.add_argument("--self-ok", action="store_true", help="2º aprovador presente (tech aprovando trabalho próprio)")
    ap.add_argument("--force", action="store_true", help="init sobrescreve política existente")
    ap.add_argument("--mode", choices=["single", "governed"], default="governed", help="modo do projeto (init)")
    args = ap.parse_args()

    root = os.path.abspath(args.root)

    if args.cmd == "init":
        if os.path.exists(os.path.join(root, GOV_FILE)) and not args.force:
            print("governance.yaml já existe (use --force para sobrescrever)")
            return 1
        os.makedirs(root, exist_ok=True)
        with open(os.path.join(root, GOV_FILE), "w") as f:
            f.write(DEFAULT_POLICY.format(name=args.name, mode=args.mode))
        save_state(root, {"state": "draft", "vetos": []})
        append_audit(root, {"event": "init", "by": args.by or "system", "project": args.name, "mode": args.mode})
        print(f"Governança inicializada em {root} — modo: {args.mode} ({'sem gates' if args.mode == 'single' else 'com ciclo de aprovação'})")
        return 0

    roles = load_policy(root)
    state = load_state(root)
    cur = state["state"]
    mode = load_mode(root)

    if args.cmd == "status":
        print(f"modo: {mode}")
        print(f"estado: {cur}")
        print(f"vetos ativos: {len(state.get('vetos', []))}")
        ok = is_allowed(roles, "tech", args.by) if args.by else False
        print(f"papéis na política: owner={roles.get('owner', [])} tech={roles.get('tech', [])} "
              f"reviewer={roles.get('reviewer', [])} admin={roles.get('admin', [])}")
        print(f"gates: deploy_production exige approved (sem veto ativo)" if mode == "governed"
              else "gates: nenhum (modo single — dev é o dono)")
        return 0

    if args.cmd == "submit":
        if mode == "single":
            print("Modo single: não há ciclo de aprovação — o dev é o dono do começo ao fim.")
            return 0
        if not is_allowed(roles, "owner", args.by):
            print(f"BLOQUEADO: submit exige papel owner (negócio). '{args.by}' não está em owner.")
            return 1
        if cur != "draft":
            print(f"BLOQUEADO: submit só a partir de draft (estado atual: {cur}).")
            return 1
        state["state"] = "in_review"
        save_state(root, state)
        append_audit(root, {"event": "submit", "by": args.by, "from": "draft", "to": "in_review"})
        print("Projeto submetido para aprovação (in_review) — aguardando ok da tecnologia.")
        return 0

    if args.cmd == "approve":
        if mode == "single":
            print("Modo single: sem ciclo de aprovação — nada a aprovar.")
            return 0
        if not is_allowed(roles, "tech", args.by):
            print(f"BLOQUEADO: approve exige papel tech. '{args.by}' não está em tech.")
            return 1
        if cur != "in_review":
            print(f"BLOQUEADO: approve só em in_review (estado atual: {cur}).")
            return 1
        if state.get("vetos"):
            print("BLOQUEADO: há veto ativo — resolva antes de aprovar.")
            return 1
        # Aprovação do próprio trabalho exige 2º par (approval anterior de outro tech)
        approvers = [e["by"] for e in _audit_events(root) if e.get("event") == "approve"]
        if args.by in approvers and not args.self_ok:
            print("BLOQUEADO: tech aprovando trabalho que já aprovou — exige 2º aprovador (--self-ok).")
            return 1
        state["state"] = "approved"
        save_state(root, state)
        append_audit(root, {"event": "approve", "by": args.by, "role": "tech"})
        print("OK da tecnologia registrado — estado: approved.")
        return 0

    if args.cmd == "veto":
        if mode == "single":
            print("Modo single: sem ciclo de aprovação — nada a vetar.")
            return 0
        if not (is_allowed(roles, "tech", args.by) or is_allowed(roles, "reviewer", args.by)):
            print(f"BLOQUEADO: veto exige tech ou reviewer. '{args.by}' sem papel.")
            return 1
        if cur not in ("in_review", "approved"):
            print(f"BLOQUEADO: veto só em in_review/approved (estado atual: {cur}).")
            return 1
        state.setdefault("vetos", []).append({"by": args.by, "ts": datetime.now(timezone.utc).isoformat()})
        state["state"] = "draft"
        save_state(root, state)
        append_audit(root, {"event": "veto", "by": args.by, "to": "draft"})
        print("Veto registrado — projeto voltou para draft.")
        return 0

    if args.cmd == "check":
        if args.action == "deploy_production":
            if mode == "single":
                print("GATE OK: modo single — sem gates, deploy liberado para o dev.")
                return 0
            if cur != "approved":
                print(f"GATE FALHOU: deploy_production exige estado approved (atual: {cur}).")
                return 1
            if state.get("vetos"):
                print("GATE FALHOU: veto ativo.")
                return 1
            events = _audit_events(root)
            if not any(e.get("event") == "approve" for e in events):
                print("GATE FALHOU: sem ok da tecnologia na trilha.")
                return 1
            print("GATE OK: deploy_production liberado (approved + ok tech na trilha).")
            return 0
        print(f"check: ação '{args.action}' sem gate definido — política atual só cobre deploy_production.")
        return 0

    if args.cmd == "audit":
        # Exporta a trilha e verifica a integridade da cadeia de hashes (append-only).
        log = os.path.join(root, AUDIT_DIR, "audit.jsonl")
        if not os.path.exists(log):
            print("Sem trilha de auditoria ainda (nenhum evento).")
            return 0
        events = []
        broken = []
        prev_line = "GENESIS"
        with open(log, encoding="utf-8") as f:
            for i, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                except json.JSONDecodeError:
                    broken.append((i, "json inválido"))
                    continue
                expected = hashlib.sha256(prev_line.encode()).hexdigest()
                if e.get("prev_hash") != expected:
                    broken.append((i, f"hash quebrado (esperado {expected[:12]}…)"))
                prev_line = line
                events.append(e)
        print(f"Eventos na trilha: {len(events)} | cadeia: {'ÍNTEGRA' if not broken else 'QUEBRADA'}")
        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                for e in events:
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
            print(f"Exportado para: {args.out}")
        else:
            for e in events:
                print(f"  {e.get('ts', '?')[:19]}  {e.get('event'):8s}  by={e.get('by')}  mode={e.get('mode', '-')}")
        if broken:
            for i, why in broken:
                print(f"  AVISO linha {i}: {why}")
            return 1
        return 0

    return 0


def _audit_events(root: str) -> list:
    p = os.path.join(root, AUDIT_DIR, "audit.jsonl")
    if not os.path.exists(p):
        return []
    events = []
    with open(p) as f:
        for line in f:
            if line.strip():
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return events


if __name__ == "__main__":
    sys.exit(main())
