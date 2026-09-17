# Git workflow

Regras de git **deste** repositório. Para o contexto geral do projeto, veja `AGENTS.md`.

## O repositório é o produto

`origin` é `criptogus/Samba-Builder` (privado) — o produto, não um fork de trabalho.

- O remote `upstream` existe apenas como histórico. **Não** faça fetch de PRs dele, não abra PR contra ele e não empurre nada para lá (nem para qualquer repositório do projeto original).
- Não existe fluxo de "PR do fork para o upstream" aqui. Trabalhe direto na `main` deste repositório.

## Fluxo

```sh
git fetch origin
git push origin HEAD:main
```

Se o push for rejeitado, o remoto andou (outros agentes commitam aqui o dia inteiro, inclusive em paralelo):

```sh
git fetch origin && git merge origin/main   # resolva os conflitos e commite o merge
git push origin HEAD:main
```

Não use `--force` nem `--force-with-lease` em `main`: a resolução é sempre integrar, nunca sobrescrever.

## Identidade e commit

- Commits neste repositório usam `Gustavo Caetano <git@sambatech.com>`.
- Rode os checks antes de commitar (ver `AGENTS.md` → Pre-commit checks): `npm run presubmit`, `npm run ts` e os testes da área tocada.
- Nunca commite `.claude/tmp/` nem arquivos de rascunho; limpe antes.
- **Nunca** coloque token do GitHub em URL de remote (`https://<token>@github.com/...`): fica em texto puro no `.git/config` do usuário e vaza em mensagens de erro do git. O código de rede do app já injeta credencial por invocação (`getGitNetworkEnv` em `src/ipc/utils/git_utils.ts`); qualquer comando git novo que acesse a rede precisa passar por ele.

## Worktrees

Para validar algo sem sujar o diretório principal, use um worktree de `origin/main`:

```sh
git worktree add /tmp/sb-check origin/main
ln -s "$PWD/node_modules" /tmp/sb-check/node_modules          # e também em testing/fake-llm-server/
```

Um worktree novo precisa de dependências: o symlink do `node_modules` (e de `testing/fake-llm-server/node_modules`) resolve sem reinstalar. O `.gitignore` precisa listar `node_modules` **sem** barra no final para o symlink funcionar.

## Quando o `gh` falha

- Se `gh auth status` funciona mas o `git push` falha com `could not read Username`, rode `gh auth setup-git` e tente de novo.
- `gh` resolve o repositório pelo remote configurado: neste projeto, confirme com `gh repo view --json nameWithOwner`. Se ele responder o projeto original, o default está errado — conserte com `gh repo set-default criptogus/Samba-Builder` antes de qualquer comando que escreva (releases, workflows, PRs).
