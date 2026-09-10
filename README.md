# Samba Builder

Ambiente local da Samba para construir aplicações de clientes com IA. Evolui o [Samba](https://github.com/samba-sh/samba) com uma camada de fábrica: briefing, plano aprovado, marca, execução, segurança e handoff.

## Baixar o app

Os instaladores são gerados pelo workflow **[Release app](https://github.com/criptogus/Samba-Builder/actions/workflows/release.yml)** (Actions → _Release app_ → _Run workflow_), que publica macOS (Apple Silicon e Intel), Windows e Linux como **rascunho** para revisão em [releases](https://github.com/criptogus/Samba-Builder/releases).

Ainda não há publicação neste repositório — os links aparecem aqui assim que a primeira release for publicada.

Para gerar o instalador na sua máquina (macOS):

```sh
npm ci
npm run make   # gera o pacote em out/make/
```

## Fábrica

Abra **Fábrica** na barra lateral para organizar aplicativos por cliente e conduzir a entrega:

- Briefing e conhecimento separados por projeto.
- Planos Must/Should/Could com critérios de aceite e aprovação explícita.
- Tokens de marca confirmados antes do Build.
- Oito skills P0 roteados por modo: Discover, Plan, Design, Build, Fix, Secure, Review e Ask.
- Scope Guard com registro e classificação de novos pedidos.
- Verificação local de segurança, typecheck, smoke e dependências, com gate antes das entradas de publicação integradas.
- Exportação de documentos e evidências para o repositório do aplicativo.

A fundação local está implementada. Recursos como RBAC de equipe, deep scan, canvas de telas, preview autenticado para cliente e governança cloud continuam no roadmap. Consulte o [guia de uso e matriz de implementação](docs/samba-factory/README.md) e o [PRD fornecido](docs/samba-factory/PRD-original.md).

## Executar

Requer Node.js 24 e as ferramentas de compilação nativa da sua plataforma.

```sh
npm ci
npm run init-precommit
npm start
```

Os provedores de IA, o editor, o preview, Git e integrações usam os recursos existentes do fork. Configure suas chaves no Builder. O código das aplicações continua em repositórios normais, editáveis fora da ferramenta.

## Validação

```sh
npm run ts
npm run lint
npm test -- src/__tests__/factory src/components/factory/FactoryPage.test.tsx
npm run build
PLAYWRIGHT_HTML_OPEN=never npm run e2e -- samba_factory.spec.ts
```

`npm run build` prepara o pacote de testes E2E. Não é um instalador de produção assinado.

## Origem e licença

O Samba Builder é um fork do Samba. Consulte [NOTICE](NOTICE) e [CONTRIBUTING.md](CONTRIBUTING.md) para atribuições e convenções da base.

- Código fora de `src/pro`, incluindo `packages/samba-factory`, é licenciado sob [Apache-2.0](LICENSE).
- Código dentro de `src/pro` mantém a [Functional Source License](src/pro/LICENSE).
