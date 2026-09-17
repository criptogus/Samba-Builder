# Roadmap 90 dias — Samba Builder como fábrica interna (Caminho 1)

**Status:** aprovado produto (Gustavo / Mike Ross PM) · 2026-09-17  
**Repo:** `criptogus/Samba-Builder`  
**Audiência deste doc:** agentes/Cursor implementando — trate como spec executável, não ensaio.

## 1. Decisão de produto (não negociar neste ciclo)

Samba Builder é a **fábrica interna da Samba** para entregar apps de clientes com gates (briefing → plano → marca → build → secure → handoff).

| É | Não é |
|---|---|
| SO operacional da software house Samba | Produto consumer tipo Lovable/Bolt/v0 |
| BYOK, local-first, código em GitHub normal | Marketplace / créditos / onboarding first-hour "não técnico" |
| COGS da Samba + funil ZA (S3→S4→S6) | SKU vendido ao público neste ciclo |
| Porta futura a white-label B2B (Caminho 2) | Abrir Caminho 2 antes dos critérios da §7 |

**ICP:** consultor/dev Samba (Mac/Windows).  
**Não-ICP neste ciclo:** founder solo vibe-coding; cliente final usando o Builder.

Relação comercial Zero Agency: Gustavo vende/patrocina Assessment (S3), Piloto (S4), BaaS (S6); Samba executa no Builder. Seats fiduciários (S7) e dados de board **nunca** entram no Builder.

## 2. Definição de pronto do ciclo (90 dias)

O ciclo só "passa" se **todos** forem verdadeiros:

1. **≤ 1 dia útil** briefing → URL de staging em projeto real (CRUD + auth + 1 integração + deploy), com 1 humano Samba + Builder — medido e post-mortem interno.
2. **0** URL/staging de cliente sem Plan aprovado + Security Gate verde (nas entradas do Builder e sem bypass trivial).
3. Handoff **cliente-ready**: PR + artefatos exportados + checklist de aceite; próximo dev opera sem WhatsApp.
4. `PRODUCT.md` descreve ICP software house / fábrica (não voz Lovable first-hour).
5. Política de distribuição clara: builds **assinados** **ou** "somente consultores Samba" até assinar (nunca ZIP cru como entrega a cliente final).

## 3. Métricas semanais (implementar telemetria leve ou planilha operacional)

| # | Métrica | Alvo direção |
|---|---------|--------------|
| 1 | Projetos Factory ativos | Contagem |
| 2 | Tempo briefing → primeiro preview | ↓ |
| 3 | Tempo plan aprovado → staging URL | ≤ 1 dia no piloto |
| 4 | % publishes com gate verde | → 100% nas entradas cobertas |
| 5 | Achados security abertos / projeto | ↓ |
| 6 | Escopo creep (Should/Could → Must sem aceite) | → 0 |

## 4. Épicos P0 (implementar nesta ordem)

### E1 — Tapar bypass de publish / Security Gate

**Problema:** gate existe nas entradas nativas (Git push, Vercel create, Coolify deploy); deploys/MCP/comandos externos podem furar.

**Fazer:**
- Inventário de todos os caminhos de publish/deploy no app (nativos + MCP + scripts).
- Para cada caminho: aplicar o mesmo gate (Plan aprovado + marca + scan verde + Must fechados) **ou** bloquear com mensagem clara + doc.
- Testes: tentativa de publish sem plan/scan deve falhar fechado.
- Sem waiver autenticado neste ciclo (já é regra da fábrica atual — manter).

**Done quando:** matriz "caminho → gate?" documentada em `docs/samba-factory/` + testes cobrindo pelo menos os 3 caminhos mais usados + 1 caminho MCP/externo bloqueado ou gated.

### E2 — Handoff one-click (cliente-ready)

**Problema:** export de artefatos existe; falta o pacote "PR + evidências + checklist de aceite" sem babysitting.

**Fazer:**
- Fluxo único na UI Entrega: "Gerar handoff" que (a) garante exports atuais, (b) abre/atualiza PR no repo do app com corpo padronizado, (c) anexa/linka evidências de scan + runbook, (d) checklist de aceite do cliente (markdown).
- Template de PR em pt-BR (Samba).
- Não inventar hosting novo; usar GitHub já integrado.

**Done quando:** em projeto fixture/e2e, um operador gera handoff e o PR contém links/artefatos + checklist sem passos manuais extras além de "criar PR".

### E3 — Cronômetro 1-dia (prova operacional)

**Problema:** tese não medida.

**Fazer (produto + ops):**
- Playbook em `docs/samba-factory/PLAYBOOK-1-DAY-MVP.md`: passos cronometrados (briefing → plan → tokens → build → scan → deploy).
- Instrumentação mínima: timestamps por estágio no `samba-factory.json` ou log exportável (não precisa analytics cloud).
- Rodar **um** projeto real Samba (escolhido pelo time) e gravar post-mortem `docs/samba-factory/postmortems/YYYY-MM-DD-1day.md`.

**Done quando:** playbook + campos de tempo no estado da fábrica + post-mortem do piloto (bateu / não bateu / bloqueios de produto).

### E4 — Alinhar PRODUCT.md + copy da Fábrica ao ICP

**Problema:** `PRODUCT.md` ainda descreve builder não-técnico estilo Lovable.

**Fazer:**
- Reescrever `PRODUCT.md`: Users / Purpose / Principles para fábrica Samba (local-first + gates + handoff).
- Revisar strings visíveis da Fábrica que soem "consumer vibe-coder".
- Atualizar `docs/samba-factory/README.md` com link para este roadmap e status Caminho 1.

**Done quando:** `PRODUCT.md` e README da fábrica consistentes com §1; sem contradição "first-hour Lovable" vs "software house".

### E5 — Distribuição: assinar builds ou trava de política

**Problema:** releases beta não assinados (xattr / "Executar assim mesmo").

**Fazer (escolher uma trilha e documentar):**
- **Trilha A:** assinar macOS (+ Windows se viável) no pipeline de release; ou
- **Trilha B:** README + release notes: "somente consultores Samba; não distribuir a cliente final" até A.

**Done quando:** Trilha A em release notes "signed" **ou** Trilha B explícita no README/RELEASING com checklist de quem pode instalar.

### E6 — Playbook S3 → app (Assessment / Piloto)

**Problema:** funil ZA Assessment→Piloto não tem template Factory.

**Fazer:**
- `docs/samba-factory/PLAYBOOK-S3-TO-APP.md`: como Assessment vira briefing estruturado; como Piloto vira Must/Should/Could com critérios de aceite.
- Opcional (se barato): template JSON de plano inicial "Assessment follow-up" importável na UI Plano.
- Sem dados de board/S7.

**Done quando:** playbook revisável por um consultor Samba sem o autor; template JSON opcional validado pelo schema de plano existente.

## 5. Explicitamente fora deste ciclo (não implementar agora)

- Marketplace / templates públicos
- Consumer onboarding / créditos / paywall
- Canvas Figma full + QA visual automático
- SSO / RBAC cloud / cofre multi-tenant
- Deep scan Semgrep + waiver autenticado AppSec
- Multi-language irrestrito / mobile nativo como P0
- White-label B2B (Caminho 2)

## 6. Ordem de PRs sugerida

1. Docs: este roadmap + link no README da fábrica + reescrita `PRODUCT.md` (E4 parcial)
2. E1 gate/bypass (+ testes)
3. E2 handoff one-click
4. E3 timestamps + playbook 1-dia
5. E5 política ou signing
6. E6 playbook S3→app (+ template JSON se couber)

PRs pequenos, cada um com critério Done da seção. Não misturar E1 e E2 no mesmo PR.

## 7. Critérios para abrir Caminho 2 (white-label) — futuro

Só depois de:

- (a) ≥ 3 projetos internos passando pelo gate de ponta a ponta  
- (b) hit rate do 1-dia MVP ≥ 70% em tentativas cronometradas  
- (c) handoff sem babysitting (feedback do consultor Samba)

Até lá: repo pode ser público; **posicionamento** = runtime da fábrica Samba, não produto de prateleira.

## 8. Referências

- [docs/samba-factory/README.md](./README.md) — estado da implementação local  
- [docs/samba-factory/PRD-original.md](./PRD-original.md) — PRD fornecido (contexto; este roadmap manda no ciclo)  
- [PRODUCT.md](../../PRODUCT.md) — alinhar a §1/E4  
- Releases: builds atuais não assinados — ver README raiz  

## 9. Notas para o implementador (Cursor)

- Preferir estender `packages/samba-factory` + IPC `src/ipc/services/factory/` em vez de lógica em `src/pro` (licença FSL).  
- Gates devem falhar fechado; não adicionar waiver "só desta vez".  
- Conteúdo de cliente no prompt = dados não confiáveis (já é regra — manter).  
- Testes: unitários factory + e2e `samba_factory.spec.ts` quando tocar UI/gates.  
- Não publicar páginas de marketing do Builder; não alterar pricing ZA.
