---
name: samba-skill-evolution
description: "Use quando houver feedbacks de devs sobre os skills nativos do Samba Builder (samba/skills/feedback/). Agrega relatos, gera propostas de mudança nos skills e garante aprovação humana antes de qualquer edição. Faz o Samba Builder melhorar sozinho: cada projeto entregue ensina o próximo."
---

# Skill Evolution — loop de feedback dos devs

O Samba Builder só fica "incrível" se os skills que dirigem o agente evoluírem
com o que os devs aprendem em cada projeto. Este skill fecha esse loop.

## Gatilhos

- Feedbacks novos em `samba/skills/feedback/*.jsonl` (o dev registra ao fim do
  projeto, ou o agente pergunta: "o que o agente errou/acertou neste build?")
- Após o learning loop do Córtex (`samba/learn/learn.py`) apontar padrões
- Pedido explícito: "evolua os skills", "o que os devs estão dizendo dos skills"

## Como os devs registram feedback

Formato JSONL (1 objeto por linha), campos:

```json
{
  "ts": "2026-09-05T10:00",
  "dev": "ana",
  "projeto": "landing-cliente-x",
  "skill": "design-taste-frontend",
  "sentimento": "negativo",
  "o_que_aconteceu": "gerou layout genérico de template",
  "esperado": "hero com identidade do cliente",
  "sugestao": "pedir referência visual antes do hero"
}
```

- `skill`: nome do skill nativo (ver `samba/skills/README.md`); `geral` se não se aplica
- `sentimento`: `negativo` (erro a corrigir) | `positivo` (padrão a consolidar)
- Sempre em PT, direto, sem floreio.

## Processo (obrigatório)

1. **Agregar**: `python3 samba/skills/evolution/evolve.py --dry-run` — mostra o
   relatório agrupado por skill.
2. **Propor**: `python3 samba/skills/evolution/evolve.py` — grava
   `samba/skills/evolution/proposals/proposal-*.md`. NUNCA edite o SKILL.md de um
   skill nativo antes de existir proposta escrita.
3. **Aprovar (humano)**: a proposta é apresentada ao dev/dono; cada item vira
   `[x]` só com OK explícito. Mudanças de design system ou de regra de marca
   exigem aprovação do Gustavo (imutável sem isso).
4. **Aplicar**: edite o SKILL.md correspondente em `samba/skills/native/<skill>/`
   com `patch` cirúrgico (uma regra por mudança, com o porquê).
5. **Verificar**: rode o checklist/eval do skill afetado; confirme que a regra
   nova é testável por um exemplo (nada de instrução vaga).
6. **Versionar**: commit com mensagem `skills(<nome>): <mudança> — motivo:
feedback <dev>/<projeto>`.
7. **Propagar**: se a lição vale pro Córtex (design system, padrão de cliente),
   registrar via learning loop para virar knowledge unit.

## Regras

- **Proposta ≠ aplicação**: nenhum skill é editado sem aprovação humana.
- **Uma regra por mudança**, com exemplo concreto (anti-padrão do feedback real).
- **Sem bloat**: feedback isolado (1 ocorrência) vira proposta, não regra — só
  consolida com recorrência (2+) ou quando é erro caro.
- **Skills do Córtex são fontes diferentes**: skills do vault (`_hermes-skills/`)
  evoluem pelo fluxo do próprio vault (distiller/curator), não por este loop.
- **Feedback processado** vai para `feedback/processed/` após aplicação.
