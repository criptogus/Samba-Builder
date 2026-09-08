# Agentes locais no Samba Builder

Abra um projeto e clique em **Agentes locais**, junto ao botão de briefing no chat. Escolha Codex, Claude Code ou Grok Build.

1. Instale o CLI oficial pelo botão **Como instalar**, caso ainda não esteja instalado. Se a detecção automática não localizar o programa, use **Selecionar executável**.
2. Clique em **Entrar pelo programa oficial** e siga as instruções do provedor. Se o CLI já estiver autenticado, pode executar diretamente. “Programa encontrado” confirma a instalação, não o login.
3. Escreva a tarefa e clique em **Executar no projeto**. O agente trabalha na pasta do projeto aberto. Cada execução inicia uma sessão independente; o texto do chat principal não é enviado automaticamente.
4. Responda às perguntas e aos pedidos de permissão apresentados pelo agente. As permissões também seguem as regras do programa oficial: leituras e operações já permitidas podem ocorrer sem um novo pedido.
5. Revise as alterações antes de publicar. O Samba atualiza a árvore de arquivos, o conteúdo em cache e as alterações pendentes. Não cria um commit automaticamente por esse conector; o próprio agente pode usar Git conforme a tarefa e suas permissões.

**Cancelar execução**, fechar o painel ou fechar a janela do Samba encerra a execução. Alterações que já foram gravadas permanecem no projeto para revisão. A sessão só libera outra tarefa depois de encerrar o processo. A execução é recusada se o projeto estiver em uma versão histórica com HEAD destacado.

## Login e limites

| Agente      | Integração                                             | Login iniciado pelo Samba      |
| ----------- | ------------------------------------------------------ | ------------------------------ |
| Codex       | `codex app-server`, JSON-RPC por stdio                 | `codex login --device-auth`    |
| Claude Code | SDK oficial, usando o executável Claude Code instalado | `claude auth login --claudeai` |
| Grok Build  | ACP por `grok agent --no-leader stdio`                 | `grok login --device-auth`     |

O Samba não implementa uma tela própria de autenticação desses provedores e não lê nem copia os arquivos de credenciais dos CLIs. Ele guarda somente caminhos de executáveis. O usuário continua podendo autenticar o programa oficial diretamente pelos métodos que esse programa oferece.

A integração evita exigir uma chave de API no Samba. Os modelos continuam na nuvem: disponibilidade, assinatura, cotas e eventual cobrança dependem do provedor e da autenticação ativa no CLI. OAuth não fornece uso ilimitado nem execução offline. Não há fallback automático para outro provedor.

## Memória e compatibilidade

O painel e o SDK Claude são carregados sob demanda. Há uma única execução nativa por vez no aplicativo; os processos não ficam ativos enquanto o conector está ocioso. Grok usa o modo sem líder compartilhado. O painel limita a saída aos últimos 200 mil caracteres e interrompe logins após 10 minutos e tarefas após 30 minutos.

No macOS, processos são iniciados em grupos próprios e encerrados com escalonamento de sinal quando necessário. No Windows, os shims `.cmd`/`.bat` passam pelo tratamento de argumentos do aplicativo, e o encerramento usa `taskkill /t /f`.

Validação desta entrega: testes de IPC, interface, isolamento por janela, aprovações, cancelamento e limpeza de processos; teste do aplicativo macOS empacotado com os três protocolos simulados, sem rede nem consumo de IA. O Codex real instalado foi verificado apenas com inicialização e consulta do estado da conta. A geração real pelos provedores e a execução em um computador Windows ainda precisam de validação com as contas e os programas correspondentes.

## Documentação oficial

- [Codex CLI](https://developers.openai.com/codex/cli/)
- [Codex App Server](https://developers.openai.com/codex/app-server)
- [Claude Code](https://code.claude.com/docs/en/setup)
- [Uso e integração do Claude Code](https://code.claude.com/docs/en/legal-and-compliance)
- [Grok Build](https://github.com/xai-org/grok-build)
