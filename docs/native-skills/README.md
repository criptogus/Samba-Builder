# Skills nativas do Samba Builder

Abra Library → Prompts → Skills nativas. Busque uma tarefa, veja as instruções e copie o comando. O menu `/` do chat também lista as skills. Comece a mensagem com o comando e depois descreva o pedido:

```text
/samba-spec Quero um portal de agendamento para clínicas.
/samba-debug /samba-tdd Corrija a falha de login e comprove a correção.
/samba-design Melhore a página inicial preservando a identidade da marca.
/samba-performance Investigue o consumo de memória durante o preview.
```

As 14 opções incluem especificação, plano, depuração, TDD, revisão, segurança, design, acessibilidade, arquitetura, desempenho, documentos, MCP, vídeo e publicação. As instruções são curadas para o Samba, independentes do provedor de IA; não são instalações completas dos repositórios de referência.

## Ativação e limites

- Até 3 skills distintas no início de cada mensagem; repetições são deduplicadas. Uma quarta é rejeitada com erro visível, sem truncamento silencioso.
- Menções no meio do texto, blocos de código, citações e conteúdo de anexos/prompts salvos não ativam skills nativas.
- Os 14 slugs do catálogo são reservados. Prompts pessoais com outros slugs continuam disponíveis; um prompt pessoal com um slug idêntico deve ser renomeado.
- O histórico exibe o comando original. Só a requisição atual recebe as instruções expandidas; mensagens seguintes não recarregam a skill automaticamente.
- Ask/Plan permanecem sem escrita. A seleção não muda o modo, a lista de ferramentas, as permissões, nem autoriza publicação ou agentes extras.

## Memória e empacotamento

A interface importa apenas metadados. Cada corpo Markdown vira um chunk separado com `import.meta.glob` sem `eager`. Abrir um cartão ou ativar seu comando carrega apenas aquele conteúdo. Os módulos já utilizados podem permanecer no cache normal do JavaScript; a biblioteca inteira é pequena e não cresce com downloads.

Há um limite de 6.000 caracteres por corpo e 3 corpos por mensagem, além do pequeno envelope de orientação. Não há novas dependências, IPC, migrações, indexadores, watchers ou processos residentes. O mesmo carregamento é empacotado para main e renderer em macOS/Windows; a execução Windows precisa ser validada nessa plataforma.

## Capacidades externas

- Documentos: aproveita texto de anexos já disponível. MarkItDown não é instalado por esta entrega; formatos não legíveis precisam de conversor habilitado.
- MCP: orienta o gerenciador Plugins existente. Cada servidor precisa ser configurado e autenticado.
- Vídeo: orienta projetos Remotion. Renderizador, Chromium/FFmpeg, assets e licença aplicável continuam sendo pré-requisitos externos.
- Publicação: orienta as integrações Vercel/AWS já implementadas. Não cria recursos ou publica sem autorização.
- Claude Code e LobeHub: referências de produto, sem código ou runtime incorporado.

Veja [a análise das 17 fontes](sources.md) com revisões fixadas e decisões de licença, e [as atribuições](THIRD_PARTY_NOTICES.md).

## Manutenção

Para adicionar uma skill, inclua metadados em `src/shared/native_skills.ts` e um corpo com o mesmo slug em `src/shared/native-skills/`. O conteúdo deve ser autossuficiente, mencionar somente capacidades reais e respeitar os modos. Atualize fontes e avisos conforme o material incorporado. Não introduza downloads ou scripts executáveis no catálogo.

Valide limites/carregamento, biblioteca, requisição real ao servidor simulado e o pacote Electron. Não use o resultado do LLM como prova de que uma ferramenta externa está instalada.
