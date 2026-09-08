# Templates compartilhados do Samba Builder

O catálogo da equipe fica neste diretório do repositório `criptogus/Samba-Builder`.
O Samba cria `index.json` na primeira publicação. Cada template recebe um UUID e
uma pasta com `template.json` e `files/`. O índice registra o SHA imutável dos
arquivos usados para criar novos projetos.

## Salvar um projeto

1. Abra os detalhes do projeto e o menu de opções (`…`).
2. Escolha **Salvar como template** e informe nome e descrição.
3. Clique **Revisar arquivos**. Esta etapa prepara uma cópia local; não envia
   arquivos ao GitHub.
4. Revise a lista, confirme que o conteúdo pode ser compartilhado e clique
   **Publicar template**.

A publicação usa a conta conectada na integração GitHub do Samba. A conta precisa
de acesso de escrita ao repositório. O destino é a branch padrão do repositório;
restrições de branch e erros de permissão são respeitados, sem force-push.
Nome e descrição não alteram a pasta do projeto. Salvar novamente cria outro
snapshot; alterações posteriores no projeto não modificam o template publicado.

## Usar em outro projeto ou computador

Na página **Templates**, clique **Atualizar templates da equipe** usando uma
conta GitHub com acesso ao repositório. Os itens aparecem em **Templates da
equipe**. Selecione um, aceite o consentimento de código quando solicitado e use
**Create App**. O novo projeto tem arquivos e histórico Git próprios.

O cache do catálogo permite continuar vendo os itens após reiniciar o Samba.
Atualizar e baixar os arquivos para um novo projeto requer acesso ao GitHub.
A sincronização que falha preserva o catálogo anterior e mostra o erro.

## Conteúdo e limites

Inclui código e assets atuais salvos no disco, respeitando `.gitignore` da raiz e
subpastas. Não inclui histórico Git/chat, `node_modules`, caches e builds comuns,
links simbólicos, `.env*`, arquivos de credenciais conhecidos, chaves privadas,
bancos SQLite locais e logs. Arquivos precisam ter nomes compatíveis com Mac e
Windows. Limites: 1.000 arquivos, 100 MB no total, 20 MB por arquivo e 500 templates
no catálogo. As cópias são processadas arquivo por arquivo.

O filtro por caminho não detecta todos os segredos ou dados de clientes escritos
no código. A revisão anterior à publicação é necessária. Quem tiver acesso ao
repositório poderá ler os templates; a visibilidade segue a configuração do
GitHub (privado na verificação de 05/09/2026).

Conexões de banco/deploy, variáveis de ambiente, configurações de execução
personalizadas do Samba e histórico de conversas não são copiados. Configure-os
no projeto novo. Scripts do próprio `package.json` são preservados.

Cancelar a revisão remove a cópia temporária. Rascunhos interrompidos expiram após
24 horas e são limpos na próxima preparação. Falhas de publicação mantêm o
rascunho aberto para tentar novamente. A publicação envia blobs, cria um commit
com o índice e os arquivos e atualiza a referência sem forçar. Conflitos não
substituem alterações de outros membros. Uma resposta incerta pode significar
que o commit chegou ao GitHub; a repetição com o mesmo rascunho reconhece o UUID
já publicado.

## Validação

Testes automáticos exercitam preparação, publicação via GitHub simulado,
preservação dos arquivos existentes no repositório, sincronização, criação de
uma cópia independente, filtros, limites, integridade, conflitos, revisão da
interface e descarte de rascunhos. O teste Electron prepara e revisa um projeto
isolado sem publicar conteúdo de teste no repositório oficial.

Referências: [Git trees](https://docs.github.com/en/rest/git/trees) e
[Git references](https://docs.github.com/en/rest/git/refs).
