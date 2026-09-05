# Briefings a partir de reuniões

O botão **Briefing de reunião** aparece na tela inicial e no chat de um projeto existente. Ele prepara um pedido no campo de mensagem, preservando o rascunho anterior. O envio ao modelo acontece somente quando o usuário envia a mensagem.

## Granola

1. Abra Briefing de reunião e escolha Granola.
2. Clique Configurar Granola. O Samba adiciona o servidor oficial ao gerenciador Plugins ou reutiliza uma conexão com o mesmo endereço.
3. Na página do conector, clique Connect e conclua o OAuth no navegador.
4. Volte ao botão de briefing, informe cliente (opcional) e título/data/link da reunião.
5. Use no chat e envie a mensagem. O agente consulta as ferramentas disponíveis do Granola e prepara o briefing. Se houver reuniões ambíguas, o pedido instrui o agente a apresentar as opções antes de prosseguir.

O conector usa Streamable HTTP em `https://mcp.granola.ai/mcp`. Reutiliza o armazenamento de credenciais, OAuth e permissões MCP existentes no Samba. As ferramentas disponíveis, o acesso à transcrição e o histórico acessível dependem da conta/plano/workspace do Granola. A tela mostra conta vinculada a partir do estado OAuth salvo; isso não substitui uma consulta autenticada bem-sucedida. Tokens expirados podem exigir reconexão. Não há API privada, scraping do cache local ou sincronização de todas as reuniões.

O fluxo consulta reuniões pelo agente no chat; não adiciona um calendário ou seletor visual de todas as reuniões. Mantenha um modo e permissões que disponibilizem as ferramentas MCP de leitura. Se estiverem indisponíveis, o pedido orienta usar uma exportação.

Documentação oficial consultada em 05/09/2026: [Granola MCP](https://docs.granola.ai/help-center/sharing/integrations/mcp).

## Áudio de qualquer gravador

Na origem Áudio ou transcrição exportada, clique Selecionar áudio e transcrever. O diálogo nativo seleciona o arquivo e o main process faz o upload diretamente para a OpenAI. É necessário configurar a própria chave OpenAI em Settings → AI Providers → OpenAI; o uso é cobrado nessa conta. Não depende da assinatura Dyad Pro.

São aceitos MP3, MP4, MPEG, MPGA, M4A, WAV e WEBM, até 24 MB. Usa `whisper-1` e `verbose_json` para preservar timestamps de segmentos quando retornados. Falantes não são identificados automaticamente. A resposta aparece em uma área editável, junto ao nome do arquivo. Revise o texto, clique Usar no chat e envie quando estiver pronto.

A seleção do áudio autoriza seu envio ao provedor, conforme indicado na interface. Cancelar tenta interromper o processamento em andamento; não recolhe bytes já enviados. Fechar a janela também cancela a operação. Falta de chave, arquivo incompatível, erro do provedor e tamanho excessivo são apresentados ao usuário.

O uploader lê um Blob apoiado no arquivo, sem base64 ou cópia integral do áudio no renderer. Há uma importação de áudio por vez, timeout de 180 segundos e limite de 2 MiB na resposta do provedor. Não instala FFmpeg, Whisper local, novos SDKs ou serviços residentes. Arquivos grandes precisam ser divididos/exportados em formato menor ou substituídos por uma transcrição pronta.

Referência: [transcrição de arquivos na OpenAI](https://developers.openai.com/api/docs/guides/speech-to-text).

## Zoom, Teams, Meet, Fathom, Otter, Plaud e outros

Exporte um áudio compatível ou uma transcrição TXT, Markdown, SRT ou VTT e importe pelo mesmo botão. Isso é integração por arquivo, não autenticação/API direta com cada um desses serviços. Também é possível colar texto.

Transcrições são limitadas a 768 KiB de arquivo e 180.000 caracteres, sem truncamento silencioso. Timestamps e nomes existentes são preservados. O texto pode ser editado antes de preparar o pedido. O limite final do chat também é validado, inclusive após juntar com um rascunho existente. Para transcrições prontas, não há chamada ao serviço de áudio.

## Resultado e tratamento dos dados

O pedido solicita objetivo, público, escopo, jornadas, integrações, dados, preferências visuais, critérios de aceitação e evidências. Prazo e orçamento ficam como não informados quando ausentes. Hipóteses, contradições e perguntas pendentes são separadas de requisitos confirmados.

A preparação não envia uma mensagem, não cria um projeto e não autoriza código ou deploy. Ao enviar na tela inicial, o fluxo normal do Samba pode criar o projeto/conversa de destino; o pedido à IA é apenas produzir o briefing. O modo e as permissões existentes não são alterados por esta funcionalidade.

Áudio não é copiado para o projeto nem para um arquivo temporário pelo conector. O texto fica no formulário até ser usado; depois passa a fazer parte do rascunho e, quando enviado, do histórico normal de chat. Menções `@app`, `@prompt`, comandos slash e marcações nos dados são serializados para não ativar os interpretadores de comandos do Samba. O prompt também orienta tratar as falas como fonte, não como instruções de execução.

## Validação

Testes cobrem multipart para o endereço fixo, respostas limitadas, cancelamento por dono da janela, liberação da operação, ausência de upload ao cancelar a seleção, credencial obrigatória, importação/revisão, rascunho preservado, transcrição sem execução de menções e deduplicação do Granola. O catálogo MCP existente é exercitado com servidor local simulado.

A validação automática não autentica uma conta real do Granola nem envia uma gravação de cliente à OpenAI. Esses dois percursos precisam de credenciais e validação da conta do usuário. Windows precisa de execução nessa plataforma; os caminhos usam APIs Node/Electron multiplataforma.
