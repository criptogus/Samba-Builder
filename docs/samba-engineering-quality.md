# Engenharia e evidências de entrega

A aba Engenharia do plano de entrega mantém requisitos, vínculos com tarefas, caminhos de código versionados, execuções de teste e metas de operação. Projetos novos exigem política de engenharia; projetos legados passam a exigir quando a política é ativada. Rascunhos incompletos podem ser salvos.

A aprovação exige documentos-base revisados, critérios preenchidos, requisitos ligados a tarefas e arquivos existentes no commit, testes aprovados desse commit e a última verificação aprovada de cada categoria. Projeto privado exige requisito de autorização; crítico também exige carga e recuperação. As metas propostas são hipóteses editáveis. A seleção de um teste como evidência é responsabilidade do revisor: o sistema não infere cobertura semântica do código.

Ferramentas instaladas sob demanda, sem serviço residente:

- Secretlint: arquivos de texto atuais; não examina histórico Git. Cobertura vazia ou parcial é inconclusiva. Relatórios não incluem valores de segredos.
- OSV: versões exatas de lockfiles npm/pnpm; envia nomes e versões, não código. Formato não suportado ou falha de rede é inconclusivo.
- axe-core: página inicial da preview em desktop/mobile. Fluxos autenticados, teclado e leitores de tela exigem verificação adicional.
- Playwright: LCP/CLS de laboratório na preview, sem simulação de rede. Não equivale a métricas de produção.
- pixelmatch: comparação com imagem explicitamente aprovada. Uma diferença exige revisão; sem referência, resultado inconclusivo.

As verificações rodam uma por vez, têm cancelamento e limite de tempo de três minutos; o processo Node tem limite de heap de 512 MB (isso não limita a memória total do Chromium). A instalação baixa Chromium e dependências somente quando solicitada. Não há polling permanente. Alterações no repositório durante a execução retiram o vínculo de versão da evidência. Não são permitidas aprovações com evidência desatualizada. O orçamento de LCP/CLS é reavaliado no momento da aprovação.

## Benchmark de prompts

`quality-tools/benchmark.mjs` gera seis cenários para duas versões de prompt, registra tokens reportados, tempo e custo calculado com preços explicitamente configurados. Exige pasta vazia, bloqueia caminhos que escapem dela e não executa código gerado. A chave fica em `SAMBA_BENCHMARK_API_KEY`. Não envia dados reais de clientes.

Configuração JSON: `baseUrl`, `model`, `maxUSD`, `inputUSDPerMillion`, `outputUSDPerMillion`, `maxOutputTokens`, `arms: [{prompt: "anterior"}, {prompt: "candidata"}]`.

Executar: `node quality-tools/benchmark.mjs config.json pasta-vazia`.

Os resultados do gerador não comprovam qualidade das aplicações. Aplicar o protocolo em `docs/native-skills/quality-benchmark.md` e registrar builds, testes negativos, desempenho e revisão humana antes de comparar versões. A execução paga requer orçamento do responsável. Não há resultados A/B reais publicados nesta implementação.

## Dependências e licenças

Versões fixadas em `quality-tools/package-lock.json`: Secretlint (MIT), axe-core (MPL-2.0), Playwright (Apache-2.0), pixelmatch (ISC), pngjs (MIT), yaml (ISC). As licenças originais acompanham os pacotes instalados. A integração é original; não copia skills de terceiros.

## Distribuição

`.github/workflows/samba-quality-release.yml` verifica tipos, testes de engenharia e Electron e gera pacotes macOS/Windows. Execuções CI e assinatura precisam ser confirmadas antes de distribuir como release estável. Builds locais são pacotes de desenvolvimento sem notarização; não substituir por pacote E2E. O banco migra de forma aditiva com as migrações 0052–0054.
