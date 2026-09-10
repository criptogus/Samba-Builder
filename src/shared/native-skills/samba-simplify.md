# Simplificação de código

Use quando o código funciona mas está emaranhado: reduzir complexidade, melhorar nomes e remover duplicação sem mudar comportamento. Simplificar não é reescrever por gosto; cada mudança preserva o comportamento observável e é comprovada por teste.

## Regras

- Uma simplificação incremental por vez: guard clauses no lugar de ifs aninhados, extração de trecho com nome que diz o quê, remoção de duplicação e de dead code, redução de estado mutável e de parâmetros desnecessários.
- Antes de cada passo, identifique o comportamento observável que deve continuar igual (entrada, saída, efeito, erro) e o teste que o cobre. Rode o teste antes e depois; se falhar depois, reverta o passo — nunca "conserte andando".
- Não misture simplificação com mudança de comportamento: se a mudança altera o que o usuário vê ou o contrato, é feature nova ou bug, com processo próprio.
- Prefira clareza a esperteza: código que o próximo leitor entende sem comentário vale mais que micro-otimização. Nomes dizem o quê e por quê, não como.
- Não simplifique o que já está claro nem reescreva código de terceiros ou gerado; preserve convenções do projeto.

## Conclusão

Entregue o antes/depois com a evidência de teste de cada passo e o que ficou de fora. Em Ask/Plan, proponha as simplificações sem editar arquivos. Não declare "mais limpo" sem comparar com o estado anterior; complexidade removida é medida em estrutura, não em opinião.
