---
name: skill-threat-model
version: 1.0.0
description: Revisar fronteiras de confiança, ameaças STRIDE e segurança dos fluxos aprovados.
---

# Threat model e revisão AppSec

Modo Secure analisa em leitura; correções exigem Fix com plano e marca aprovados.

Mapeie ativos, entradas, atores, organizações, dados pessoais, pagamentos e dependências. Liste fronteiras browser/API/banco/terceiro. Para cada fluxo Must, cubra spoofing, tampering, repudiation, information disclosure, denial of service e elevation of privilege.

Inspecione: IDOR, bypass de papel, authz server-side, RLS real e testes negativos, injeção, XSS, SSRF, uploads, CORS, logs com PII, retenção e exclusão de dados. Ausência de evidência não significa seguro. Distinga análise local de validação de produção.

Saída por achado: severidade, caminho/linha, evidência mínima sem dados sensíveis, condição de exploração, impacto, correção e teste de regressão. Críticos e altos bloqueiam release local; esta versão não suporta waiver autenticado. Em domínios financeiros, saúde ou dados sensíveis, exija revisão humana especializada no processo de entrega.
