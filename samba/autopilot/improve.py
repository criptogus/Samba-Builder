#!/usr/bin/env python3
"""
Samba Builder — Autopilot: Auto-evolution Analyzer (P3.2)

Lê os JSONL de feedback (sessões de telemetria em samba/autopilot/feedback/
e, se existir, samba/skills/feedback/), agrupa por padrão e gera PROPOSTAS de
melhoria com evidência. Determinístico, sem LLM, sem rede. A proposta NUNCA é
aplicada sozinha — passa pela governança (humano decide).

Padrão = scope + mensagem normalizada. Evidência por padrão:
    frequência (n ocorrências em d dias), último timestamp, exemplo sanitizado.

Saída: samba/autopilot/proposals/<YYYY-MM-DD>.md  (uma seção por proposta)
Sem feedback => imprime 'sem dados — rode telemetry.py primeiro' e exit 0.

Uso:
    python3 improve.py                    # varre autopilot/feedback + skills/feedback
    python3 improve.py --min-freq 3       # só padrões com >= 3 ocorrências
    python3 improve.py --since 2026-09-01 # ignora feedbacks anteriores
    python3 improve.py --dry-run          # imprime sem escrever o arquivo
"""
import argparse
import glob
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime
from typing import Dict, List

HERE = os.path.dirname(os.path.abspath(__file__))
FEEDBACK_DIR = os.path.join(HERE, "feedback")
SKILLS_FEEDBACK = os.path.abspath(os.path.join(HERE, "..", "skills", "feedback"))
PROPOSALS_DIR = os.path.join(HERE, "proposals")

# Caminho relativo do gate de governança (a partir do autopilot/).
GATE = os.path.join("samba", "governance", "gate.py")

# Segredos/tokens para redigir o exemplo sanitizado.
SECRET_RE = re.compile(
    r"(?i)\b(api[_-]?key|token|secret|password|authorization"
    r"|bearer\s+|sk-[A-Za-z0-9][A-Za-z0-9_-]{5,}|[A-Za-z0-9]{32,})\b"
)


def _redact(text: str) -> str:
    text = SECRET_RE.sub("[REDACTED]", text or "")
    for k in ("HOME", "USER"):
        val = os.environ.get(k)
        if val:
            text = text.replace(val, "${%s}" % k)
    return text.strip()


def _norm(msg: str) -> str:
    """Normaliza mensagem para agrupar variações do mesmo erro."""
    if not msg:
        return ""
    m = _redact(msg)
    m = re.sub(r"timestamp[:=]\s*[\d-]+", "timestamp", m, flags=re.I)
    m = re.sub(r"\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\b", "<ts>", m)
    m = re.sub(r"[\"']", "", m)
    m = re.sub(r"\s+", " ", m).strip().lower().rstrip(". ")
    return m[:200]


def load_telemetry(path):
    """Converte uma linha de telemetria em um padrão consumível."""
    rec = {}
    try:
        rec = json.loads(path)
    except json.JSONDecodeError:
        return None
    if not isinstance(rec, dict):
        return None
    if "level" not in rec and "scope" not in rec and "message" not in rec:
        # não é telemetria (formato session-*.jsonl)
        return None
    return rec


def load_skill_feedback(path):
    """Adapta um feedback de dev (skills/feedback) ao mesmo formato de padrão."""
    rec = {}
    try:
        rec = json.loads(path)
    except json.JSONDecodeError:
        return None
    if not isinstance(rec, dict):
        return None
    skill = rec.get("skill") or "geral"
    sent = (rec.get("sentimento") or "").lower()
    msg = (rec.get("o_que_aconteceu") or rec.get("esperado") or "").strip()
    if not msg:
        return None
    level = "error" if sent == "negativo" else "warn"
    return {
        "ts": rec.get("ts", ""),
        "level": level,
        "scope": f"skill:{skill}",
        "message": msg,
        "count": 1,
        "_src": "dev",
    }


def load_all_feedbacks(since: str = None) -> List[dict]:
    items = []
    for base, loader in ((FEEDBACK_DIR, load_telemetry),
                         (SKILLS_FEEDBACK, load_skill_feedback)):
        if not os.path.isdir(base):
            continue
        for fp in sorted(glob.glob(os.path.join(base, "*.jsonl"))):
            with open(fp, encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    rec = loader(line)
                    if rec is None:
                        continue
                    if since and (rec.get("ts") or "")[:10] < since:
                        continue
                    items.append(rec)
    return items


def suggest_fix(scope: str, msg: str) -> str:
    low = msg.lower()
    if any(k in low for k in ("db", "database", "sqlite", "migration")):
        return ("Verificar falhas de banco/migração na inicialização; adicionar "
                "retry/guarda de migração e capturar o erro como DyadError.")
    if any(k in low for k in ("e2e", "test", "vitest", "playwright")):
        return "Investigar flakiness de teste citado; fixar fixture/asserção e rodar o suíte isolada antes de promover."
    if any(k in low for k in ("process", "exit", "quit", "crash", "unexpectedly")):
        return "Investigar término inesperado de processo; adicionar watchdog/graceful shutdown e log de causa raiz."
    if scope.startswith("skill:"):
        return "Editar o skill nativo citado (pitfall/checklist) com base no relato; validar com o eval do skill."
    if "chat" in scope or "conversation" in scope or "llm" in scope or "provider" in scope:
        return "Auditar fluxo de chat/provedor: timeout/retry, tratamento de erro de API e categorização como DyadErrorKind."
    if any(k in low for k in ("timeout", "timed out", "socket", "network", "fetch")):
        return "Rever timeouts/reconexão de rede; falhar com DyadError e mensagem clara ao usuário."
    return ("Revisar a origem do erro no scope '%s'; adicionar tratamento específico "
            "e capturar como DyadErrorKind (se ainda não for) ou ajustar o fluxo." % scope)


def main() -> int:
    ap = argparse.ArgumentParser(description="Auto-evolution analyzer (P3.2)")
    ap.add_argument("--min-freq", type=int, default=1,
                    help="mínimo de ocorrências por padrão para virar proposta")
    ap.add_argument("--since", default=None, help="YYYY-MM-DD: ignora feedbacks anteriores")
    ap.add_argument("--dry-run", action="store_true", help="imprime sem escrever arquivo")
    args = ap.parse_args()

    feedbacks = load_all_feedbacks(args.since)
    if not feedbacks:
        print("sem dados — rode telemetry.py primeiro")
        return 0

    # Agrupa por padrão: (scope, mensagem normalizada)
    groups: Dict[tuple, dict] = {}
    for fb in feedbacks:
        scope = (fb.get("scope") or "").strip() or "main"
        norm = _norm(fb.get("message") or "")
        if not norm:
            continue
        key = (scope, norm)
        g = groups.setdefault(key, {
            "scope": scope, "norm": norm, "count": 0,
            "ts_min": None, "ts_max": None, "example": "", "level": fb.get("level", "warn"),
        })
        c = int(fb.get("count", 1) or 1)
        g["count"] += c
        ts = fb.get("ts") or ""
        g["ts_max"] = max(g["ts_max"] or "", ts)
        g["ts_min"] = min(g["ts_min"] or ts, ts) if g["ts_min"] else ts
        g["example"] = fb.get("message") or g["example"]
        if fb.get("level") == "error":
            g["level"] = "error"

    proposals = []
    for key in sorted(groups, key=lambda k: -groups[k]["count"]):
        g = groups[key]
        if g["count"] < args.min_freq:
            continue
        proposals.append(g)

    if not proposals:
        print("sem dados — rode telemetry.py primeiro")
        return 0

    # Janela em dias entre primeiro e último ts
    def _day(ts):
        try:
            return datetime.fromisoformat((ts or "")[:19]).date()
        except Exception:
            return None

    lines = [
        f"# Samba Builder — Propostas de auto-evolução (P3)",
        "",
        f"Gerado: {datetime.now().strftime('%Y-%m-%d %H:%M')} | "
        f"Padrões: {len(proposals)} | Ocorrências: {sum(p['count'] for p in proposals)}",
        "",
        "Cada proposta abaixo é uma HIPÓTESE derivada de telemetria/feedback local. "
        "Nada é aplicado automaticamente: **o humano decide** e a aprovação passa "
        "pelo gate de governança (samba/governance/gate.py).",
        "",
    ]

    for i, p in enumerate(proposals, 1):
        d1, d2 = _day(p["ts_min"]), _day(p["ts_max"])
        dias = 1
        if d1 and d2:
            dias = max(1, (d2 - d1).days + 1)
        lines += [
            f"## {i}. [{p['level'].upper()}] {p['scope']} — {p['norm'][:70]}",
            "",
            f"- **Problema**: padrão recorrente no scope `{p['scope']}`.",
            f"- **Evidência**: {p['count']} ocorrência(s) em {dias} dia(s); "
            f"último em {p['ts_max'] or '?'}.",
            f"- **Exemplo (sanitizado)**: `{_redact(p['example'])[:200]}`",
            f"- **Sugestão de correção**: {suggest_fix(p['scope'], p['norm'])}",
            "",
            f"- **Aprovação (governança — humano decide)** para evoluir o CÓDIGO "
            f"do produto: registre/abra a mudança e submeta ao gate "
            f"`python3 {GATE} init` (se ainda não houver governance.yaml), depois "
            f"`python3 {GATE} submit --by owner@corp` e `python3 {GATE} approve --by tech@corp --role tech`. "
            f"Propostas de skill passam pelo fluxo de evolution (samba/skills/evolution/evolve.py).",
            "",
        ]

    report = "\n".join(lines)
    report += ("---\n## Checklist p/ a próxima rodada\n"
               "- [ ] Revisar cada proposta e decidir aplicar/vetar/arquivar\n"
               "- [ ] Aplicações de código passam pelo gate de governança (P3.3)\n"
               "- [ ] Mover feedback processado para `feedback/processed/`\n")

    if args.dry_run:
        print(report)
        return 0

    os.makedirs(PROPOSALS_DIR, exist_ok=True)
    fname = datetime.now().strftime("%Y-%m-%d")
    fpath = os.path.join(PROPOSALS_DIR, fname + ".md")
    n = 1
    while os.path.exists(fpath):
        fpath = os.path.join(PROPOSALS_DIR, f"%s-%d.md" % (fname, n))
        n += 1
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"Propostas geradas: {fpath}")
    print(f"Padrões: {len(proposals)} | total ocorrências: {sum(p['count'] for p in proposals)}")
    print(f"Aprovação via governança: python3 {GATE} (humano decide).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
