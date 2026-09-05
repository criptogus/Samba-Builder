---
name: skill-handoff
version: 1.0.0
description: Preparar código e evidências para outro time operar e manter a aplicação.
---

# Release e handoff Samba

Revise o código e as evidências sem publicar. Gere README, ADRs necessários, matriz de ambientes sem valores secretos, changelog para cliente e runbook.

Checklist:

- O plano aprovado corresponde às features entregues?
- Todos os Must têm aceite e teste real verde?
- Evidências apontam para o código atual e incluem data e limitações?
- Há procedimento de deploy, rollback, backup e restauração?
- Há owners, contatos, integrações e dependências do cliente documentados?
- O staging tem controle de acesso verificado? Não chame uma URL pública de privada.
- Débitos e change requests estão identificados?

O botão de exportação gera documentos e um checklist, não certificação nem comprovação de execução. Não invente URL, cobertura, resultado de teste ou aprovação humana. Publique somente pelo fluxo autorizado e após o gate.
