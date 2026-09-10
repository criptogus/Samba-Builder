# Samba Builder

Ambiente local da Samba para construir aplicações de clientes com IA. Evolui o [Samba](https://github.com/samba-sh/samba) com uma camada de fábrica: briefing, plano aprovado, marca, execução, segurança e handoff.

## Baixar o app

**Última versão: [releases/latest](https://github.com/criptogus/Samba-Builder/releases/latest)** · detalhes e instalação em [DOWNLOAD.md](DOWNLOAD.md)

| Plataforma                        | Download direto                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS** (Apple Silicon · Intel) | [arm64](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/SambaBuilder-1.14.0-arm64.zip) · [x64](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/SambaBuilder-1.14.0-x64.zip)                                                                                                                                 |
| **Windows** 10/11 (x64)           | [instalador .exe](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/SambaBuilder-1.14.0-Setup.exe)                                                                                                                                                                                                                                 |
| **Linux**                         | [.deb](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/samba-builder_1.14.0_amd64.deb) · [.rpm](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/samba-builder-1.14.0-1.x86_64.rpm) · [.AppImage](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/samba-builder-1.14.0-x86_64.AppImage) |

> Repositório privado: o download exige uma conta com acesso.

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
