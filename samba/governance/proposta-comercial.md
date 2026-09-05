# Samba Builder Enterprise — Governança que o corporativo exige

_Documento comercial de 1 página — para proposta/PPT. Detalhes técnicos: `samba/governance/MODELO.md`._

## O problema que resolvemos

Empresas não compram "IA que gera app" — compram **controle**. Quem pode criar o
quê, quem aprova o que sobe, onde está o registro de cada decisão. Sem isso, a
fábrica de software é um risco, não um ativo. O Samba Builder Enterprise entrega a
velocidade do app builder com a disciplina que o conselho e a auditoria exigem.

## Dois modos, um produto

|            | **Single**              | **Enterprise (governed)**                                     |
| ---------- | ----------------------- | ------------------------------------------------------------- |
| Perfil     | dev solo / time pequeno | áreas de negócio + tecnologia                                 |
| Fluxo      | ideia → app no ar       | **negócio cria → tecnologia aprova → sobe**                   |
| Papéis     | —                       | Owner (negócio) · Tech (aprova) · QA/Segurança (veta) · Admin |
| Deploy     | livre                   | **bloqueado até o ok da tecnologia** (gate)                   |
| Auditoria  | —                       | trilha imutável por projeto (hash encadeado)                  |
| Identidade | GitHub                  | GitHub Enterprise + SSO do cliente                            |

## O fluxo que a empresa pede (e que já funciona)

```
Área de negócio cria o projeto  →  submete para aprovação
      →  TECNOLOGIA aprova (ok técnico; QA pode vetar)
      →  produção liberada  →  tudo registrado na trilha de auditoria
```

Regras de ouro: **nada de produção sem o ok da tecnologia**; **nada de push direto
na main** (branch protection com review obrigatório); **segredo nunca no código**
(secret store do cliente); **quem altera a política** (governance.yaml) **é só o
admin**, via PR revisado.

## Segurança e auditoria

- **Identidade**: GitHub Enterprise do cliente (com SSO atrás) — o Samba Builder
  não duplica o IAM da empresa; respeita teams e permissões existentes.
- **Auditoria imutável**: cada decisão (submeter, aprovar, vetar, deploy) entra na
  trilha do projeto com **hash encadeado** — adulterar qualquer linha quebra a
  cadeia e o sistema acusa. Exportável para auditoria interna.
- **Política como código**: o `governance.yaml` do projeto define papéis e gates —
  versionado no repo, revisável, protegido.

## O que o cliente recebe

1. App builder com IA (DeepSeek/gateway do cliente, sem dados saindo para
   terceiros) para as áreas criarem em horas, não meses.
2. Governança enterprise pronta: papéis, aprovação negócio↔tecnologia, gates de
   deploy, trilha de auditoria.
3. **Aprendizado que fica na empresa**: design systems e padrões de cada projeto
   viram templates — o Córtex da Samba roda na infra do cliente (opcional).
4. Testes reais embutidos: Playwright (web) + computer use (cua-driver) — o agente
   prova que funciona antes de subir; QA/segurança podem vetar.

## Implantação

- **Zero servidor novo**: o Samba Builder roda no desktop do dev; autoridade no
  GitHub Enterprise existente. Setup por máquina em minutos (permissões macOS/Windows).
- Piloto: 1 área, 2–4 semanas, um projeto de verdade de ponta a ponta.

_Feito com o Jeito Samba: bonito, elegante, rápido, inovador, simples e seguro._
