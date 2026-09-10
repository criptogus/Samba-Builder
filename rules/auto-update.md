# Debug bundles e releases

Este produto **não tem auto-update**: o `update-electron-app` consultava o backend do projeto original e foi removido (ver o comentário em `src/main.ts`). Atualização acontece baixando a release nova em [releases](../../README.md#baixar-o-app).

Leia esta regra quando mexer em **pacote de debug / relato de bug**, ou no **caminho de publicação e proveniência**.

## Não há feed de atualização

- Não procure `feedURL`, `RELEASES` nem `api.samba.sh` no código: nada disso existe aqui. Se um log de usuário mostrar `CheckForUpdate`/`Squirrel` falhando, é resíduo de uma instalação antiga ou do produto original — não é regressão deste repositório.
- Consequência de produto: a instalação nova **não** se atualiza sozinha; quem publica precisa avisar quem usa. Ver [docs/RELEASING.md](../../docs/RELEASING.md).

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
