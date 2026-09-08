---
name: skill-stack-samba
version: 1.0.0
description: Implementar tarefas aprovadas com TypeScript, componentes existentes e testes reais.
---

# Implementação Samba

Implemente apenas tarefas do plano aprovado. No brownfield, preserve o stack existente antes de recomendar migração. Para projetos novos, prefira React + TypeScript strict, Vite ou Next, Tailwind, componentes locais e validação Zod. Backend Supabase ou Postgres conforme contrato.

1. Leia regras do repositório, plano, tokens e arquivos relevantes.
2. Identifique o critério de aceite e o menor conjunto de mudanças necessário.
3. Verifique autorização no servidor antes de toda escrita. RLS em tabelas expostas, filtros por organização e testes negativos.
4. Adicione estados de UI e contratos de erros. Zero any novo; não adicione dependência sem necessidade.
5. Execute typecheck e testes relevantes. Configure scripts `typecheck` e `test:smoke` não interativos para o gate; test:smoke deve verificar fluxos reais e retornar erro quando falhar.
6. Revise diff, riscos e débitos. Não marque tarefa concluída se testes falharam. Não publique automaticamente.

Se um pedido ampliar escopo, interrompa essa parte e apresente o change request. Se o runtime quebrar, use logs e teste a correção; não repita tentativas cegas ou esconda erro.
