# Baixar o Samba Builder

Instaladores publicados no próprio repositório. **O repositório é privado:** o download exige uma conta com acesso.

## Versão mais nova (recomendada)

**https://github.com/criptogus/Samba-Builder/releases/latest**

Abre a última publicação estável, com todos os arquivos por plataforma.

## Escolher o arquivo certo

| Plataforma                                   | Arquivo              | Download                                                                                                                                          |
| -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS — Apple Silicon (M1 e posteriores)** | `.zip` (arm64)       | [SambaBuilder-1.14.0-arm64.zip](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/SambaBuilder-1.14.0-arm64.zip)               |
| **macOS — Intel**                            | `.zip` (x64)         | [SambaBuilder-1.14.0-x64.zip](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/SambaBuilder-1.14.0-x64.zip)                   |
| **Windows 10/11 (x64)**                      | instalador `.exe`    | [SambaBuilder-1.14.0-Setup.exe](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/SambaBuilder-1.14.0-Setup.exe)               |
| **Linux — Debian, Ubuntu e derivados**       | `.deb` (x64)         | [samba-builder_1.14.0_amd64.deb](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/samba-builder_1.14.0_amd64.deb)             |
| **Linux — Fedora, openSUSE e derivados**     | `.rpm` (x86_64)      | [samba-builder-1.14.0-1.x86_64.rpm](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/samba-builder-1.14.0-1.x86_64.rpm)       |
| **Linux — qualquer distro (portátil)**       | `.AppImage` (x86_64) | [samba-builder-1.14.0-x86_64.AppImage](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0/samba-builder-1.14.0-x86_64.AppImage) |

**Versão documentada nesta página:** `v1.14.0` (estável). Pré-releases ficam em [releases](https://github.com/criptogus/Samba-Builder/releases) e são marcadas como _Pre-release_ — use apenas para testar o que ainda não saiu.

## Instalação

- **macOS:** abra o `.zip`, arraste **Samba Builder** para _Aplicativos_. Na primeira execução, se o macOS reclamar da origem, use _Abrir_ no menu de contexto (botão direito) — builds locais não são notarizados pela Apple.
- **Windows:** rode o `Setup.exe`; o instalador cuida das atualizações da mesma linha de versão.
- **Linux (.deb):** `sudo apt install ./samba-builder_1.14.0_amd64.deb`
- **Linux (.rpm):** `sudo dnf install ./samba-builder-1.14.0-1.x86_64.rpm`
- **Linux (AppImage):** `chmod +x samba-builder-1.14.0-x86_64.AppImage && ./samba-builder-1.14.0-x86_64.AppImage`

## Requisitos

- macOS 12+ (Apple Silicon ou Intel), Windows 10/11 (x64) ou uma distribuição Linux x86_64 com FUSE (para o AppImage).
- Node.js **24** na máquina — o Builder usa o seu runtime para rodar os comandos dos projetos e escolhe automaticamente a versão que cada projeto exige em `engines.node`.
- Chaves de IA são suas (BYOK): configure no próprio aplicativo em _Settings → Providers_. Nada é enviado para servidores nossos.

## Verificar a origem do arquivo

Cada publicação inclui `release-provenance-<plataforma>.json` com o commit e o ambiente do build. Use-o para conferir que o instalador corresponde à versão publicada.
