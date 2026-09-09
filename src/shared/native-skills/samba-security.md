# Security by Design

Segurança por feature e por arquitetura — processo estruturado, não lista genérica. O que é de baixo risco segue o fluxo normal; risco alto/crítico **bloqueia** até os controles existirem.

## Por feature/arquitetura (mínimo)

1. **Classificação dos dados** — público, interno, confidencial, restrito, regulado (LGPD).
2. **Atores** — usuário final, administrador, operador, sistema externo, agente de IA, atacante.
3. **Fronteiras de confiança** — browser, API, worker, banco, storage, LLM, webhook, integrações, deploy.
4. **Ameaças (STRIDE ou equivalente)** + abusos previsíveis: prompt injection, enumeração de IDs, escalada horizontal/vertical, exfiltração via exportação, bypass de autorização, upload malicioso, abuso de rate limit, fraude de fluxo.
5. **Controles** — autenticação, autorização, isolamento por tenant, validação, criptografia, rate limiting, logging, alertas, resposta a incidentes.
6. **Testes negativos obrigatórios** — acesso indevido, sem papel, IDs de outro tenant, payload malformado — com evidência.

## Segurança de IA (produtos com agente/modelo)

- Separe instruções de sistema, contexto recuperado e input do usuário.
- Todo conteúdo externo é não confiável.
- O modelo nunca concede permissão a si mesmo.
- Ferramentas com escopo mínimo e consentimento explícito.
- Confirmação para operações financeiras, destrutivas, externas ou de acesso a dados sensíveis.
- Redija PII e segredos em logs, traces e prompts.
- Limites de custo, chamadas, tempo e tamanho de contexto.
- Registre cada ação do agente com correlação a usuário, projeto, sessão e decisão.
- Avalie prompt injection e tool misuse em testes.

## Ciclo de vida de credenciais (segredos)

1. Descoberta e classificação → 2. armazenamento seguro (nunca frontend/bundle/logs/exceptions/screenshots) → 3. uso com mínimo privilégio → 4. rotação → 5. revogação → 6. auditoria → 7. resposta a vazamento.

Regras: separar segredo de configuração não secreta; validar presença de segredo só no backend/runtime seguro; permissões por ambiente (dev/staging/prod); tokens de escopo mínimo e curta duração; proibir chaves pessoais compartilhadas em produção; rotação sem downtime; plano de revogação testado; secret scanning em pre-commit, CI e antes de release.
