# Samba Builder: consumo de memória no desktop

Diagnóstico local em 5 de setembro de 2026, macOS ARM64.

## O que foi observado

A instância em uso estava executando `npm run dev`, com Electron e Electron Forge/Vite. Na amostra inicial, os cinco processos principais do Electron somavam aproximadamente 558 MiB de RSS: principal 102 MiB, interface 296 MiB, GPU 56 MiB, rede 40 MiB e outro renderer 64 MiB. A soma não inclui ferramentas de desenvolvimento e não equivale à memória física privada, pois há páginas compartilhadas.

Durante recompilações, o processo Forge/Vite chegou a aproximadamente 1,8 GiB de RSS. Esse custo pertence ao ambiente de desenvolvimento e pode ser evitado no uso diário com o aplicativo compilado. A máquina tinha aproximadamente 10 GiB de swap utilizado; esse valor é global e acumulado, não uma prova de vazamento do Samba.

O código também inicializava o Monaco ao importar os componentes, antes de abrir qualquer arquivo. O analisador de código conservava o processo e seus índices durante cinco minutos sem uso.

## Alterações

- O Monaco agora é configurado no `beforeMount` dos editores de arquivo e diff. A abertura do chat não dispara sua inicialização nem seus downloads.
- O scheduler libera o processo de análise e seus índices após 60 segundos sem operações. A regra substitui o timer de cinco minutos do Code Explorer. Solicitações ativas não são interrompidas, e uma nova análise aguarda a saída efetiva de um processo em encerramento.
- `npm run desktop:build` gera um pacote local de produção, separado dos pacotes E2E, sem exigir certificados de distribuição no Mac. As configurações padrão de assinatura e os fuses de produção permanecem vigentes para os releases normais.
- `npm run desktop` abre diretamente esse pacote, sem Forge/Vite, e encerra o launcher. Reutiliza `userData` do repositório ou `SAMBA_DEV_USER_DATA_DIR`, sem copiar nem apagar os dados. A execução usa argumentos diretos, sem shell, inclusive no Windows.

## Como usar

No repositório, com Node 24:

```sh
npm run desktop:build
```

Feche a instância de desenvolvimento e encerre seu comando `npm run dev`/`npm start`. Depois execute:

```sh
npm run desktop
```

É necessário recompilar com `desktop:build` após atualizar o código. Para desenvolver com recarga automática, `npm run dev` continua disponível. O pacote local não é um instalador assinado para distribuição.

## Validação e limites

21 testes Vitest de configuração dos editores e ciclo de vida dos processos, mais dois testes Node do launcher, passaram. Checagem de tipos passou; lint sem erros, com três avisos existentes. O teste E2E do aplicativo empacotado confirmou ausência de Monaco antes de abrir arquivos, carregamento ao abrir e salvamento verificado no disco.

O Mac foi usado para compilação e execução. Os caminhos Mac/Windows e o lançamento sem shell têm testes automatizados, mas o binário Windows ainda precisa ser compilado e executado em uma máquina Windows.

Não há uma porcentagem confiável de redução total: RSS varia com compressão de memória, coleta de lixo, projetos abertos e servidores de preview. As mudanças eliminam inicialização desnecessária, encurtam retenção do analisador e permitem evitar completamente o processo Forge/Vite no uso diário. A análise seguinte após a liberação do índice poderá levar mais tempo para reconstruí-lo.
