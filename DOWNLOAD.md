# Baixar o Samba Builder

## Publicado

Última versão: **[v1.14.0-beta.2](https://github.com/criptogus/Samba-Builder/releases/tag/v1.14.0-beta.2)** (pré-lançamento) · [todas as versões](https://github.com/criptogus/Samba-Builder/releases) — repositório privado, o download exige conta com acesso.

| Plataforma                  | Arquivo                                                | Download                                                                                                                          |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| macOS — Apple Silicon (M1+) | `SambaBuilder-1.14.0-beta.2-arm64.zip` (179 MB)        | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/SambaBuilder-1.14.0-beta.2-arm64.zip)        |
| macOS — Intel               | `SambaBuilder-1.14.0-beta.2-x64.zip` (188 MB)          | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/SambaBuilder-1.14.0-beta.2-x64.zip)          |
| Windows 10/11 (x64)         | `SambaBuilder-1.14.0-beta.2-Setup.exe` (167 MB)        | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/SambaBuilder-1.14.0-beta.2-Setup.exe)        |
| Linux — Debian/Ubuntu       | `samba-builder_1.14.0-beta.2_amd64.deb` (102 MB)       | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/samba-builder_1.14.0-beta.2_amd64.deb)       |
| Linux — Fedora/openSUSE     | `samba-builder-1.14.0-beta.2-1.x86_64.rpm` (106 MB)    | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/samba-builder-1.14.0-beta.2-1.x86_64.rpm)    |
| Linux — portátil            | `samba-builder-1.14.0-beta.2-x86_64.AppImage` (136 MB) | [baixar](https://github.com/criptogus/Samba-Builder/releases/download/v1.14.0-beta.2/samba-builder-1.14.0-beta.2-x86_64.AppImage) |

### macOS

1. Baixe o `.zip` e extraia.
2. Arraste **Samba Builder.app** para _Aplicativos_.
3. O build **não é assinado** (não há certificado Apple configurado): na primeira abertura use **botão direito → Abrir**, ou rode uma vez:

   ```sh
   xattr -cr "/Applications/Samba Builder.app"
   ```

### Windows

Rode o `Setup.exe`. Também não é assinado: em _Mais informações → Executar assim mesmo_.

### Linux

```sh
sudo apt install ./samba-builder_1.14.0-beta.2_amd64.deb      # Debian/Ubuntu
sudo dnf install ./samba-builder-1.14.0-beta.2-1.x86_64.rpm   # Fedora/openSUSE
chmod +x samba-builder-1.14.0-beta.2-x86_64.AppImage && ./samba-builder-1.14.0-beta.2-x86_64.AppImage
```

### Integridade

Os SHA-256 de cada arquivo estão nas notas da [release](https://github.com/criptogus/Samba-Builder/releases/tag/v1.14.0-beta.2) e no `release-provenance-<plataforma>.json` publicado junto.

### Por que os builds não são assinados

O projeto não tem certificado Apple nem conta Azure Trusted Signing. O workflow detecta as credenciais e, quando elas não existem, publica **sem assinatura** em vez de falhar. Configurando os secrets, os próximos releases saem assinados sozinhos — ver [docs/RELEASING.md](docs/RELEASING.md).

## Gerar na sua máquina

Requer Node.js **24** e as ferramentas de compilação nativa da plataforma:

```sh
npm ci
npm run make      # pacote da sua plataforma em out/make/
```

Para rodar em desenvolvimento, sem empacotar: `npm start`. Para empacotar sem assinar: `SAMBA_LOCAL_DESKTOP_BUILD=true npm run package`.

## Requisitos do aplicativo

- macOS 12+ (Apple Silicon ou Intel), Windows 10/11 (x64) ou Linux x86_64 com FUSE (para o AppImage).
- Node.js **24** na máquina — o Builder usa o seu runtime para os comandos dos projetos e escolhe automaticamente a versão que cada projeto exige em `engines.node`.
- Chaves de IA são suas (BYOK): configure no aplicativo em _Settings → Providers_. Nada é enviado para servidores nossos.
