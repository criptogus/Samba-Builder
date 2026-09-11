# Samba Builder

Ambiente local da Samba para construir aplicações de clientes com IA. Uma camada de fábrica em volta do loop de geração: **briefing → plano aprovado → marca → execução → segurança → handoff**, com as chaves de IA do próprio usuário (BYOK) e o código do cliente em repositórios normais.

## Baixar o app

Última versão: **[v1.14.0-beta.2](https://github.com/criptogus/Samba-Builder/releases/tag/v1.14.0-beta.2)** · [todas as versões](https://github.com/criptogus/Samba-Builder/releases) — repositório privado, o download exige conta com acesso.

| Plataforma                  | Download                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS — Apple Silicon (M1+) | [SambaBuilder-1.14.0-beta.2-arm64.zip](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/SambaBuilder-1.14.0-beta.2-arm64.zip)               |
| macOS — Intel               | [SambaBuilder-1.14.0-beta.2-x64.zip](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/SambaBuilder-1.14.0-beta.2-x64.zip)                   |
| Windows 10/11 (x64)         | [SambaBuilder-1.14.0-beta.2-Setup.exe](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/SambaBuilder-1.14.0-beta.2-Setup.exe)               |
| Linux — Debian/Ubuntu       | [samba-builder_1.14.0-beta.2_amd64.deb](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/samba-builder_1.14.0-beta.2_amd64.deb)             |
| Linux — Fedora/openSUSE     | [samba-builder-1.14.0-beta.2-1.x86_64.rpm](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/samba-builder-1.14.0-beta.2-1.x86_64.rpm)       |
| Linux — portátil            | [samba-builder-1.14.0-beta.2-x86_64.AppImage](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/samba-builder-1.14.0-beta.2-x86_64.AppImage) |

Os builds **não são assinados** (o projeto não usa certificado Apple nem Azure): no macOS, use **botão direito → Abrir** ou rode `xattr -cr "/Applications/Samba Builder.app"`; no Windows, _Mais informações → Executar assim mesmo_.

Para publicar uma versão: [docs/RELEASING.md](docs/RELEASING.md).

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

Para empacotar localmente, sem assinar:

```sh
SAMBA_LOCAL_DESKTOP_BUILD=true npm run package   # .app em out/desktop
```

Os provedores de IA, o editor, o preview, Git e integrações usam os recursos existentes do fork. Configure suas chaves no Builder. O código das aplicações continua em repositórios normais, editáveis fora da ferramenta.

## Validação

```sh
npm run verify   # presubmit (fmt:check + lint) + type-check + suíte
npm run ts
npm run lint
npm test -- src/__tests__/factory src/components/factory/FactoryPage.test.tsx
npm run build
PLAYWRIGHT_HTML_OPEN=never npm run e2e -- samba_factory.spec.ts
```

`npm run build` prepara o pacote de testes E2E. Não é um instalador de produção assinado.

> A suíte completa tem ~7,9 mil testes e consome bastante memória: feche o app antes de rodá-la.

## Documentação

| Documento                                       | Para quê                                                     |
| ----------------------------------------------- | ------------------------------------------------------------ |
| [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) | guia dos agentes de IA e índice de `rules/` (mesmo conteúdo) |
| [docs/architecture.md](docs/architecture.md)    | como o produto funciona por dentro                           |
| [docs/RELEASING.md](docs/RELEASING.md)          | publicar uma versão                                          |
| [CONTRIBUTING.md](CONTRIBUTING.md)              | convenções de contribuição                                   |
| [SECURITY.md](SECURITY.md)                      | como reportar problema de segurança                          |
| [docs/](docs/)                                  | padrão de entrega, qualidade, evidência, ADRs                |
| [samba/docs/](samba/docs/)                      | roadmap e documentação de produto (pt-BR)                    |

## Origem e licença

O Samba Builder é um fork do Samba, mantido como produto próprio. Consulte [NOTICE](NOTICE) e [CONTRIBUTING.md](CONTRIBUTING.md) para atribuições e convenções da base.

- Código fora de `src/pro`, incluindo `packages/samba-factory`, é licenciado sob [Apache-2.0](LICENSE).
- Código dentro de `src/pro` mantém a [Functional Source License](src/pro/LICENSE).
