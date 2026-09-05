# Samba Skills OS — v1

Os oito skills P0 são embutidos no aplicativo por Vite e roteados por `packages/samba-factory/src/skills.ts`. Pacotes são Apache-2.0 e independentes de src/pro. Cada mudança de comportamento exige versão e eval.

| Modo     | Skills                                   |
| -------- | ---------------------------------------- |
| Discover | discovery                                |
| Plan     | prd, scope-guard                         |
| Design   | samba-ds                                 |
| Build    | stack-samba, samba-ds, secrets           |
| Fix      | stack-samba, secrets                     |
| Secure   | threat-model, secrets                    |
| Review   | handoff, threat-model                    |
| Ask      | contexto do cliente, sem skill adicional |

Conteúdo do cliente é dado não confiável. Um skill nunca concede acesso, aprovação comercial ou autorização de publicação. Knowledge e artefatos no projeto não substituem os gates do processo principal.
