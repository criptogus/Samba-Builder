#!/usr/bin/env python3
"""
Samba Builder — benchmark por cliente (D2 do roadmap-devin).

Registra o resultado de uma tarefa de engenharia executada pelo agente num
cliente. O conjunto de resultados vira o "eval set" do cliente: a métrica é a
taxa de conclusão na PRIMEIRA tentativa — o equivalente medido do fine-tuning
do Devin (que dobrou a conclusão e quadruplicou a velocidade no caso Nubank).

Uso:
  python3 samba/benchmark/record.py --client <nome> --task "<descrição>"
      [--outcome first_try|after_retries|failed] [--attempts N] [--note "..."]
  python3 samba/benchmark/report.py [--client <nome>]   # placar por cliente

Registros em samba/benchmark/<cliente>/results.jsonl — um por tarefa.
"""

import argparse
import datetime
import json
import pathlib
import sys

BENCH_ROOT = pathlib.Path(__file__).resolve().parent


def client_dir(client: str) -> pathlib.Path:
    d = BENCH_ROOT / "clients" / client
    d.mkdir(parents=True, exist_ok=True)
    return d


def main() -> int:
    ap = argparse.ArgumentParser(description="Registra o resultado de uma tarefa de engenharia.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    rec = sub.add_parser("record", help="registra o resultado de uma tarefa")
    rec.add_argument("--client", required=True)
    rec.add_argument("--task", required=True, help="descrição curta da tarefa")
    rec.add_argument("--outcome", choices=["first_try", "after_retries", "failed"], default="first_try")
    rec.add_argument("--attempts", type=int, default=1)
    rec.add_argument("--note", default="")

    rep = sub.add_parser("report", help="placar por cliente (taxa de 1ª tentativa)")
    rep.add_argument("--client", default=None, help="filtra por cliente (default: todos)")

    args = ap.parse_args()

    if args.cmd == "record":
        entry = {
            "ts": datetime.datetime.now().isoformat(timespec="seconds"),
            "task": args.task,
            "outcome": args.outcome,
            "attempts": args.attempts,
            "note": args.note,
        }
        log = client_dir(args.client) / "results.jsonl"
        with open(log, "a") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        print(f"registrado em {log}")
        return 0

    # report
    clients = [args.client] if args.client else [
        d.name for d in (BENCH_ROOT / "clients").iterdir() if d.is_dir()
    ]
    if not clients:
        print("sem dados — rode record.py --client <nome> --task ... primeiro")
        return 0

    for client in clients:
        log = BENCH_ROOT / "clients" / client / "results.jsonl"
        if not log.exists():
            print(f"[{client}] sem registros")
            continue
        rows = [json.loads(l) for l in log.read_text().splitlines() if l.strip()]
        if not rows:
            print(f"[{client}] sem registros")
            continue
        total = len(rows)
        first = sum(1 for r in rows if r["outcome"] == "first_try")
        retries = sum(1 for r in rows if r["outcome"] == "after_retries")
        failed = sum(1 for r in rows if r["outcome"] == "failed")
        rate = first / total * 100
        print(f"[{client}] {total} tarefas | 1ª tentativa: {first} ({rate:.0f}%) | "
              f"com retry: {retries} | falhou: {failed}")
        # últimas 5 para contexto
        for r in rows[-5:]:
            print(f"  · {r['ts'][:10]} {r['outcome']:<12} {r['task'][:70]}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
