# Playbook — Assessment e Piloto viram app

O funil ZA entra na fábrica como texto e plano. Dados de board e seats fiduciários (S7) não entram no Builder.

## Assessment (S3) → briefing

1. Do relatório, copie só o processo que o Piloto vai operar: quem faz, o que dói, o que fica de fora.
2. Na Fábrica, cadastre o app no cliente e salve o briefing. Conhecimento do projeto recebe restrições (sistemas, dados que não podem aparecer, integração única).
3. Se o Assessment lista mais de um processo, escolha um. O segundo vira pedido Should, não um segundo Must escondido.

## Piloto (S4) → plano Must/Should/Could

1. Importe [templates/assessment-follow-up.plan.json](./templates/assessment-follow-up.plan.json) na tela Plano, ou use-o como molde.
2. Troque os textos genéricos pelo processo do Assessment. Cada Must precisa de um critério que alguém observa sem o autor.
3. Should é desejo. Could é ideia. Nenhum dos dois vira Must sem aceite registrado no Scope Guard.
4. Aprove o plano com o nome de quem responde pelo Piloto. Sem esse nome o gate não abre build.

## O que o template já exige

- CRUD do registro principal
- Autenticação em que um usuário não vê o dado do outro
- Uma integração nomeada
- Staging só com gate verde
- Melhorias fora do Piloto em Should

## BaaS (S6)

BaaS começa depois do handoff, não dentro deste plano. O pull request de handoff é a entrada: checklist, scan e artefatos. Operação recorrente não mistura dado de outro cliente no mesmo projeto da Fábrica.
