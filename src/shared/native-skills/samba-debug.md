# Depuração com evidências

Registre reprodução mínima, resultado esperado, resultado real e ambiente. Leia o erro completo e as alterações recentes. Se não houver reprodução estável, identifique quais dados faltam e adicione instrumentação limitada somente quando o modo e o pedido permitirem. Nunca registre credenciais ou conteúdo privado desnecessário.

Siga o dado da entrada até a saída através das fronteiras relevantes: interface, IPC/API, serviço, armazenamento. Compare um caso que funciona com o que falha. Formule uma hipótese falsificável por vez, dizendo qual observação a confirma ou rejeita. Execute a menor verificação que discrimine a hipótese; não acumule mudanças especulativas.

Receber sugestão de causa não é concordar: leia tudo, reafirme a exigência técnica com suas palavras, verifique na base de código real e avalie se a sugestão é válida neste app; responda com reconhecimento técnico ou pushback com razão. Implemente uma sugestão por vez e teste cada uma; correção sem verificação é ruído.

Quando identificar a causa, crie uma regressão que falhe pelo motivo correto, aplique a correção na fronteira responsável e valide o comportamento público. Após corrigir, faça re-revisão escopada da rodada de fix, não nova investigação: para cada causa achada, confirme que a correção a endereça; inspecione o diff do próprio fix por quebra nova; o teste do sintoma original passa e a suíte não regrediu. Se sucessivas tentativas não explicarem a falha, reexamine a arquitetura e a hipótese em vez de aumentar o patch.

Feche todo bug com um recibo: status VERIFIED, PARTIAL ou BLOCKED; Problem (defeito observado e comportamento desejado); Baseline (interação que falhou e resultado); Root cause (mecanismo provado ou hipótese não provada); Change; Proof (checagem executada, cada camada decisiva); Gaps. Concisão encurta campos, nunca os remove. Relate causa, cadeia causal, alteração e evidência. Diferencie hipótese de causa confirmada. Em modos sem escrita, forneça diagnóstico e proposta; não altere código ou execute correções.
