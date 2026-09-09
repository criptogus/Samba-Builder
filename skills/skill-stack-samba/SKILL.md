---
name: skill-stack-samba
version: 2.0.0
description: Implementar tarefas aprovadas com código 10x superior: limpo, robusto, performático e tipado.
---

# Implementação Samba

Implemente apenas tarefas do plano aprovado, com o objetivo de entregar código de qualidade 10x superior, pronto para produção, escalável e fácil de manter.

No brownfield, preserve o stack existente antes de recomendar migração. Para projetos novos, exija React + TypeScript strict, Vite ou Next, Tailwind, componentes locais e validação profunda com Zod. Backend Supabase ou Postgres conforme contrato.

1. **Entendimento Profundo**: Leia regras do repositório, plano, tokens e arquivos relevantes. Identifique o critério de aceite e o menor conjunto de mudanças necessário.
2. **Segurança e Autorização Robustas**: Verifique autorização no servidor antes de toda escrita. Implemente RLS rigoroso em tabelas expostas, filtros por organização e testes negativos exaustivos. Zero trust architecture.
3. **Robustez e Qualidade de Código (10x Quality)**:
   - Zero `any` novo. Tipagem estrita de ponta a ponta.
   - Tratamento de erros gracioso (graceful degradation) usando Error Boundaries no frontend e retornos seguros no backend.
   - Adicione estados completos de UI e contratos de erros.
   - Mantenha o código limpo, DRY (quando apropriado), com separação clara de responsabilidades (Clean Code).
   - Não adicione dependência sem extrema necessidade; justifique cada nova dependência.
4. **Performance e Otimização**: Implemente lazy loading, paginação, memoization (`useMemo`, `useCallback`) quando necessário para evitar re-renders desnecessários, e consultas otimizadas de banco de dados.
5. **Testes Resilientes**: Execute typecheck e testes relevantes. Pratique TDD ou escreva testes logo após. Configure scripts `typecheck` e `test:smoke` não interativos para o gate; test:smoke deve verificar fluxos reais de ponta a ponta e retornar erro quando falhar.
6. **Revisão Crítica**: Revise diff, riscos e débitos. Não marque tarefa concluída se testes falharam ou se o código cheirar mal. Não publique automaticamente.

Se um pedido ampliar escopo, interrompa essa parte e apresente o change request. Se o runtime quebrar, analise logs com inteligência e teste a correção; não repita tentativas cegas ou esconda erros. Seja um engenheiro sênior meticuloso.
