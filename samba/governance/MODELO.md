# Samba Builder — Modelo de Governança (v1)

Objetivo: vender Samba Builder para o **corporativo** com regras claras de quem
pode fazer o quê, fluxo de aprovação negócio↔tecnologia e trilha de auditoria.

## Princípios

0. **Dois modos, um produto.** `single` (um dev faz tudo, sem gates — default,
   backward-compatible com o app atual) e `governed` (papéis + aprovações +
   auditoria, p/ corporativo). O modo é declarado no `governance.yaml`;
   projeto sem o arquivo = `single`. Transição single → governed é aditiva.
1. **Autoridade delegada, não reinventada.** Identidade, permissão de repo e
   revisão vêm do GitHub Enterprise do cliente (teams, branch protection, PR
   review). O Samba Builder **não** substitui o IAM — adiciona a política do
   produto sobre ele.
2. **Governança declarativa e versionada.** Cada projeto carrega
   `governance.yaml` (na raiz do repo) + `.samba/` com a trilha. Política é
   código revisável; quem mexe no `governance.yaml` precisa de permissão de
   admin do repo (proteção GitHub).
3. **Gates, não esperança.** Nenhuma ação sensível (deploy/produção/merge para
   main) acontece sem o gate da política ter passado. Gate falho = ação
   bloqueada, não aviso. (Aplica em `governed`; em `single` não há gates.)
4. **Separação negócio × tecnologia** (modo `governed`). Negócio **cria e
   valida o "o quê"**; tecnologia **aprova o "como"** antes de qualquer subida
   (deploy/produção). Inspiração: o pedido do Gustavo — "área de negócio cria
   o projeto; só sobe com o ok da tecnologia".
5. **Tudo auditável** (modo `governed`). Decisões de aprovação e ações
   sensíveis ficam na trilha (`.samba/audit/` no repo + log do app), imutáveis
   para quem não é admin.

## Modos de operação

|                    | **Single**                       | **Governado**                                |
| ------------------ | -------------------------------- | -------------------------------------------- |
| Quem               | 1 dev (solo/freela/time pequeno) | equipe + áreas de negócio (corp)             |
| `governance.yaml`  | ausente (ou `mode: single`)      | `mode: governed` + papéis                    |
| Ciclo              | criar → construir → publicar     | draft → in_review → approved → produção      |
| Gates de aprovação | nenhum (dev é o dono)            | submit/approve/veto obrigatórios p/ produção |
| Auditoria          | opcional (log do app)            | trilha hash-encadeada no repo                |
| Branch protection  | opcional                         | obrigatória (main sem push direto)           |

Transição: um projeto single vira governed quando o cliente adiciona
`governance.yaml` com `mode: governed` e os papéis — nada do que o dev fez
se perde; os gates passam a valer a partir daí.

## Papéis (por projeto)

| Papel                      | Quem                           | Pode                                                                                   | Não pode                                            |
| -------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Owner (negócio)**        | dono da área de negócio        | criar projeto, definir visão/requisitos, aprovar **conteúdo**, submeter para aprovação | deploy, alterar política, aprovar tecnicamente      |
| **Tech Lead / Aprovador**  | líder de engenharia do cliente | implementar/revisar, **aprovar tecnicamente**, aprovar política                        | aprovar o próprio trabalho sozinho (precisa 2º par) |
| **Engenheiro**             | time de dev                    | implementar, corrigir, rodar ambiente de dev                                           | deploy produção, aprovar, mudar política            |
| **Revisor (QA/segurança)** | QA/security                    | revisar, **bloquear** subida (veto)                                                    | deploy, aprovar conteúdo                            |
| **Admin (plataforma)**     | admins Samba/cliente           | política, gestão de papéis, auditoria, exceções                                        | (ações de negócio delegadas)                        |

Mapeamento no GitHub Enterprise: papéis = **teams** do repo
(`samba-owners`, `samba-tech-approvers`, `samba-devs`, `samba-reviwers`,
`samba-admins`) referenciados no `governance.yaml`. O usuário conectado (device
flow) tem a identidade; o app consulta a membership do time via API.

## Ciclo de vida do projeto (estados)

```
[negócio]                    [tecnologia]                [negócio]      [plataforma]
Draft ──submeter──▶ In Review ──ok tech──▶ Approved ──▶ Staging ──▶ Production
  ▲                     │  ▲                  │
  └── ajustes ◀── vetado│  └── reprovado ─────┘
```

| Estado       | Gate para entrar                                         | Quem transita        |
| ------------ | -------------------------------------------------------- | -------------------- |
| `draft`      | —                                                        | Owner cria (negócio) |
| `in_review`  | Owner submete ("subir para aprovação")                   | Owner                |
| `approved`   | **ok tech** (Tech Lead assina; veto de Revisor bloqueia) | Tech Lead            |
| `staging`    | approved + branch protegida (PR mergeado)                | —                    |
| `production` | staging validado + política de produção ok               | Tech Lead/Admin      |

## Matriz de permissões (ações × papel)

| Ação                                      | Owner        | Tech Lead    | Eng  | Revisor      | Admin |
| ----------------------------------------- | ------------ | ------------ | ---- | ------------ | ----- |
| Criar projeto / editar visão e requisitos | ✅           | ✅           | ✅\* | ✅\*         | ✅    |
| Editar código                             | ✅\*         | ✅           | ✅   | ✅\*         | ✅    |
| Submeter para aprovação (negócio)         | ✅           | —            | —    | —            | ✅    |
| Aprovar tecnicamente (ok tech)            | —            | ✅           | —    | —            | ✅    |
| Vetar subida                              | —            | ✅           | —    | ✅           | ✅    |
| Rodar ambiente dev/preview                | ✅           | ✅           | ✅   | ✅           | ✅    |
| Deploy staging                            | —            | ✅           | ✅\* | —            | ✅    |
| Deploy produção                           | —            | ✅           | —    | —            | ✅    |
| Alterar `governance.yaml`                 | —            | —            | —    | —            | ✅    |
| Acessar trilha de auditoria               | ✅ (leitura) | ✅ (leitura) | —    | ✅ (leitura) | ✅    |

\* apenas via PR com review (branch protection) — nunca direto na main.

## Regras de segurança (mínimas para o corporativo)

1. **Nada de produção sem PR mergeado em branch protegida** (main: sem push
   direto; CODEOWNERS exige `samba-tech-approvers`).
2. **Deploy exige o gate**: estado `approved` + assinatura de Tech Lead na
   trilha + nenhum veto ativo de Revisor.
3. **Segredo nunca no app/repo**: chaves ficam em secret store do cliente
   (GitHub Actions secrets / Vault); o Samba Builder referencia por nome.
4. **App desktop é superfície local**: cada máquina autentica (device flow);
   ações sensíveis exigem reconfirmação de identidade (re-auth curto) quando
   configurado.
5. **Auditoria imutável**: `.samba/audit/*.jsonl` append-only; assinado por
   hash encadeado (cada linha carrega hash da anterior). Só admin pode
   arquivar/expurgar, com registro.
6. **Política versionada e protegida**: mudança em `governance.yaml` passa por
   PR com aprovação de admin — a branch protection do GitHub aplica.
7. **Escopo de dados**: o Samba Builder trata o código do cliente como
   confidencial — telemetria desligável (env), nada de código em terceiros além
   dos LLM providers contratados (DeepSeek/gateway do cliente).

## Onde vive (implementação neste repo)

- `samba/governance/policy.schema.yaml` — schema da política
- `samba/governance/policy.example.yaml` — política de exemplo (papéis reais)
- `samba/governance/gate.py` — CLI: `init|status|submit|approve|veto|check`
  (grava trilha e valida gates)
- `samba/governance/MODELO.md` — este documento (fonte da verdade conceitual)
- O template de projeto novo do Samba Builder passa a incluir
  `governance.yaml` + `.samba/` (fase integrar)

## Roadmap de governança

- [x] Modelo conceitual (este doc)
- [x] Schema + política de exemplo
- [x] `gate.py` v1 (trilha local + validação de gates) — testes
- [ ] Integrar estados ao app (campo de estado do projeto + UI de submit/approve)
- [ ] Adapter GitHub (mapear papéis↔teams, consultar membership, branch protection)
- [ ] Gate de deploy real no pipeline (bloquear publish se não `approved`)
- [ ] Auditoria com hash encadeado + export
- [ ] Documento comercial (1 página) p/ proposta corporativa
