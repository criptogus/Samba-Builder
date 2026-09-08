# Como avaliar a qualidade das aplicações geradas

Status: protocolo de avaliação, ainda sem resultados de geração A/B. Testes de montagem de prompts, modo e contexto não medem beleza, segurança ou velocidade de um aplicativo gerado. Não existe aqui uma afirmação de que um modelo ou conjunto de skills seja “o melhor”.

## Comparação controlada

Escolher versão anterior e candidata dos prompts, o mesmo modelo/provedor, configurações, template, briefing e ferramentas. Fixar versões/commits e registrar plataforma. Usar dados demonstrativos e serviços simulados para não criar recursos pagos ou enviar dados de clientes. Não mudar simultaneamente modelo, prompt e template.

Começar pelos três cenários de maior valor para a equipe; repetir os casos com resultados inconsistentes. Salvar prompt de entrada, versão das instruções, commit gerado, comandos/resultados, screenshots e limitações. Comparar sem revelar qual versão produziu a interface quando houver revisão humana de design. Nunca preencher uma nota a partir de um resultado não observado.

## Casos

| Cenário                             | Aceite funcional                                                      | Segurança                                                                                       | Experiência e desempenho                                                                           |
| ----------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Site público de serviço, sem conta  | Navegação e contato têm resultado; não há backend/login desnecessário | Nenhum segredo no cliente; links e conteúdo tratados corretamente                               | Identidade específica, mobile, leitura e mídia estável; medir carregamento                         |
| Portal de clientes por organização  | Cada cliente vê e altera somente seus recursos                        | Testar usuário A/B, papel sem privilégio e chamada direta à API; falha deve ocorrer no servidor | Dados longos, vazio/erro, teclado; consultas limitadas e caches isolados                           |
| Agenda com disputa de horário       | Duas solicitações simultâneas não confirmam o mesmo horário           | Validação e autorização no servidor; operação repetida não duplica efeito                       | Recuperação preserva dados e oferece alternativa; teste concorrente determinístico                 |
| Confirmação de pagamento simulada   | Webhook válido aplica uma transição; repetição não duplica efeito     | Assinatura inválida não altera estado; sem confiança no status do navegador                     | Retorno pendente/recusado claro; testes locais sem cobrança real                                   |
| Painel com conjunto grande de dados | Busca, filtros e paginação preservam consistência                     | Filtros não escapam do tenant; nenhuma informação privada em cache global                       | Volume documentado, carregamento sob demanda, sem crescimento contínuo após navegar/voltar         |
| Refatoração visual de app existente | Mesma jornada e integrações; critérios anteriores continuam passando  | Nenhuma remoção de controle para simplificar UI                                                 | Preserva marca e tokens, reduz inconsistência, melhora teclado/responsividade com evidência visual |

## Registro por execução

- Identificadores: caso, versão dos prompts/skills, modelo, provedor, configuração, template e commit.
- Funcionalidade: critérios atendidos/total, falhas e evidências reais.
- Segurança: controles exercitados, testes negativos, achados e áreas não examinadas. Não converter “nenhum achado” em “seguro”.
- Design: revisão humana de hierarquia, identidade, clareza da tarefa, conteúdo, estados e consistência; anexar screenshots desktop/mobile e limitações.
- Desempenho: cenário, dispositivo, volume, rede, ferramentas e medidas observadas. Não comparar métricas de laboratório com dados reais como se fossem equivalentes.
- Custo: minutos de trabalho apontados, tokens capturados por modelo e estimativa de custo. O painel de gestão do Samba pode registrar isso por sprint; sua cobertura de tokens não inclui CLIs externas, compactação nem histórico anterior.
- Retrabalho: falhas até a primeira jornada correta e alterações necessárias após revisão. Linhas de código e quantidade de ferramentas chamadas não são notas de qualidade.

A candidata só demonstra melhora no que foi medido. Um ganho visual não compensa regressão de autorização ou perda de dados. Antes de generalizar, ampliar a amostra com projetos reais autorizados e modelos efetivamente usados pela equipe.
