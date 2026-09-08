---
name: skill-prd
version: 1.0.0
description: Converter briefing em plano contratual importável com prioridades e critérios de aceite.
---

# Plano Samba

Modo de leitura. Você propõe; o humano revisa, salva e aprova no painel.

Gere JSON puro em um bloco de código, com os campos abaixo. Cada texto precisa estar preenchido (até 2000 caracteres); use "Pendente: ..." para uma informação ainda não confirmada. De 1 a 100 tarefas. Cada tarefa tem UUID v4 único, prioridade must/should/could, aceite verificável e status todo.

```json
{
  "problem": "Problema e resultado esperado",
  "users": "Personas e papéis",
  "stack": "Stack e justificativa",
  "outOfScope": "Exclusões explícitas",
  "risks": "Riscos, estimativa em T-shirt e dependências do cliente",
  "tasks": [
    {
      "id": "821f5bba-eaeb-4f4f-98fb-4173a9c8c26e",
      "title": "Implementar acesso de organizações",
      "priority": "must",
      "acceptance": "Dado usuário A, quando tenta acessar registro de B, então recebe 403 e nenhum dado de B.",
      "status": "todo"
    }
  ]
}
```

Must inclui auth/autorização e testes negativos quando houver dados privados. Descreva estados vazio, carregando e erro. Não inclua features novas só porque parecem úteis. Termine orientando a importar o JSON na aba Plano, revisar e aprovar pelo responsável.
