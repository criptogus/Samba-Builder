# Atualizações, debug bundles e releases

Este produto **não se atualiza sozinho**: os builds não são assinados, então o sistema operacional não permitiria uma instalação silenciosa. O que existe é um **aviso de nova versão**, ligado pelo usuário em Configurações: o app consulta a API de releases **deste** repositório e, havendo versão mais nova, mostra o número e um botão que abre a página de download. Instalar continua manual ([releases](../../README.md#baixar-o-app)).

Leia esta regra quando mexer em **aviso de versão**, **pacote de debug / relato de bug**, ou no **caminho de publicação e proveniência**.

## Aviso de versão (não confunda com auto-update)

- Contrato IPC `system.checkForUpdates` → lógica em `src/ipc/services/release_check.ts`; comparação de versão e escolha do asset da plataforma são funções puras, cobertas por `release_check.test.ts`.
- A consulta roda **no processo principal** porque o repositório é privado e o token do GitHub do usuário não pode chegar ao renderer. Sem token, sem rede ou sem permissão, a resposta é `unavailable` com motivo — a UI informa e oferece "tentar de novo", nunca quebra.
- Pré-lançamento é mais antigo que a versão estável do mesmo núcleo (`1.14.0` > `1.14.0-beta.2`). A release mais nova é escolhida entre todas, inclusive pré-lançamentos, e o asset é filtrado por plataforma/arquitetura.
- Não há `feedURL`, cliente Squirrel nem `api.samba.sh`: log antigo com `CheckForUpdate`/Squirrel falhando é resíduo de instalação anterior, não regressão deste repositório.
- O `ReleaseChannelSelector` **não** participa da checagem: hoje é metadado de relato de bug.

## Relato de bug e pacote de debug

- O corpo do bug report viaja na **URL de criação de issue** (`openGitHubIssue` em `HelpDialog.tsx`): qualquer seção nova de log precisa caber em ~1–2k chars. Ao cortar logs, preserve o bloco de erro corrente — pegar só a cauda pode manter apenas stack traces e perder a causa raiz.
- Não divida seções de log por linhas em branco arbitrárias: texto de exceção pode conter linhas em branco internas. Use cabeçalhos conhecidos.
- Todo campo novo enviado em pacote de sessão precisa aparecer na tela de revisão do `HelpDialog`, para o usuário inspecionar antes de enviar.

## Prova de release (proveniência)

- Gere os manifestos de proveniência a partir dos artefatos publicáveis em `out/make`, **não** de todo o `out` (que contém arquivos não empacotados).
- A API de releases do GitHub só devolve **rascunhos** para tokens com permissão de escrita: a verificação pós-upload precisa rodar num job com `contents: write` (é o que o `publish` faz). Um job somente-leitura reporta o rascunho como ausente mesmo com tudo enviado.
- O Electron Forge **sanitiza** o nome-base dos assets antes do upload (espaços e `~` viram `.`): registre o nome sanitizado na proveniência e compare nome, digest e tamanho exatos na verificação (`scripts/verify-release-assets.js`).
- Ao validar políticas de attestation contra um statement real do `actions/attest`: o caminho do workflow **não** tem barra inicial e o builder ID é a URL de identidade do workflow, não uma URL genérica de runner.
- Qualquer mudança intencional no `.github/workflows/release.yml` altera os digests dos assets: rode a verificação de release depois (`npm run verify-release`) em vez de assumir que o upload está íntegro.
