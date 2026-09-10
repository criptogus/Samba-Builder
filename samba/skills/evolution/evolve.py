#!/usr/bin/env python3
"""
Samba Builder — Skill Evolution (loop de feedback dos devs)

Agrega feedbacks dos devs (samba/skills/feedback/*.jsonl) e gera PROPOSTAS de
mudança nos skills nativos. Nunca altera um skill diretamente: proposta →
aprovação humana → aplicação manual ou por patch.

Formato do feedback (JSONL, um objeto por linha):
    {"ts": "2026-09-05T10:00", "dev": "ana", "projeto": "landing-cliente-x",
     "skill": "design-taste-frontend", "sentimento": "negativo",
     "o_que_aconteceu": "...", "esperado": "...", "sugestao": "..."}

Uso:
    python3 evolve.py                      # agrega e gera propostas (--dry-run default? não: escreve proposals/)
    python3 evolve.py --dry-run            # mostra o relatório sem escrever
    python3 evolve.py --min-freq 2         # só temas com >= N feedbacks
    python3 evolve.py --since 2026-09-01   # só feedbacks recentes
"""
import argparse
import glob
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
SKILLS_ROOT = os.path.abspath(os.path.join(HERE, ".."))
FEEDBACK_DIR = os.path.join(SKILLS_ROOT, "feedback")
PROPOSALS_DIR = os.path.join(HERE, "proposals")


def load_feedback(limit: Optional[str] = None) -> List[dict]:
    items = []
    for path in sorted(glob.glob(os.path.join(FEEDBACK_DIR, "*.jsonl"))):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    fb = json.loads(line)
                except json.JSONDecodeError:
                    print(f"aviso: linha inválida em {path}: {line[:80]}", file=sys.stderr)
                    continue
                if limit and fb.get("ts", "")[:10] < limit:
                    continue
                items.append(fb)
    return items


def suggest_fix(fb: dict) -> str:
    """Sugestão de mudança crua por tipo de feedback (heurística v1)."""
    sent = fb.get("sentimento", "")
    skill = fb.get("skill", "?")
    ocorreu = (fb.get("o_que_aconteceu") or "").lower()
    if "design" in skill or any(k in ocorreu for k in ("feio", "genérico", "template", "slop")):
        return f"[{skill}] Reforçar regras de intenção de design: adicionar exemplo anti-padrão do caso ('{ocorreu[:100]}') e checklist de verificação."
    if any(k in ocorreu for k in ("quebrou", "erro", "crash", "não roda", "bug")):
        return f"[{skill}] Adicionar pitfall/verificação: cobrir o caso '{ocorreu[:100]}' como passo de teste obrigatório."
    if sent == "positivo":
        return f"[{skill}] Consolidar como padrão/referência o que funcionou: '{ocorreu[:100]}'."
    return f"[{skill}] Revisar instrução a partir do relato: '{ocorreu[:100]}'."


def main() -> int:
    ap = argparse.ArgumentParser(description="Skill evolution — feedback dos devs")
    ap.add_argument("--dry-run", action="store_true", help="mostra relatório sem escrever")
    ap.add_argument("--min-freq", type=int, default=1, help="mínimo de feedbacks por tema")
    ap.add_argument("--since", default=None, help="YYYY-MM-DD: ignora feedbacks anteriores")
    args = ap.parse_args()

    feedbacks = load_feedback(args.since)
    if not feedbacks:
        print("Nenhum feedback encontrado em", FEEDBACK_DIR)
        return 0

    # Agrupa por skill
    by_skill: Dict[str, List[dict]] = defaultdict(list)
    for fb in feedbacks:
        by_skill[fb.get("skill", "geral")].append(fb)

    report_lines = [
        f"# Skill Evolution — {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        f"Feedbacks: {len(feedbacks)} | Skills afetadas: {len(by_skill)}",
        "",
    ]

    for skill, items in sorted(by_skill.items()):
        if len(items) < args.min_freq:
            continue
        neg = sum(1 for i in items if i.get("sentimento") == "negativo")
        pos = sum(1 for i in items if i.get("sentimento") == "positivo")
        report_lines += [
            f"## {skill} ({len(items)} feedbacks — {neg} negativos / {pos} positivos)",
            "",
        ]
        seen = set()
        for fb in items:
            ocorreu = (fb.get("o_que_aconteceu") or "").strip()
            key = ocorreu[:60]
            if key in seen:
                continue
            seen.add(key)
            fix = suggest_fix(fb)
            report_lines += [
                f"- **{fb.get('dev', '?')}** ({fb.get('projeto', '?')}, {fb.get('ts', '')}): "
                f"{ocorreu or 'sem relato'}",
                f"  - esperado: {fb.get('esperado', '—')}",
                f"  - sugestão: {fb.get('sugestao', '—')}",
                f"  - **proposta**: {fix}",
                "",
            ]

    report = "\n".join(report_lines)

    if args.dry_run:
        print(report)
        return 0

    os.makedirs(PROPOSALS_DIR, exist_ok=True)
    fname = f"proposal-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md"
    fpath = os.path.join(PROPOSALS_DIR, fname)
    with open(fpath, "w") as f:
        f.write(report)
        f.write(
            "\n---\n## Aprovação\n"
            "- [ ] Revisar cada proposta e editar o SKILL.md correspondente em `src/shared/native-skills/`\n"
            "- [ ] Rodar o eval/checklist do skill afetado antes de promover\n"
            "- [ ] Mover o feedback processado para `feedback/processed/`\n"
        )
    print(f"Proposta gerada: {fpath}")
    print(f"Dica: revise com `python3 {os.path.join(HERE, 'evolve.py')} --dry-run` e edite o(s) SKILL.md.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
