#!/usr/bin/env python3
"""
Samba Builder — Quality Score (P4 do roadmap estilo Hermes).

LLM-as-judge local: avalia um app gerado contra o requisito, usando o rubric
do jeito Samba (bonito, elegante, rápido, inovador, simples, seguro) e a chave
do usuário (BYOK — lida de userData/user-settings.json, nunca exibida).

Uso:
    python3 samba/quality/score.py <dir-do-app> [requisito-em-texto]
    # ou: requisito vindo de docs/PROJECT_MEMORY.md ou README do app

Sem backend próprio: a chamada vai direto à API do provider conectado
(DeepSeek por padrão — o mesmo do app). Zero dependência externa além da chave.
"""

import json
import os
import sys
import urllib.request

RUBRIC = """Você é um avaliador sênior de qualidade de software (jeito Samba).
Avalie o app implementado contra o requisito usando EXATAMENTE estas dimensões,
com nota de 0 a 10 em cada uma e UMA frase de evidência por dimensão:

1. Bonito (design: coerência visual, espaçamento, tipografia, sem placeholder)
2. Elegante (arquitetura e código limpos, nomes claros, sem gambiarras)
3. Rápido (performance percebida: carregamento, tamanho de bundle, sem lixo)
4. Inovador (solução criativa para o problema, diferenciais bem resolvidos)
5. Simples (o usuário entende e usa sem esforço; sem complexidade desnecessária)
6. Seguro (sem segredos no código, sem XSS/injeção, inputs validados, HTTPS)

Responda SOMENTE com JSON:
{"score_total": <0-100 inteiro>, "dimensoes": {"bonito": {"nota": <0-10>, "evidencia": "..."}, ...}, "recomendacoes": ["...", ...], "veredito": "aprovado|ajustar|rejeitado"}
O veredito: aprovado >= 80, ajustar >= 50, rejeitado < 50. Seja rigoroso: placeholder visível, link quebrado ou segredo exposto derruba a nota."""


def read_user_key(base: str) -> tuple[str, str]:
    """Lê a chave do provider conectado (deepseek-samba) sem nunca imprimi-la."""
    p = os.path.join(base, "userData", "user-settings.json")
    if not os.path.exists(p):
        # fallback: userData ao lado do repo (dev roda do repo)
        p2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "userData", "user-settings.json")
        p = p2 if os.path.exists(p2) else p
    data = json.load(open(p, encoding="utf-8"))
    ps = data.get("providerSettings", {})
    for pid in ("deepseek-samba", "deepseek"):
        cfg = ps.get(pid, {})
        key = (cfg.get("apiKey") or {}).get("value")
        if key:
            return pid, key
    # env var direto (fallback documentado)
    key = os.environ.get("DEEPSEEK_API_KEY")
    if key:
        return "deepseek", key
    raise SystemExit("Nenhuma chave de provider encontrada em userData/user-settings.json (conecte o DeepSeek no app primeiro).")


def collect_app_context(app_dir: str, extra_req: str = "") -> str:
    """Monta o contexto do app: estrutura, código-chave, memória do projeto."""
    lines = []
    req = extra_req
    for name in ("docs/PROJECT_MEMORY.md", "README.md"):
        p = os.path.join(app_dir, name)
        if os.path.exists(p):
            with open(p, encoding="utf-8", errors="replace") as f:
                content = f.read()
            if name == "docs/PROJECT_MEMORY.md":
                lines.append("=== MEMÓRIA DO PROJETO ===\n" + content[:4000])
            elif not req:
                req = content[:2000]
    lines.append("=== REQUISITO ===\n" + (req[:3000] if req else "(não informado — avalie o app pelo que existe)"))

    # arquivos principais (sem node_modules/.git/dist)
    src_files = []
    for root, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist", ".next", ".venv")]
        for fn in files:
            if fn.endswith((".tsx", ".ts", ".jsx", ".js", ".py", ".css", ".html", ".json")):
                p = os.path.join(root, fn)
                try:
                    size = os.path.getsize(p)
                except OSError:
                    continue
                if size <= 60_000:
                    src_files.append(p)
                if len(src_files) >= 30:
                    break
        if len(src_files) >= 30:
            break
    src_files.sort(key=len)
    budget = 6000
    out = []
    for p in src_files[:20]:
        with open(p, encoding="utf-8", errors="replace") as f:
            c = f.read()
        out.append(f"--- {os.path.relpath(p, app_dir)} ---\n{c[:2500]}")
        budget -= len(out[-1])
        if budget <= 0:
            break
    lines.append("=== CÓDIGO PRINCIPAL ===\n" + "\n".join(out)[:12000])
    return "\n\n".join(lines)


def call_llm(provider_id: str, key: str, system: str, user: str) -> str:
    base = "https://api.deepseek.com"
    if provider_id == "deepseek":
        base = "https://api.deepseek.com"
    body = json.dumps({
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": 1200,
    }).encode()
    req = urllib.request.Request(
        base + "/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.loads(r.read())
    return resp["choices"][0]["message"]["content"]


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    app_dir = os.path.abspath(sys.argv[1])
    extra_req = sys.argv[2] if len(sys.argv) > 2 else ""
    if not os.path.isdir(app_dir):
        print(f"Diretório do app não encontrado: {app_dir}")
        return 2

    base = os.path.expanduser("~")
    provider_id, key = read_user_key(base)
    print(f"→ Avaliando {app_dir} (provider: {provider_id})...")
    context = collect_app_context(app_dir, extra_req)
    raw = call_llm(provider_id, key, RUBRIC, context)
    try:
        result = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
    except Exception:
        print("Resposta do avaliador não-JSON:\n", raw[:800])
        return 1

    print("\n" + "=" * 46)
    print(f"SCORE DE QUALIDADE: {result.get('score_total')}/100 — {result.get('veredito', '?').upper()}")
    print("=" * 46)
    for dim, info in result.get("dimensoes", {}).items():
        print(f"  {dim:<10} {info.get('nota', '?'):>4}/10  {info.get('evidencia', '')[:100]}")
    recs = result.get("recomendacoes") or []
    if recs:
        print("\nRecomendações:")
        for r in recs[:5]:
            print(f"  - {r[:160]}")
    print("\n" + json.dumps({"score": result.get("score_total"), "veredito": result.get("veredito")}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
