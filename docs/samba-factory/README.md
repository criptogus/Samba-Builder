# Samba Factory — implementação local

A Fábrica adiciona ao Samba Builder um fluxo de cliente → briefing → plano aprovado → tokens → execução → verificação → handoff. O editor, os provedores, o runtime e as integrações continuam sendo os do fork Dyad. O código novo está fora de `src/pro`.

Esta entrega implementa a fundação funcional do PRD; não representa a conclusão de todos os itens de 90/180 dias. O [PRD original](./PRD-original.md) é o material fornecido pelo solicitante, não uma validação independente das afirmações sobre concorrentes.

## Usar

1. Execute o Builder com Node 24: `npm ci`, `npm run init-precommit`, `npm start`.
2. Crie ou importe um aplicativo pela tela Apps. Abra **Fábrica** na barra lateral e associe o aplicativo a um cliente. Apps importados entram no modo Ask.
3. Salve briefing e conhecimento do projeto. Discovery abre uma conversa de leitura com o contexto e o skill adequados.
4. Em Plano, use o agente para propor o JSON, importe-o para revisão ou preencha o formulário. Salve e aprove com o nome do responsável.
5. Em Design, escolha e personalize os tokens. Confirme com o nome do responsável. São três presets de tokens, não um canvas de telas geradas.
6. Abra Build/Fix no Studio para implementar. Os demais modos usam leitura. Novos pedidos devem ser registrados e classificados no Scope Guard.
7. Marque tarefas concluídas após verificar o aceite. Configure scripts `typecheck` (ou `ts`) e `test:smoke` reais e não interativos no app cliente.
8. Exporte o handoff, execute a verificação e revise os bloqueios em Entrega. O scan executa scripts do projeto na máquina local e consulta o registry npm. Código alterado depois do scan exige nova execução. Exportar documentos pela primeira vez também pode alterar o digest: exporte antes da verificação final.
9. Use as integrações existentes de GitHub e deploy. O Builder revalida o gate no Git push nativo, na criação de projeto Vercel e na solicitação de deploy Coolify. Esta integração não controla deploys executados fora do Builder ou por ferramentas externas/MCP.

## Comportamentos implementados

- Portfólio persistente, filtro por cliente/projeto, aplicação vinculada a um único cliente, status de aprovação e histórico local.
- Plano estruturado Must/Should/Could com critérios de aceite, importação JSON, edição, revisão e acompanhamento de tarefas.
- Mudança de briefing ou plano revoga aprovação. Scan revogado ao alterar briefing, plano ou tokens. Alterações de conteúdo após scan são detectadas por SHA-256.
- Build e Fix bloqueados no processo principal sem plano e marca aprovados ou com pedidos pendentes. Uma conversa comum não contorna esse gate. Modos de leitura não recebem permissão de escrita por causa dos skills.
- Referências `@app` rejeitadas para projetos geridos, inclusive referência a um cliente gerido partindo de app não gerido. O contexto de fábrica injetado contém apenas o projeto atual.
- Oito skills P0 embutidos, versionados em Git e roteados por modo. O conteúdo do cliente é delimitado como dado não confiável no prompt.
- Scan heurístico: formatos conhecidos de credenciais, variáveis públicas de secrets, CORS wildcard, tabelas sem RLS nas migrations, desativação de RLS, políticas incondicionais e HTML direto. Resultados não incluem os valores de credenciais.
- Release bloqueado em crítico/alto, scan parcial/desatualizado, auditoria npm indisponível ou com alta/crítica, typecheck/smoke ausente ou falho e Must pendente. Não há waiver nesta versão.
- Exportação de oito artefatos em `docs/` e `samba/`, por escrita atômica e caminhos permitidos. Diretórios e destinos simbólicos são recusados.
- Aprovações e evidências autoritativas em `userData/samba-factory.json`, independente dos arquivos editáveis pelo agente. Revisão otimista impede sobrescrita por janela desatualizada. Arquivo corrompido falha fechado.

## Fronteiras e trabalho restante

| Requisito do PRD                                      | Estado nesta entrega                                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pipeline local, planos, marca, skills, scan e handoff | Implementado e conectado ao Electron                                                                                   |
| Planejamento com IA                                   | Conversa com skill + importação de JSON pelo operador; não há captura automática da resposta                           |
| Scope Guard                                           | Registro e classificação explícitos; não classifica semanticamente cada prompt de forma automática                     |
| Canvas e marca                                        | Presets e edição de tokens; Figma/logo ingest, variantes de telas e QA visual automático ainda pendentes               |
| Security Agent                                        | Prompt de revisão + scan básico; Semgrep, deep scan, validação do banco remoto, LGPD e waiver autenticado pendentes    |
| RBAC/isolamento de equipe                             | Identidade declarada pelo operador local; sem SSO/RBAC, cofre por cliente, sync ou auditoria inviolável                |
| Publicação protegida                                  | Gate nas entradas descritas; não cobre comandos externos, MCP ou todos os possíveis provedores de deploy               |
| Client preview                                        | Integrações de deploy herdadas; magic link, comentários pinados e proteção do staging ainda pendentes                  |
| Scaffold portal B2B e catálogo de capabilities        | Pendente; o agente utiliza o template/stack existente do aplicativo                                                    |
| Orquestração e custos                                 | Recursos já existentes do runtime; não há novo roteamento de modelos, orçamento ou paralelismo independente de src/pro |
| PR e handoff                                          | Documentos exportáveis e Git herdado; criação automática de PR com screenshots/owners ainda pendente                   |

O scan local não comprova que um banco remoto está protegido, que um teste é relevante ou que uma aplicação não tem vulnerabilidades. Em especial, o nome do aprovador é uma declaração local, não autenticação AppSec. O arquivo autoritativo protege contra edição acidental pelo agente no projeto, não contra um operador com acesso ao sistema operacional.

## Estrutura

- `packages/samba-factory/src/`: schemas, política, scanner puro, skills e artefatos.
- `skills/`: pacotes P0 e tabela de roteamento.
- `src/ipc/services/factory/`: armazenamento, arquivos, verificação e gates.
- `src/ipc/types/factory.ts`: contrato IPC validado por Zod, cliente e tipos.
- `src/ipc/handlers/factory_handlers.ts`: operações coordenadas por aplicativo.
- `src/components/factory/`: interface e testes de interação.
- `e2e-tests/samba_factory.spec.ts`: fluxo no aplicativo empacotado com fixture sintética e screenshots.

## Verificar

```sh
npm run ts
npm run lint
npm test -- src/__tests__/factory src/components/factory/FactoryPage.test.tsx src/ipc/preload/channels.test.ts
npm run build
PLAYWRIGHT_HTML_OPEN=never npm run e2e -- samba_factory.spec.ts
```

O build de E2E é um pacote de teste, sem assinatura de distribuição e com configuração de serviços simulados. Não deve ser enviado a clientes como instalador de produção.
