# Publicação nativa: Vercel e AWS

No projeto aberto, acesse **Publish / Publicar aplicação**. Os provedores aparecem como alternativas. A opção de servidor próprio/Coolify continua disponível quando habilitada nas configurações.

## Vercel — sites simples

1. Conecte sua conta Vercel na integração existente do Samba e conecte o repositório GitHub do projeto.
2. Crie ou vincule um projeto Vercel.
3. Envie as alterações ao GitHub. Os novos botões publicam a branch remota vinculada; não fazem push do diretório local.
4. Escolha **Preview para testar** ou **Produção — site público** e clique no botão correspondente. Preview é o padrão do novo controle.
5. Consulte a lista de deployments existente para acompanhar o build. A URL retornada no início não significa que o build já terminou.

O comando nativo usa a equipe e o projeto vinculados. A integração anterior de criação do projeto é preservada, incluindo seu primeiro deploy automático. A API aceita publicação a partir de uma referência Git: [Vercel — deployments](https://vercel.com/docs/deployments/overview).

## AWS — aplicação com frontend e backend

A implementação publica uma aplicação HTTP sem estado: o Dockerfile compila o frontend e inicia o backend, que também pode servir os arquivos do frontend. Os dois ficam no mesmo container. Linguagens e frameworks são definidos pelo Dockerfile; esta versão não cria dois serviços independentes nem provisiona banco de dados.

O destino é **ECR + ECS Express Mode/Fargate**. Express Mode administra balanceador, HTTPS e escala. A AWS cobra pelos recursos subjacentes; não há uma estimativa fixa de mensalidade no Samba. [Arquitetura e cobrança do ECS Express Mode](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html).

### Preparação da conta

- Instale uma versão recente do AWS CLI v2 que reconheça `ecs create-express-gateway-service` e autentique um perfil, preferencialmente via IAM Identity Center/SSO.
- Instale e inicie Docker Desktop. O conector usa o daemon local; contextos remotos não são suportados nesta versão.
- Use uma região comercial da AWS com ECS/Fargate e VPC padrão com sub-redes públicas.
- Prepare uma role de execução ECS e uma role de infraestrutura do Express Mode. O guia oficial fornece as relações de confiança e as policies `AmazonECSTaskExecutionRolePolicy` e `AmazonECSInfrastructureRoleforExpressGatewayServices`. O principal que publica precisa de acesso ao ECR/ECS e `iam:PassRole` nas roles aprovadas. Segredos exigem permissões adicionais na role de execução. [Preparação oficial das roles e rede](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-getting-started.html).

O Samba utiliza essas permissões existentes; não cria usuários IAM nem roles administrativas. Não é necessário colar access keys no aplicativo.

### Preparação do projeto

Adicione um `Dockerfile` à raiz. O processo deve ouvir em `0.0.0.0`, na porta informada no formulário. A rota de saúde precisa responder HTTP 200. Use um banco externo e armazenamento persistente externo; o filesystem do container não substitui um banco persistente.

Um projeto Node que tenha `package-lock.json`, script `build` opcional e script `start` de produção pode usar este ponto de partida, ajustando-o à sua aplicação:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --if-present
RUN npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
```

Para projetos apenas Vite, `npm start` normalmente não é um servidor de produção. Use a Vercel para o site simples ou configure seu backend para servir o frontend compilado.

### Publicação e atualização

1. Informe perfil, região, nome do serviço, ARNs das roles, porta e rota de saúde.
2. Opcionalmente informe referências de Secrets Manager/SSM na lista JSON. Exemplo: `[{"name":"DATABASE_URL","valueFrom":"arn:aws:secretsmanager:us-east-1:123456789012:secret:database-AbCdEf"}]`. Os valores secretos não são copiados para o Samba.
3. Clique em **Revisar publicação AWS**. O aplicativo verifica a identidade AWS, Docker e o contexto do projeto.
4. Confira a conta, região e aviso dos recursos cobrados. Clique em **Publicar nesta conta AWS** para iniciar.
5. O Samba cria/reutiliza `samba/<nome-do-serviço>` no ECR, compila uma imagem `linux/amd64`, envia-a e cria ou atualiza o serviço ECS.
6. Use **Consultar status AWS** para acompanhar a disponibilidade e abrir o endereço retornado pelo provedor. O console AWS mantém logs e detalhes dos recursos.

Esta versão usa 0,25 vCPU / 512 MiB por tarefa e escala de 1 a 2 tarefas. Para cargas maiores, ajuste a implementação/configuração antes de publicar; uma nova publicação pelo Samba reaplica esses valores. Nome, conta, região e role de infraestrutura de um serviço já vinculado são preservados. Recursos não são apagados ao fechar o aplicativo. Para desativar um site e interromper seus custos, administre serviço, imagens e recursos associados no console AWS.

### Memória e tratamento dos arquivos

As ferramentas AWS/Docker só são chamadas por ações de revisão/publicação/status; abrir outra aba não inicializa um cliente pesado ou processo residente. Apenas um build AWS ocorre por vez. A leitura do projeto é limitada por arquivo e pelo total, sem guardar o código inteiro em memória.

O build recebe uma cópia isolada que respeita `.gitignore`, exclui `.env*`, chaves comuns, configurações de credenciais, dependências e caches, e rejeita links simbólicos. O hash dos arquivos é verificado novamente antes da publicação. Há limites de 10 mil arquivos, 200 MB totais e 20 MB por arquivo. A autenticação ECR fica em configuração temporária restrita, removida no encerramento normal da operação; não aparece nos argumentos ou retornos IPC. O container local recebe uma tag única, removida ao final; caches de build são gerenciados pelo Docker.

## Validação realizada

25 testes de serviço, interface e contratos passaram. A checagem de tipos e o lint passaram (três avisos preexistentes). Um teste E2E no Electron empacotado confirmou as duas opções de publicação, o carregamento da conexão AWS e a exigência de revisão antes do envio. As chamadas AWS/Vercel de criação foram simuladas nos testes: nenhum serviço pago foi criado e nenhum site real foi publicado durante a implementação.

A execução e compilação local foram realizadas no Mac ARM64. Os argumentos nativos Windows têm teste automatizado; a publicação real em contas Vercel/AWS e a execução nativa Windows ainda precisam de validação com credenciais e infraestrutura apropriadas.
