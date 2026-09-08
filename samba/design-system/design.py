#!/usr/bin/env python3
"""
Samba Builder — Design System Toolkit

Gera o design system de um projeto (app Samba Builder: Tailwind + shadcn) e o
transforma em template reutilizável para os próximos projetos.

Fluxo (fases do produto):
  1. extract <app_dir>          -> design-system.json  (o design system do projeto)
  2. save-template <json>       -> ~/.samba-builder/design-templates/<slug>.json
  3. list-templates             -> templates salvos
  4. apply-template <nome> <app_dir_alvo>  -> aplica o template num projeto novo
     (fase 2: escreve globals.css + tailwind.config.ts do alvo)

O que um design system contém (formato canônico, schema samba-design-system-v1):
  - tokens.semantic.light/dark: vars shadcn (--background, --primary, ...) do globals.css
  - tokens.radius: raio (--radius)
  - tokens.fonts: fontFamily custom do tailwind.config
  - tokens.brandColors: cores de marca em HEX fora do padrão hsl(var(...))
  - tokens.animations: keyframes/animações custom
  - resolved.light/dark: cores semânticas resolvidas em HEX (para preview/thumb)
  - meta: baseColor/style do components.json (shadcn)

Python 3.9+. Sem dependências. Uso: python3 design.py <comando> [args]
"""
import colorsys
import datetime
import json
import os
import re
import sys
from typing import Dict, List, Optional

SCHEMA = "samba-design-system-v1"
STORE_DIR = os.path.join(os.path.expanduser("~"), ".samba-builder", "design-templates")

# ---------------------------------------------------------------- helpers ---

def hsl_to_hex(hsl: str) -> Optional[str]:
    """'222.2 84% 4.9%' (HSL space-separated) ou 'hsl(222.2 84% 4.9%)' -> '#0b1220'."""
    m = re.search(r"([\d.]+)\s+([\d.]+)%\s+([\d.]+)%", hsl)
    if not m:
        return None
    h, s, l = float(m.group(1)), float(m.group(2)) / 100, float(m.group(3)) / 100
    r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
    return "#{:02x}{:02x}{:02x}".format(round(r * 255), round(g * 255), round(b * 255))


def any_color_to_hex(value: str) -> Optional[str]:
    v = value.strip()
    if v.startswith("hsl("):
        v = v[4:-1].replace(",", " ")
    if re.match(r"^[\d.]+(\s+[\d.]+%){2}$", v):  # hsl space-separated
        return hsl_to_hex(v)
    m = re.match(r"^#([0-9a-fA-F]{3,8})$", v)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return "#" + h[:6].lower()
    m = re.match(r"^rgb\((\d+),\s*(\d+),\s*(\d+)\)$", v)
    if m:
        return "#{:02x}{:02x}{:02x}".format(*[int(x) for x in m.groups()])
    return None


def parse_css_vars(css_block: str) -> Dict[str, str]:
    """Extrai --var: valor; de um bloco CSS (:root { ... })."""
    vars_ = {}
    for m in re.finditer(r"(--[\w-]+)\s*:\s*([^;]+);", css_block):
        vars_[m.group(1)] = m.group(2).strip()
    return vars_


def read_block(css: str, selector: str) -> str:
    """Retorna o corpo de `selector { ... }` (simples, sem aninhamento)."""
    m = re.search(re.escape(selector) + r"\s*\{(.*?)\}", css, re.S)
    return m.group(1) if m else ""


# ------------------------------------------------------------- extractor ----

def find_file(root: str, names: List[str]) -> Optional[str]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".git", ".next", "dist")]
        for fn in filenames:
            if fn in names:
                return os.path.join(dirpath, fn)
    return None


def extract(app_dir: str, name: Optional[str] = None) -> dict:
    root = os.path.abspath(app_dir)
    css_path = find_file(root, ["globals.css", "index.css", "app.css"])
    tw_path = find_file(root, ["tailwind.config.ts", "tailwind.config.js"])
    cj_path = find_file(root, ["components.json"])

    ds = {
        "schema": SCHEMA,
        "name": name or os.path.basename(root.rstrip("/")),
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "sourceProject": os.path.basename(root.rstrip("/")),
        "meta": {"shadcn": {"baseColor": "slate", "style": "default", "cssVariables": True}},
        "tokens": {"semantic": {}, "radius": None, "fonts": {}, "brandColors": {}, "animations": []},
        "resolved": {},
        "sourceFiles": {},
    }

    # components.json (shadcn meta)
    if cj_path:
        try:
            cj = json.load(open(cj_path))
            ds["meta"]["shadcn"] = {
                "baseColor": cj.get("tailwind", {}).get("baseColor", "slate"),
                "style": cj.get("style", "default"),
                "cssVariables": cj.get("tailwind", {}).get("cssVariables", True),
            }
            ds["sourceFiles"]["components.json"] = os.path.relpath(cj_path, root)
        except Exception:
            pass

    # globals.css -> vars semânticas light/dark + radius
    if css_path:
        css = open(css_path, encoding="utf-8").read()
        light = parse_css_vars(read_block(css, ":root"))
        dark = parse_css_vars(read_block(css, ".dark"))
        ds["tokens"]["semantic"]["light"] = light
        if dark:
            ds["tokens"]["semantic"]["dark"] = dark
        radius = light.get("--radius") or dark.get("--radius")
        if radius:
            ds["tokens"]["radius"] = radius
        ds["sourceFiles"]["css"] = os.path.relpath(css_path, root)

        # resolved: cores semânticas em HEX (light + dark) para preview
        for mode, vars_ in (("light", light), ("dark", dark)):
            resolved = {}
            for var, val in vars_.items():
                hexv = any_color_to_hex(val)
                if hexv:
                    resolved[var[2:]] = hexv
            if resolved:
                ds["resolved"][mode] = resolved

    # tailwind.config.ts -> fonts custom + cores de marca em hex + animações
    if tw_path:
        tw = open(tw_path, encoding="utf-8").read()
        ds["sourceFiles"]["tailwind"] = os.path.relpath(tw_path, root)
        m = re.search(r"fontFamily\s*:\s*\{(.*?)\n\s*\}", tw, re.S)
        if m:
            for fm in re.finditer(r"([\w-]+)\s*:\s*\[([^\]]+)\]", m.group(1)):
                fonts = [f.strip().strip("'\"") for f in fm.group(2).split(",")]
                ds["tokens"]["fonts"][fm.group(1)] = fonts
        # cores hex diretas (marca) fora do padrão hsl(var(...))
        for cm in re.finditer(r"([\w-]+)\s*:\s*[\"']?(#[0-9a-fA-F]{3,8})[\"']?", tw):
            color_name, hexv = cm.group(1), cm.group(2).lower()
            if not any(c in color_name for c in ("background", "foreground", "border", "ring")):
                ds["tokens"]["brandColors"][color_name] = any_color_to_hex(hexv)
        for km in re.finditer(r"\"([\w-]+)\"\s*:\s*\{", tw):
            if km.group(1) not in ("from", "to", "extend", "theme", "colors", "fontFamily"):
                ds["tokens"]["animations"].append(km.group(1))

    return ds


# ------------------------------------------------------- template store ----

def _store_dir() -> str:
    os.makedirs(STORE_DIR, exist_ok=True)
    return STORE_DIR


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-") or "design-system"


def save_template(ds: dict, name: Optional[str] = None, desc: str = "", tags: str = "") -> str:
    name = name or ds.get("name", "design-system")
    slug = slugify(name)
    entry = {
        "schema": SCHEMA,
        "slug": slug,
        "name": name,
        "description": desc,
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
        "savedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "designSystem": ds,
    }
    path = os.path.join(_store_dir(), slug + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(entry, f, ensure_ascii=False, indent=2)
    return path


def list_templates() -> List[dict]:
    out = []
    for fn in sorted(os.listdir(_store_dir())):
        if not fn.endswith(".json"):
            continue
        try:
            e = json.load(open(os.path.join(_store_dir(), fn)))
            out.append({
                "slug": e["slug"], "name": e.get("name"), "description": e.get("description", ""),
                "tags": e.get("tags", []), "savedAt": e.get("savedAt", ""),
                "from": e.get("designSystem", {}).get("sourceProject", ""),
            })
        except Exception:
            continue
    return out


def load_template(slug: str) -> dict:
    path = os.path.join(_store_dir(), slugify(slug) + ".json")
    if not os.path.exists(path):
        print(f"ERRO: template '{slug}' não encontrado em {_store_dir()}")
        sys.exit(1)
    return json.load(open(path))


# --------------------------------------------------------------- apply -----

def _css_block(selector: str, vars_: Dict[str, str]) -> str:
    lines = [f"  {k}: {v};" for k, v in vars_.items()]
    return f"{selector} {{\n" + "\n".join(lines) + "\n}\n"


def apply_template(slug: str, target_app_dir: str) -> str:
    """Fase 2: aplica o template num projeto-alvo (escreve globals.css)."""
    entry = load_template(slug)
    ds = entry["designSystem"]
    root = os.path.abspath(target_app_dir)
    css_path = find_file(root, ["globals.css", "index.css"]) or os.path.join(root, "src", "globals.css")
    os.makedirs(os.path.dirname(css_path), exist_ok=True)
    semantic = ds["tokens"].get("semantic", {})
    light = semantic.get("light", {})
    dark = semantic.get("dark", {})
    radius = ds["tokens"].get("radius")
    if radius:
        light["--radius"] = radius
    css = "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n@layer base {\n"
    css += _css_block(":root", light)
    if dark:
        css += "\n" + _css_block(".dark", dark)
    css += "}\n"
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css)
    return css_path


# ------------------------------------------------------------------ main ----

def main() -> int:
    ap = __import__("argparse").ArgumentParser(description="Samba Builder design system toolkit")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("extract", help="extrai o design system de um projeto (app Samba Builder)")
    p.add_argument("app_dir")
    p.add_argument("--name", default=None)
    p.add_argument("--out", default=None, help="salva o json num arquivo")

    p = sub.add_parser("save-template", help="salva um design-system.json como template")
    p.add_argument("json_file")
    p.add_argument("--name", default=None)
    p.add_argument("--desc", default="")
    p.add_argument("--tags", default="")

    p = sub.add_parser("list-templates")
    p = sub.add_parser("apply-template", help="aplica um template salvo num projeto-alvo (fase 2)")
    p.add_argument("slug")
    p.add_argument("target_app_dir")

    args = ap.parse_args()

    if args.cmd == "extract":
        ds = extract(args.app_dir, args.name)
        print(json.dumps(ds, ensure_ascii=False, indent=2))
        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                json.dump(ds, f, ensure_ascii=False, indent=2)
            print(f"\nSalvo em: {args.out}")
        return 0

    if args.cmd == "save-template":
        ds = json.load(open(args.json_file))
        path = save_template(ds, args.name, args.desc, args.tags)
        print(f"Template salvo: {path}")
        return 0

    if args.cmd == "list-templates":
        for t in list_templates():
            print(f"  {t['slug']:28s} {t['name']:24s} from={t['from']} tags={','.join(t['tags'])}")
        return 0

    if args.cmd == "apply-template":
        path = apply_template(args.slug, args.target_app_dir)
        print(f"Template '{args.slug}' aplicado: {path}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
