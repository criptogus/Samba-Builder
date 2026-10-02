# Runbook: atualizar o app instalado no Mac mini

Vale enquanto o auto-update (OTA) não estiver funcionando de ponta a ponta. Ele existe porque hoje o app
**não** se atualiza sozinho — ver o diagnóstico em `docs/PROJECT_MEMORY.md` (seção "Auto-update").

## Antes de tudo: qual build instalar

| Comando                 | O que sai                                                                                                                      | Serve para o Mac mini?                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run desktop:build` | pacote **local** em `out/desktop`, **sem assinatura**, com `sambaLocalUserDataPath` apontando para o `userData` do repositório | Para **distribuir** no Mac mini, **não** (perfil que vive dentro do repo + sem assinatura). Para **instalar nesta máquina**, sim — é o caminho sem credenciais Apple: `npm run desktop:build && npm run desktop:install`. |
| `npm run make`          | instaladores/zip em `out/make`, assinado e notarizado                                                                          | **Sim** — é o artefato de distribuição.                                                                                                                                                                                   |
| `npm run package`       | app empacotado (sem os makers)                                                                                                 | Só se você souber o que está fazendo; o caminho normal é `make`.                                                                                                                                                          |
| `npm run build`         | build de **E2E** (`pre:e2e`)                                                                                                   | Não. É build de teste (ignora lock de instância, ativa modo de teste).                                                                                                                                                    |

`make` e `package` exigem credenciais Apple (`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`): em build que não é
local o `forge.config.ts` liga assinatura e notarização com `continueOnError: false`, então **sem credencial o
build falha** em vez de sair sem assinatura — de propósito.

## Instalar nesta máquina (sem credenciais Apple)

Para usar o produto no dia a dia na própria máquina de desenvolvimento, o pacote local basta:

```sh
npm run desktop:build      # gera out/desktop sem assinatura (dispensa credenciais)
npm run desktop:install    # copia o app para ~/Applications
```

- Destino padrão é `~/Applications` (não exige senha de administrador); use
  `npm run desktop:install -- --destination /Applications` se preferir o diretório do sistema.
- O pacote **não é assinado nem notarizado**: o macOS pode pedir confirmação no primeiro lançamento. Para
  distribuir para outras máquinas (Mac mini), o caminho é o release assinado (`npm run make`).
- Feche o Samba Builder antes: o app recusa uma segunda instância e a cópia pode falhar com o app aberto.
- Este pacote mantém o perfil de dados do repositório (`userData` dentro do repo) — é o desejado para a máquina
  de desenvolvimento; o release assinado usa o perfil do sistema.

## Substituir o app instalado

1. Feche o Samba Builder no Mac mini (o app recusa uma segunda instância; fechar evita "app em uso" na cópia).
2. Copie o novo `Samba Builder.app` para `/Applications`, substituindo o anterior.
3. Abra por `/Applications` (não pelo Finder em outra pasta: o Squirrel espera o app na pasta de aplicações).
4. Confira em **Configurações → auto-update**: a linha "Versão instalada" tem de mostrar a versão nova e o estado
   da última verificação.

## Por que o feed do Electron não atualiza este app

O repositório é público e a API de releases responde 200 sem token. O que não funciona é
`https://update.electronjs.org`: o servidor **pula release marcada como pré-lançamento**, e todas as versões
publicadas daqui são `1.14.0-beta.N`. O corpo do 404 é "no updates found", não falta de zip.

O caminho que funciona é a checagem da API (`system.checkForUpdates` / menu Verificar atualizações):

1. inclui beta e escolhe a mais nova por semver — a lista do GitHub não vem ordenada;
2. rascunho continua invisível; só a release publicada (caminho da tag) aparece;
3. no macOS o botão baixa o zip, confere o sha256 e troca o bundle. Em outra plataforma, ou se a troca falhar,
   abre a página da release. Instalação silenciosa via Squirrel não existe enquanto o build não for assinado.

## Publicar pela tag (caminho normal, depois que o OTA estiver de pé)

Quando o canal estiver resolvido (repo público/alcançável + credenciais Apple como secrets), a publicação é:

1. subir a versão em `package.json` (precisa ser maior que a instalada) **e escrever a nota em
   `docs/releases/v<versão>.md`** — o workflow anexa esse arquivo como descrição da release; sem ele a release sai
   sem texto (com aviso no log). O teste `src/__tests__/release_workflow.test.ts` falha se a versão do
   `package.json` não tiver a nota correspondente;
2. empurrar a tag `v<versão>` — o workflow confere que a tag corresponde à versão e **falha** se não corresponder;
3. ao terminar, a release é publicada sem draft (prerelease quando a versão tem sufixo `-beta`, por exemplo).

Sem a tag, o disparo manual continua disponível e termina em **draft** para conferência.

## Versão importa

O updater compara versões: um build com a **mesma** versão do instalado nunca é oferecido como atualização.

- Instalado no Mac mini: `1.14.0-beta.1`.
- Repositório: `1.14.0-beta.2` (já subido), então a tag `v1.14.0-beta.2` gera uma release **oferecível** como
  atualização.

Para os próximos: `npm run bump` é **interativo** (escolhe "Next beta" e, por conta própria, cria branch, commit,
push e abre PR) — em ambiente sem empurrar para o remoto, suba a versão nos três lugares que o script toca:
`package.json`, `package-lock.json` (`version`) e `package-lock.json` (`packages[""].version`). Subir só o
`package.json` deixa o lockfile inconsistente.
