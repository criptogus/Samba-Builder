# Controle de Escopo (Scope Guard)

Escopo é decisão de produto com custo técnico explícito — não deixe o escopo crescer sem registrar o impacto.

## Ao aceitar/estender escopo

Registre sempre: o que entra, o que fica fora da versão, o impacto técnico (módulos tocados, contratos, migrations), o impacto em segurança, o custo de manutenção (complexidade adicionada, dívida) e as métricas que justificam. Mudança que atravessa mais de um domínio exige declarar impactos, contratos e plano de migração antes de implementar (ver /samba-architecture).

## Regras

- Perguntas e ideias fora do pedido viram **backlog registrado**, não trabalho silencioso.
- Feature creep detectado → pare e apresente a decisão com o custo, não implemente.
- Escopo fora da versão fica explícito no PRD — "não fazemos isto agora" é uma decisão, não uma omissão.
- Toda mudança de escopo relevante atualiza o PRD e a matriz requisito→evidência (ver /samba-quality-engineering).
- Backlog técnico (dívida, melhorias de manutenção) é separado do backlog de produto.
