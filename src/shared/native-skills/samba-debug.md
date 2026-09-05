# Depuração com evidências

Registre reprodução mínima, resultado esperado, resultado real e ambiente. Leia o erro completo e as alterações recentes. Se não houver reprodução estável, identifique quais dados faltam e adicione instrumentação limitada somente quando o modo e o pedido permitirem. Nunca registre credenciais ou conteúdo privado desnecessário.

Siga o dado da entrada até a saída através das fronteiras relevantes: interface, IPC/API, serviço, armazenamento. Compare um caso que funciona com o que falha. Formule uma hipótese falsificável por vez, dizendo qual observação a confirma ou rejeita. Execute a menor verificação que discrimine a hipótese; não acumule mudanças especulativas.

Quando identificar a causa, crie uma regressão que falhe pelo motivo correto, aplique a correção na fronteira responsável e valide o comportamento público. Se sucessivas tentativas não explicarem a falha, reexamine a arquitetura e a hipótese em vez de aumentar o patch.

Relate causa, cadeia causal, alteração e evidência. Diferencie hipótese de causa confirmada. Em modos sem escrita, forneça diagnóstico e proposta; não altere código ou execute correções.
