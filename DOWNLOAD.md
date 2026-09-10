# Baixar o Samba Builder

## Publicado

| Plataforma | Arquivo | Download |
| --- | --- | --- |
| **macOS — Apple Silicon** | `SambaBuilder-1.14.0-beta.1-arm64.zip` (180 MB) | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.1/SambaBuilder-1.14.0-beta.1-arm64.zip) |
| macOS — Intel | — | aguardando o workflow de release |
| Windows 10/11 (x64) | — | aguardando o workflow de release |
| Linux (`.deb`/`.rpm`/`.AppImage`) | — | aguardando o workflow de release |

Versão atual: **[v1.14.0-beta.1](https://github.com/criptogus/Samba-Builder/releases/tag/v1.14.0-beta.1)** (pré-lançamento) · [todas as versões](https://github.com/criptogus/Samba-Builder/releases).

### Instalar no macOS

1. Baixe o `.zip` e extraia.
2. Arraste **Samba Builder.app** para *Aplicativos*.
3. O build **não é assinado** (não há certificado Apple configurado): na primeira abertura use **botão direito → Abrir**, ou rode uma vez:

   ```sh
   xattr -cr "/Applications/Samba Builder.app"
   ```

Integridade — SHA-256 do arquivo publicado: `4d43f1ed51219e558015561842c8a26d86f83f869bada14d550266e54b03ecdc`

### Por que Windows e Linux ainda não estão aqui

O workflow **[Release app](https://github.com/criptogus/Samba-Builder/actions/workflows/release.yml)** gera macOS (Apple Silicon e Intel), Windows e Linux e publica como rascunho para revisão. No momento **nenhum job do GitHub Actions inicia** nesta conta: o próprio GitHub responde `The job was not started because recent account payments have failed or your spending limit needs to be increased`. Resolvido o billing em *Settings → Billing & plans*, o workflow produz as três plataformas — e o macOS Intel junto.

Nomes dos arquivos que o workflow publica:

| Plataforma | Arquivo |
| --- | --- |
| macOS — Apple Silicon | `SambaBuilder-<versão>-arm64.zip` |
| macOS — Intel | `SambaBuilder-<versão>-x64.zip` |
| Windows 10/11 (x64) | `SambaBuilder-<versão>-Setup.exe` |
| Linux — Debian/Ubuntu | `samba-builder_<versão>_amd64.deb` |
| Linux — Fedora/openSUSE | `samba-builder-<versão>-1.x86_64.rpm` |
| Linux — portátil | `samba-builder-<versão>-x86_64.AppImage` |

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
