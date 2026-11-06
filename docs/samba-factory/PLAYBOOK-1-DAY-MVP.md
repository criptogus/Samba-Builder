# Playbook — MVP em 1 dia útil

Um humano Samba e o Builder. O relógio que importa é **plano aprovado → URL de staging**. Meta: um dia útil, com CRUD, autenticação, uma integração e deploy.

Marque o horário real ao lado de cada passo. O app grava os marcos em `samba-factory.json` (`stages`): briefing, plano aprovado, marca, scan e primeiro staging.

| Passo                       | Marco no app      | O que tem que ser verdade antes de seguir                                      |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| 0. Escolher o app do Piloto | —                 | Um cliente, um processo, sem dados de board                                    |
| 1. Briefing                 | `briefAt`         | Problema, usuário e o que fica de fora cabem no texto                          |
| 2. Plano Must/Should/Could  | —                 | JSON importado ou formulário. Must tem critério de aceite                      |
| 3. Aprovar o plano          | `planApprovedAt`  | Nome de quem aprova. O cronômetro começa aqui                                  |
| 4. Tokens de marca          | `brandApprovedAt` | Preset confirmado. Não é canvas de telas                                       |
| 5. Build                    | —                 | CRUD + auth + a integração combinada. Pedido novo passa pelo Scope Guard       |
| 6. Must concluídos          | —                 | Cada Must só vira done depois do aceite observado                              |
| 7. Scan                     | `scanAt`          | Typecheck, smoke e dependências verdes. Sem achado crítico ou alto             |
| 8. Deploy                   | `stagingAt`       | URL de staging por Vercel, Coolify ou AWS. O gate recusa se o passo 7 não vale |
| 9. Handoff                  | —                 | Botão **Gerar handoff**. O PR traz checklist, scan e artefatos                 |

Se o dia estourar, pare e escreva o post-mortem em `docs/samba-factory/postmortems/`. Não empurre o gate para "terminar hoje".

O hit-rate de 70% para abrir o Caminho 2 só conta tentativas com este playbook preenchido, não slide.
