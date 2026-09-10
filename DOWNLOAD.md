# Baixar o Samba Builder

## Estado atual

**Ainda não há instalador publicado neste repositório.** Nenhuma release ou tag foi publicada em `criptogus/Samba-Builder` — a página [releases](https://github.com/criptogus/Samba-Builder/releases) está vazia até a primeira publicação acontecer.

## Caminho oficial (todas as plataformas)

O workflow **[Release app](https://github.com/criptogus/Samba-Builder/actions/workflows/release.yml)** gera os instaladores e os publica como **rascunho** para revisão:

1. **Actions → Release app → Run workflow** (branch `main`).
2. Ao terminar, revise o rascunho em [releases](https://github.com/criptogus/Samba-Builder/releases) e publique.
3. Os arquivos aparecem por plataforma:

| Plataforma              | Arquivo gerado                           |
| ----------------------- | ---------------------------------------- |
| macOS — Apple Silicon   | `SambaBuilder-<versão>-arm64.zip`        |
| macOS — Intel           | `SambaBuilder-<versão>-x64.zip`          |
| Windows 10/11 (x64)     | `SambaBuilder-<versão>-Setup.exe`        |
| Linux — Debian/Ubuntu   | `samba-builder_<versão>_amd64.deb`       |
| Linux — Fedora/openSUSE | `samba-builder-<versão>-1.x86_64.rpm`    |
| Linux — portátil        | `samba-builder-<versão>-x86_64.AppImage` |

O repositório é **privado**: o download exige uma conta com acesso.

## Gerar na sua máquina

Requer Node.js **24** e as ferramentas de compilação nativa da plataforma:

```sh
npm ci
npm run make      # pacote da sua plataforma em out/make/
```

No macOS, o resultado é o app em `out/make/zip/darwin/*/` (e o bundle em `out/`); no Windows sai o `Setup.exe`; no Linux, o `.deb`/`.rpm`/`.AppImage`.

Para rodar em desenvolvimento, sem empacotar: `npm start`.

## Requisitos do aplicativo

- macOS 12+ (Apple Silicon ou Intel), Windows 10/11 (x64) ou Linux x86_64 com FUSE (para o AppImage).
- Node.js **24** na máquina — o Builder usa o seu runtime para os comandos dos projetos e escolhe automaticamente a versão que cada projeto exige em `engines.node`.
- Chaves de IA são suas (BYOK): configure no aplicativo em _Settings → Providers_. Nada é enviado para servidores nossos.
