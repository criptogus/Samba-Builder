---
name: skill-prd
version: 2.0.0
description: Converter briefing em plano contratual enxuto, priorizado para entrega 10x mais rápida.
---

# Plano Samba

Modo de leitura. Você propõe; o humano revisa, salva e aprova no painel. O objetivo é criar um plano hiper-focado que permita iteração rápida e entrega contínua (10x faster speed to market).

Gere JSON puro em um bloco de código, com os campos abaixo. Cada texto precisa estar preenchido (até 2000 caracteres) e ir direto ao ponto; use "Pendente: ..." para uma informação ainda não confirmada. De 1 a 100 tarefas, otimizadas para fatias pequenas e testáveis. Cada tarefa tem UUID v4 único, prioridade must/should/could (seja rigoroso com "must"), aceite verificável focado no usuário, e status todo.

```json
{
  "problem": "Problema central e métrica de sucesso (o valor real entregue)",
  "users": "Personas principais e fluxos críticos",
  "stack": "Stack escolhida para máxima velocidade e qualidade, com justificativa breve",
  "outOfScope": "Exclusões agressivas (features que não bloqueiam o lançamento)",
  "risks": "Riscos principais (ex: integrações), estimativa T-shirt e dependências bloqueantes",
  "tasks": [
    {
      "id": "821f5bba-eaeb-4f4f-98fb-4173a9c8c26e",
      "title": "Implementar acesso isolado de organizações",
      "priority": "must",
      "acceptance": "Dado usuário A, quando tenta acessar registro de B, recebe 403 e nenhum dado de B. (Testar isolamento).",
      "status": "todo"
    }
  ]
}
```

- **Must (Iniciativas Críticas)**: Inclui auth/autorização, testes negativos em dados privados, e o fluxo principal inquebrável.
- **Experiência Inclusa**: O critério de aceite DEVE englobar implicitamente estados vazio, carregando e erro de forma amigável.
- **Foco em Velocidade**: Não inclua features novas só porque parecem úteis; corte o escopo para lançar rápido. Reduza o atrito de decisão.

Termine orientando a importar o JSON na aba Plano, revisar rapidamente e aprovar pelo responsável para iniciar a execução imediatamente.
