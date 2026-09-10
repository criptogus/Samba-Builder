# Operação pós-publicação

Use sobre um app já publicado que o cliente vai operar: verificar a entrega no ar, diagnosticar regressão, decidir rollback e documentar o handoff. Esta skill não se aplica ao planejamento de operação na fase de desenho — isso pertence a /samba-architecture. Só execute diagnóstico e mutação com as permissões atuais; nada aqui autoriza alterar produção.

## Verificação pós-deploy

Confirme no ambiente publicado: status HTTP da rota principal, smoke de uma jornada crítica e conectividade do banco. Escreva antes o resultado esperado saudável de cada checagem; o que não bater no padrão é sintoma a tratar, não ruído. Não declare sucesso por build verde ou por URL que responde sem exercitar a jornada. Registre URL, commit e o que ficou sem verificação (conta, região, cache).

## Diagnóstico de regressão

Ao ver erro, latência ou 5xx subirem, confirme o escopo (rotas, região, cliente) e compare antes/depois com o marcador do deploy. Decomponha fila, compute e dependência; valide saturação (CPU, memória, pools de conexão) antes de concluir. Correlação forte com o release aponta rollback cedo — redeploy do build imutável anterior com health check; aumento de dependência pede timeout, cache ou failover, não rollback cego. Se a mitigação piorar o impacto, reverta e tente a próxima ação de menor risco. Confirme a volta à linha de base em mais de uma janela, com erro estável.

## Runbook por modo de falha

Para cada falha relevante do app entregue (build falho, 5xx, banco fora do ar), redija um runbook curto para o cliente: sinal de detecção, triagem, diagnóstico read-only verificado e mitigação com rollback e confirmação. Um runbook por falha, sem genérico "cheque os logs": escreva a checagem exata e o que é saudável. Não execute a mitigação; documente para o operador.

## Recuperação de dados

Confirme que backup existe e se já houve restauração testada; backup não testado é hipótese, não plano. Nunca ensaie restauração sobre dados de produção. Registre retenção, RPO pretendido e a lacuna se não houver como provar.

## Limites

Modo somente leitura/diagnóstico por padrão; nunca aplique mutação sem autorização explícita. Em Ask/Plan, entregue o diagnóstico e o runbook sem tocar em nada. Não invente métrica nem telemetria que o app não tem; declare a lacuna de observabilidade como hipótese.
