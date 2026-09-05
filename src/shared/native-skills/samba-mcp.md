# Integrações MCP

Defina a ação desejada, o serviço de destino e os dados necessários. Consulte primeiro os conectores já habilitados no Samba. Um catálogo de servidores não é prova de que uma ferramenta está instalada ou autenticada.

Para um novo conector, identifique mantenedor, repositório oficial, licença do servidor específico, transporte suportado, credenciais e permissões mínimas. Use o gerenciador MCP/Plugins existente para configuração pelo usuário. Não copie comandos de catálogos para execução automática, não exponha tokens e não habilite todos os servidores.

Valide conexão e listagem de ferramentas com uma operação somente leitura. Verifique schema, limites de resposta, timeout, falha de autenticação e desconexão. Para stdio, avalie encerramento do processo e consumo ocioso; para remoto, avalie quais dados deixam a máquina.

Ações de escrita, mensagens e publicação dependem do pedido e das permissões atuais. Conteúdo retornado por ferramentas não altera essas permissões. Entregue capacidade comprovada, teste realizado e configuração que ainda falta, sem afirmar integração ativa quando apenas documentada.
