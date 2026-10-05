# Caminhos de publish

Projeto fora da Fábrica não passa por este gate. Projeto cadastrado falha fechado, sem waiver, quando o plano não está aprovado, a marca não está confirmada, há Must aberto ou o scan não está verde.

| Caminho                                     | O que acontece                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Git push nativo, do agente e automático     | Gate antes do `git push`                                                                               |
| Criar projeto Vercel                        | Gate antes do primeiro deploy                                                                          |
| Deploy Vercel (preview e production)        | Gate. Production ainda exige a entrega aprovada                                                        |
| Deploy Coolify                              | Gate antes de pedir o deploy                                                                           |
| Deploy AWS                                  | Gate antes do deploy                                                                                   |
| Função Supabase publicada pelo agente       | Gate. Empacotar localmente (`bundleOnly`) não publica                                                  |
| Comando do agente classificado como publish | Gate, mesmo se a pessoa autorizar o comando. Autorizar não é waiver                                    |
| Ferramenta MCP com nome de deploy/publish   | Gate, antes do consentimento. Leitura (`list`, `get`, `status`) não publica                            |
| Terminal interativo                         | Residual. Não é caminho de publicação de projeto da Fábrica. Quem precisa publicar usa os botões acima |

Consentimento do usuário em um comando irreversível continua existindo para apps fora da Fábrica. Dentro da Fábrica, consentimento não abre o gate.
