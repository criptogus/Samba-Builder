# Samba Builder

**An open-source, Lovable-style platform for secure code development in corporate environments.** Describe the app, approve the plan and let AI build it on your own machine, with your own AI keys (BYOK), the code in normal Git repositories, and security checks built into the flow: **briefing → approved plan → brand → execution → security → handoff**.

## Download

Latest builds for every platform: **[zeroagency.ai/downloads](https://zeroagency.ai/downloads)** (always the newest release) · [all releases](https://github.com/criptogus/Samba-Builder/releases).

Permanent links that always start the newest installer:

| Platform                    | Download                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| macOS — Apple Silicon (M1+) | [zeroagency.ai/download/samba-builder/mac-arm64](https://zeroagency.ai/download/samba-builder/mac-arm64)           |
| macOS — Intel               | [zeroagency.ai/download/samba-builder/mac-x64](https://zeroagency.ai/download/samba-builder/mac-x64)               |
| Windows 10/11 (x64)         | [zeroagency.ai/download/samba-builder/windows](https://zeroagency.ai/download/samba-builder/windows)               |
| Linux — Debian/Ubuntu       | [zeroagency.ai/download/samba-builder/linux-deb](https://zeroagency.ai/download/samba-builder/linux-deb)           |
| Linux — Fedora/openSUSE     | [zeroagency.ai/download/samba-builder/linux-rpm](https://zeroagency.ai/download/samba-builder/linux-rpm)           |
| Linux — portable            | [zeroagency.ai/download/samba-builder/linux-appimage](https://zeroagency.ai/download/samba-builder/linux-appimage) |

### Install note

Current builds are **not yet code-signed** (no Apple or Windows certificate), so your OS will warn on first launch. On macOS: right-click the app → Open, or run `xattr -cr "/Applications/Samba Builder.app"`. On Windows: _More info → Run anyway_. Always download from this repository's releases or zeroagency.ai, never from a loose ZIP.

To publish a version: [docs/RELEASING.md](docs/RELEASING.md).

## Fábrica

Abra **Fábrica** na barra lateral para organizar aplicativos por cliente e conduzir a entrega:

- Briefing e conhecimento separados por projeto.
- Planos Must/Should/Could com critérios de aceite e aprovação explícita.
- Tokens de marca confirmados antes do Build.
- Oito skills P0 roteados por modo: Discover, Plan, Design, Build, Fix, Secure, Review e Ask.
- Scope Guard com registro e classificação de novos pedidos.
- Verificação local de segurança, typecheck, smoke e dependências, com gate antes das entradas de publicação integradas.
- Exportação de documentos e evidências para o repositório do aplicativo.

O ciclo atual é o [Caminho 1](docs/samba-factory/ROADMAP-90D-INTERNAL-FACTORY.md): fábrica interna, não vitrine. Guia de uso: [docs/samba-factory/README.md](docs/samba-factory/README.md).

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
