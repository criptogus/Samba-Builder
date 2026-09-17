# Banco de Dados, Modelagem e Migrations

Modelagem relacional robusta, índices eficientes e evolução de schema sem perda de dados ou indisponibilidade (Zero-Downtime).

## Princípios de Modelagem

- **Normalização com Pragmatismo**: Modele na 3ª forma normal para consistência; desnormalize apenas por necessidade comprovada de leitura de alta frequência.
- **Tipagem Estrita**: Nunca use colunas de texto genéricas (`varchar` sem limite ou `json`) para dados com estrutura conhecida. Use tipos nativos (UUID, Timestamp com timezone, Enum, Integers, Booleans).
- **Chaves Primárias e Estrangeiras**:
  - Toda tabela deve ter chave primária (UUID v4/v7 ou `bigserial` / autoincrement).
  - Toda relação deve ter foreign key explícita com política de integridade referencial clara (`onDelete: cascade` ou `restrict`).
- **Campos Canônicos em Todas as Tabelas**:
  - `id`: Chave primária.
  - `created_at`: Timestamp com timezone (`defaultNow()`).
  - `updated_at`: Atualizado automaticamente na alteração.

## Migrations Seguras (Zero Downtime)

- **Mudanças em Duas Etapas**:
  - Para renomear coluna: 1º adicione a nova coluna e espelhe escrita; 2º migre dados históricos; 3º remova a coluna antiga.
  - Para adicionar campo obrigatório (`NOT NULL`): Primeiro adicione como opcional ou forneça um valor padrão (`DEFAULT`) para não travar inserções concorrentes.
- **Transações em Migrações**: Cada script de migração deve rodar dentro de uma transação atômica (`BEGIN / COMMIT`). Se um passo falhar, desfaça tudo.
- **Idempotência de DDL**: Use cláusulas defensivas (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- **Preservação de Dados**: Nunca execute `DROP TABLE`, `DROP COLUMN` ou `TRUNCATE` em produção sem backup explícito validado e aprovação dupla.

## Row Level Security (RLS) & Isolamento Multi-tenant

- Em bancos compartilhados (Supabase / Postgres), ative RLS em **todas** as tabelas sensíveis: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- Cada query executada pelo cliente deve ser restrita pelo `user_id` da sessão autenticada ou `tenant_id`:
  - Política de leitura (`SELECT`): `auth.uid() = user_id`
  - Política de escrita (`INSERT / UPDATE / DELETE`): `auth.uid() = user_id`
- Nunca contorne RLS usando credenciais administrativas (`service_role`) no lado cliente ou em rotas públicas.

## Performance em Consultas

- Crie índices em todas as chaves estrangeiras (`FKs`) e colunas usadas frequentemente em filtros (`WHERE`) e ordenações (`ORDER BY`).
- Use `EXPLAIN ANALYZE` para diagnosticar scans sequenciais indesejados (`Seq Scan`) em tabelas grandes.
- No Drizzle ORM / Prisma, use operadores seletivos (`select({ id: ..., name: ... })`) em vez de buscar tabelas inteiras com dezenas de colunas desnecessárias.
