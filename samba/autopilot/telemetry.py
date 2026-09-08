#!/usr/bin/env python3
"""
Samba Builder — Autopilot: Session Telemetry local (P3.1)

Extrai erros e avisos do log do app (electron-log) para um arquivo JSONL de
feedback, 100% local. Nada de chat, nada de rede, nada de segredos.

Fontes:
    Padrão: ~/Library/Logs/Samba Builder/main.log  (override com argumento)

Saída:
    samba/autopilot/feedback/session-<timestamp>.jsonl
    cada linha: {"ts": ..., "level": "error|warn", "scope": ..., "message": ...}
    "count" é adicionado quando a MESMA mensagem repetiu em <5s (dedupe).

Filtros:
    - Só linhas [warn] e [error] (log 'scoped'). Nada de [info]/[debug].
    - Ruído de terceiros descartado (vite, React Router, browserslist,
      console.warn) e conteúdo de chat/assistant nunca é lido do log.
    - Redação de segredos por regex antes de gravar.

Uso:
    python3 telemetry.py                          # caminho padrão
    python3 telemetry.py /caminho/para/main.log   # outro log
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime

DEFAULT_LOG = "~/Library/Logs/Samba Builder/main.log"

HERE = os.path.dirname(os.path.abspath(__file__))
FEEDBACK_DIR = os.path.join(HERE, "feedback")

# Início de um registro electron-log: [2026-09-06 22:19:27.177] [warn]  (scope) msg
RECORD_RE = re.compile(
    r"^\s*\[(?P<ts>\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})"
    r"(?:\.\d+)?\]\s*\[(?P<level>error|warn|info|debug)\]\s*"
    r"(?:\((?P<scope>[^)]*)\))?\s*(?P<msg>.*)$",
    re.IGNORECASE,
)

# Ruído de terceiros: linhas de erro que não refletem bug do Samba.
NOISE = ("vite", "react router", "browserslist", "console.warn")

# Padrões de segredo/token para redigir (nunca gravar credencial).
SECRET_RE = re.compile(
    r"(?i)\b(api[_-]?key|token|secret|password|authorization"
    r"|bearer\s+|sk-[A-Za-z0-9][A-Za-z0-9_-]{5,}|[A-Za-z0-9]{32,})\b"
)


def _ts_iso(raw: str) -> str:
    """Normaliza o ts do log para ISO: '2026-09-06T22:19:27'."""
    raw = raw.strip()
    return raw[:10] + "T" + raw[11:19] if len(raw) >= 19 else raw


def _epoch(raw: str) -> float:
    """Converte ts do log para segundos desde epoch (para a janela de dedupe)."""
    iso = _ts_iso(raw)
    try:
        return datetime.fromisoformat(iso).timestamp()
    except Exception:
        return 0.0


def _redact(text: str) -> str:
    text = SECRET_RE.sub("[REDACTED]", text)
    for k in ("HOME", "USER"):
        val = os.environ.get(k)
        if val:
            text = text.replace(val, "${%s}" % k)
    return text.strip()


def _is_noise(level: str, scope: str, msg: str) -> bool:
    if level.lower() != "warn" and level.lower() != "error":
        return True
    low = (msg or "").lower()
    return any(tok in low for tok in NOISE)


def parse_log(path: str):
    """Percorre o log e devolve (warn|error) como dicts crus, deduplicados."""
    records = []
    pending = None  # registro warn/error aberto aguardando linhas de continuação
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = RECORD_RE.match(line)
            if m:
                # fecha registro anterior
                if pending:
                    records.append(pending)
                level = m.group("level").lower()
                if level in ("warn", "error"):
                    pending = {
                        "ts": m.group("ts"),
                        "level": level,
                        "scope": (m.group("scope") or "").strip(),
                        "msg": _redact(m.group("msg")),
                    }
                else:
                    pending = None
                continue
            # continuação (JSON/stack/payload) pertence ao registro aberto
            if pending is not None:
                extra = _redact(line)
                if extra:
                    sep = "" if not pending["msg"] else (
                        " " if not pending["msg"].endswith(("{", "[", "}")) else ""
                    )
                    pending["msg"] = pending["msg"] + sep + extra
    if pending:
        records.append(pending)
    return records


def dedupe(records, window_s: float = 5.0):
    """Mesma mensagem normalizada dentro de <window_s => 1 ocorrência + count."""
    result = []
    by_norm = {}
    for r in records:
        if _is_noise(r["level"], r["scope"], r["msg"]):
            continue
        norm = re.sub(r"\s+", " ", (r["msg"] or "").lower()).strip()
        if not norm:
            continue
        ep = _epoch(r["ts"])
        prev = by_norm.get(norm)
        if prev is not None and (ep - prev["_epoch"]) < window_s:
            prev["count"] += 1
            prev["_last"] = max(prev.get("_last", 0), ep)
            # mantém o primeiro ts; atualiza msg p/ a versão mais recente
            prev["msg"] = r["msg"]
            prev["scope"] = r["scope"] or prev["scope"]
            continue
        by_norm[norm] = dict(r, count=1, _epoch=ep, _last=ep)
    for r in by_norm.values():
        r.pop("_epoch", None)
        r.pop("_last", None)
        result.append(r)
    return sorted(result, key=lambda x: x["ts"])


def main() -> int:
    ap = argparse.ArgumentParser(description="Session telemetry local (P3.1)")
    ap.add_argument("log", nargs="?", default=os.path.expanduser(DEFAULT_LOG),
                    help="caminho do main.log (padrão: %s)" % DEFAULT_LOG)
    ap.add_argument("--out-dir", default=FEEDBACK_DIR,
                    help="diretório dos JSONL de feedback")
    args = ap.parse_args()

    if not os.path.isfile(args.log):
        print(f"erro: log não encontrado: {args.log}", file=sys.stderr)
        return 1

    raw = parse_log(args.log)
    events = dedupe(raw)

    os.makedirs(args.out_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = os.path.join(args.out_dir, f"session-{stamp}.jsonl")

    with open(out_path, "w", encoding="utf-8") as f:
        for e in events:
            record = {
                "ts": _ts_iso(e["ts"]),
                "level": e["level"],
                "scope": e["scope"] or "main",
                "message": e["msg"],
            }
            if e.get("count", 1) > 1:
                record["count"] = e["count"]
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    n_err = sum(1 for e in events if e["level"] == "error")
    n_warn = sum(1 for e in events if e["level"] == "warn")
    print(f"Log lido: {args.log}")
    print(f"Eventos: {len(events)} (erros={n_err}, avisos={n_warn})")
    print(f"Feedback gravado: {out_path}")
    if not events:
        print("Nenhum erro/aviso relevante nesta sessão (ou só ruído filtrado).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
