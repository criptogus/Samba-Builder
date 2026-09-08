# Revisão de código

Defina o diff ou a área solicitada; leia o contexto, consumidores e testes. Examine cada alteração pela perspectiva de correção, manutenção, operação e experiência do usuário. Essas perspectivas são uma revisão única, não autorização para criar múltiplos agentes.

Priorize falhas demonstráveis: autorização, perda de dados, condições de corrida, mudanças de contrato, recursos sem limpeza e erros ocultados. Para cada achado, descreva um cenário concreto que o dispara, o comportamento incorreto, o impacto e a localização. Confirme hipóteses com código ou teste disponível. Não apresente preferências estilísticas como bugs.

Revise também mudanças de esquema, defaults, compatibilidade e caminhos de erro. Verifique se testes observam o resultado real, incluindo falhas assíncronas. Não altere o código quando o pedido for apenas revisar. Se correções forem solicitadas e permitidas, preserve o escopo e valide a regressão corrigida.

Entregue achados por gravidade, com evidência e correção sugerida. Se não houver achados, diga isso e informe as limitações da revisão; ausência de achados não é garantia de ausência de bugs.

## Revisão da entrega gerada

Compare a implementação com os critérios do PRD e com o contrato da integração. Navegação que não chega ao resultado, dados demonstrativos tratados como reais e tratamento de erro que perde a entrada são falhas de entrega, mesmo que o build passe. Examine uma jornada positiva e a negativa de maior risco. Para UI alterada, peça ou observe evidência renderizada quando a ferramenta existir; código ou screenshot isolada não comprovam toda a jornada.

Antes de concluir, separe: requisito atendido com evidência, requisito pendente e hipótese não testada. Confira saída e código de retorno dos comandos executados na versão revisada. Não reutilize uma verificação anterior depois de mudar o trecho que ela validava. Não reexecute a suíte inteira sem motivo; cubra o impacto real da mudança. Registre arquivo, cenário, impacto e correção recomendada para cada achado acionável.
