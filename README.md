# Samba Builder

Ambiente local da Samba para construir aplicações de clientes com IA. Evolui o [Samba](https://github.com/samba-sh/samba) com uma camada de fábrica: briefing, plano aprovado, marca, execução, segurança e handoff.

## Baixar o app

**macOS (Apple Silicon):** [SambaBuilder-1.14.0-beta.1-arm64.zip](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.1/SambaBuilder-1.14.0-beta.1-arm64.zip) · 180 MB · [página da versão](https://github.com/criptogus/Samba-Builder/releases/tag/v1.14.0-beta.1) · [todas as versões](https://github.com/criptogus/Samba-Builder/releases)

O build não é assinado (sem certificado Apple no projeto): na primeira abertura use **botão direito → Abrir**, ou rode `xattr -cr "/Applications/Samba Builder.app"` uma vez.

> **Windows e Linux** ainda não publicados: o workflow *Release app* gera as três plataformas, mas está bloqueado por pendência de **billing do GitHub Actions** na conta. Detalhes e como gerar localmente em [DOWNLOAD.md](DOWNLOAD.md).

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
