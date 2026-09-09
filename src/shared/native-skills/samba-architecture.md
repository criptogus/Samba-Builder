# Architecture Fitness

Arquitetura de produto — não só escolha de stack. O default é um **monólito modular bem tipado com fronteiras de domínio explícitas**; microserviços só quando houver gargalo, ownership ou escala comprovados.

## Entregáveis por projeto

1. **Context map** — usuários, sistemas externos, fontes de verdade, integrações e fronteiras de confiança.
2. **Diagrama de containers** — frontend, backend, banco, filas, storage, autenticação, observabilidade, integrações.
3. **Decisões de arquitetura (ADRs curtos)** — alternativas consideradas e razão da escolha; registre no repo.
4. **Módulos por domínio de negócio**, não por tipo técnico — apresentação, aplicação, domínio e infraestrutura separados.
5. **Contratos de API tipados e versionados** — validação de schema nas bordas.
6. **Estratégia de dados** — ownership, migrations, índices, retenção, auditoria e backup.
7. **Estratégia assíncrona** — eventos, retries, idempotência, dead-letter queue quando aplicável.
8. **Escalabilidade proporcional à fase** — nada de distribuir cedo demais.

## Regra de ouro (bloqueante)

Nenhuma feature relevante pode introduzir: acesso direto ao banco dentro da UI, regra de negócio dentro de controller, segredo em frontend, ou chamada externa sem timeout, retry e tratamento de falha.

## Defaults por necessidade

| Necessidade                        | Default                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| SaaS B2B inicial                   | Monólito modular + Postgres + fila simples + storage + auth gerenciada                                   |
| App interno corporativo            | Monólito modular + RBAC + trilha de auditoria + SSO quando necessário                                    |
| Produto com IA                     | Camada de orquestração separada, jobs assíncronos, observabilidade de prompts/modelos, controle de custo |
| Integrações críticas               | Adaptadores por fornecedor, contratos tipados, retries, circuit breaker, logs de correlação              |
| Alto volume/domínios independentes | Extrair serviço só com gargalo/ownership/escala comprovados                                              |

## Anti-acoplamento

Imports cruzados arbitrários entre módulos são proibidos — cada módulo expõe uma API pública. Domínio livre de framework quando o custo justificar. Meça dependências cíclicas e tamanho de módulos. Feature flags para rollout seguro. Uma feature que altera mais de um domínio precisa declarar impactos, contratos e plano de migração antes de ser implementada. Ver /samba-quality-engineering para os testes de contrato.
