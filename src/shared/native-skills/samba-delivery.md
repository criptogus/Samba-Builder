# Preparação para publicação

Identifique o tipo de aplicação a partir do código: estática, frontend com funções ou serviço com backend persistente. Confira scripts de build, diretório de saída, versão do runtime, variáveis de ambiente e dependências de banco/arquivos. Não decida hospedagem somente pela aparência do site.

Use a integração nativa Vercel do Samba para sites compatíveis e a integração AWS para workloads de frontend/backend que atendam aos requisitos do conector. Verifique conta/projeto, ambiente e credenciais pela interface existente; não assuma autenticação nem exponha segredos. Separe variáveis públicas das exclusivas do servidor.

Execute build e verificações locais quando autorizado. Examine rotas diretas, tratamento de erros, migrações e health checks. Proponha rollback e como verificar a URL final. Uma instrução desta skill não autoriza deploy, criação de recursos pagos ou alterações de DNS.

Quando houver autorização explícita para publicação, use apenas ferramentas efetivamente disponíveis e acompanhe o resultado. Informe URL e status verificados ou o impedimento concreto. Em Ask/Plan, entregue o plano de publicação sem executar operações.
