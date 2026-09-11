# Publicar uma release

Fluxo operacional do Samba Builder. Escrito para humano **e** para agente: siga na ordem.

## Resumo

1. Suba a versão no `package.json` e commite.
2. Garanta o environment `release` no repositório (uma vez só).
3. Dispare o workflow **Release app** (`workflow_dispatch`).
4. O workflow cria a tag a partir da versão, builda **4 alvos** em paralelo (macOS, macOS Intel, Windows, Linux) e publica um **rascunho**.
5. Revise, verifique os assets e **publique** o rascunho.

## 1. Versão

```sh
npm run bump            # interativo: estável ou next-beta (scripts/bump-version.mjs)
# ou, direto:
npm version 1.15.0-beta.1 --no-git-tag-version
```

Formato aceito pelo script de release: `X.Y.Z` ou `X.Y.Z-beta.N`. Uma versão com `-beta` vira **pré-lançamento** no GitHub.

Commite o `package.json` (e o `package-lock.json`, se o comando mexer nele) **antes** de disparar: o workflow builda a partir da `main`.

## 2. Pré-requisitos (uma vez por repositório)

**Environment `release`.** O job de build declara `environment: release`; se ele não existir, o job falha.

```sh
gh api -X PUT repos/criptogus/Samba-Builder/environments/release
```

**Credenciais de assinatura (opcionais).** O workflow detecta e usa se existirem:

| Secret                                                        | Efeito                                   |
| ------------------------------------------------------------- | ---------------------------------------- |
| `MACOS_CERT_P12` + `MACOS_CERT_PASSWORD` + `APPLE_*`          | assina e notariza o macOS                |
| `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` + `AZURE_TENANT_ID` | assina o Windows (Azure Trusted Signing) |

**Sem eles o release não quebra:** o passo de detecção marca a credencial ausente, `SKIP_CODE_SIGNING` desliga `osxSign`/`osxNotarize` no `forge.config.ts` e o `WINDOWS_SIGN` não é ativado. O resultado é artefato **não assinado** — instalável, mas com aviso do sistema na primeira abertura.

## 3. Disparar

```sh
gh workflow run release.yml -R criptogus/Samba-Builder --ref main
gh run list -R criptogus/Samba-Builder --limit 1
```

## 4. O que o workflow faz

`.github/workflows/release.yml`, três jobs:

- **Prepare Release Tag** — `node scripts/prepare-release-tag.js prepare`: lê a versão do `package.json`, cria (ou reusa) a tag `v<versão>` e a release **não publicada**.
- **build** (matriz, `fail-fast: false`) — `windows-2022`, `ubuntu-22.04`, `macos-15-intel`, `macos-latest`. Cada um roda `npm run publish -- --dry-run`, gera o manifesto de proveniência e sobe o `out/` como artefato.
- **Publish Release** — baixa os artefatos, `electron-forge publish --from-dry-run` (cria o **rascunho**), anexa os manifestos, revalida a tag e checa os assets com `scripts/verify-release-assets.js`.

Se um alvo falhar, os outros continuam — mas **nada é publicado** (o job de publish depende de todos).

## 5. Por que uma versão nova é obrigatória

O script se recusa a mover a tag de uma release já publicada:

```
Failed to prepare release tag: Release v1.14.0-beta.1 is already published; refusing to move its tag.
```

Isso é proteção, não defeito: uma tag publicada é imutável. Para publicar de novo, **suba a versão** (a `beta.1` continua válida; a nova sai como `beta.2`).

## 6. Publicar e verificar

O rascunho fica em `releases` (não aparece para quem não tem acesso). Revise e publique:

```sh
gh release edit v1.15.0-beta.1 -R criptogus/Samba-Builder --draft=false
npm run verify-release        # checa os assets esperados contra a release
```

Nomes publicados (sem resquício de nome do upstream):

| Plataforma            | Arquivo                                  |
| --------------------- | ---------------------------------------- |
| macOS Apple Silicon   | `SambaBuilder-<versão>-arm64.zip`        |
| macOS Intel           | `SambaBuilder-<versão>-x64.zip`          |
| Windows 10/11         | `SambaBuilder-<versão>-Setup.exe`        |
| Linux Debian/Ubuntu   | `samba-builder_<versão>_amd64.deb`       |
| Linux Fedora/openSUSE | `samba-builder-<versão>-1.x86_64.rpm`    |
| Linux portátil        | `samba-builder-<versão>-x86_64.AppImage` |

### Quando o job de publicação não inicia (bloqueio de billing)

Se os builds passarem mas o **Publish Release** não rodar, o GitHub responde algo como:

> The job was not started because recent account payments have failed or your spending limit needs to be increased.

Os artefatos **já estão construídos** no run (retidos por 1 dia), então dá para publicar sem refazer build:

```sh
# 1. baixe os quatro artefatos do run
gh run download <run-id> -R criptogus/Samba-Builder --dir /tmp/sb-rel

# 2. os instaladores ficam em */make/**; renomeie para o padrão publicado (sem espaços):
#    "Samba Builder-<versão> Setup.exe"  ->  SambaBuilder-<versão>-Setup.exe

# 3. a tag já existe (criada pelo prepare); crie a release com os arquivos
gh release create v<versão> -R criptogus/Samba-Builder --prerelease \
  --title "Samba Builder <versão> — macOS, Windows e Linux" \
  --notes-file notas.md <arquivos...>

# 4. confirme baixando um arquivo de volta e comparando o SHA-256
```

Consequências: a tag fica **publicada** (a próxima release exige bump — seção 5) e o `Publish Release` daquele run continua vermelho até o billing ser resolvido. Não é falha de build.

## 7. Instalar um build não assinado

macOS:

```sh
xattr -cr "/Applications/Samba Builder.app"
```

Windows: _Mais informações → Executar assim mesmo_.

Ao substituir a instalação, **nunca apague o `userData`** (`~/Library/Application Support/Samba Builder` ou o diretório passado em `--user-data-dir`): o conhecimento (projetos, chats, lições do Córtex, MCPs, chaves) vive no `sqlite.db` **fora** do `.app`. Trocar o bundle não toca nele; apagar apaga tudo. Mover o bundle antigo para o Lixo é reversível e preferível a `rm -rf`.

## 8. Validar o release localmente (sem publicar)

```sh
SAMBA_LOCAL_DESKTOP_BUILD=true npm run package   # gera o .app em out/desktop, sem assinatura
```

O `SAMBA_LOCAL_DESKTOP_BUILD=true` também desliga a assinatura, então serve para conferir o empacotamento antes de gastar minutos de CI.

## Pitfalls (aprendidos na prática)

- **Runner do Windows usa PowerShell.** Qualquer passo com sintaxe bash precisa de `shell: bash` explícito — sem isso o job morre antes de buildar (aconteceu com o passo de detecção de credenciais).
- **Nunca aponte os scripts de assinatura para contas de terceiros.** O workflow herdado referenciava o certificado Apple e a conta Azure do projeto original; este fork não tem (nem deve ter) essas credenciais. A detecção existe justamente para não depender delas.
- **`npm run publish`/`make` no CI usam `npm run clean`** internamente; localmente, rode `clean` se o `out/` estiver velho.
- **Attestation não existe em repositório privado de conta pessoal.** O passo `actions/attest` falha com _Feature not available for user-owned private repositories_ — por isso ele é condicional (`if: github.event.repository.private == false`). Em repositório público volta a rodar sozinho.
- **Nome de exibição ≠ nome do binário.** O `packagerConfig.name` ("Samba Builder") é o nome que aparece para o usuário; os makers procuram o executável pelo nome do `package.json`. Sem `executableName: "samba-builder"` o Linux falha com `could not find the Electron app binary at out/Samba Builder-linux-x64/samba-builder`.
- **Minutos de CI:** macOS custa ~10× Linux. O release completo usa 4 runners, sendo 2 de macOS.
- **Repositório privado:** o download exige conta com acesso.
