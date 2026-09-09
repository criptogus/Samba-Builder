# Quality Engineering

Qualidade se **prova com evidência** — nunca se afirma. Para avançar de fase, execute as verificações e registre: comando executado, versão, resultado, cobertura relevante, screenshots, traces e limitações conhecidas.

## Pirâmide de testes por risco

| Camada      | O que valida                       | Indispensável quando                                     |
| ----------- | ---------------------------------- | -------------------------------------------------------- |
| Unitário    | Regras de negócio e transformações | Sempre para lógica relevante                             |
| Integração  | Banco, APIs, filas, adapters       | Toda integração e persistência                           |
| Contrato    | Compatibilidade entre serviços     | APIs públicas e integrações externas                     |
| E2E         | Jornadas críticas reais            | Login, compra, aprovação, permissões, exportação, deploy |
| Segurança   | Acesso indevido e abuso            | Toda feature com dados, identidade ou privilégio         |
| Visual      | Regressões de interface            | Páginas e componentes principais                         |
| Performance | Latência, carga e recursos         | Fluxos críticos ou volume previsto                       |

## Matriz requisito → evidência (dentro do PRD)

| Requisito                | Módulo     | Risco   | Teste             | Evidência de aceite                       |
| ------------------------ | ---------- | ------- | ----------------- | ----------------------------------------- |
| Usuário aprova despesa   | Financeiro | Alto    | E2E + autorização | Registro de auditoria + teste de perfil   |
| Gestor exporta relatório | Relatórios | Médio   | Integração        | Arquivo gerado com filtros aplicados      |
| Admin muda permissões    | IAM        | Crítico | E2E + segurança   | Negativa de acesso para usuário sem papel |

Uma feature "parece pronta" sem a evidência da linha dela na matriz **não está pronta** — em segurança, teste e governança.

## Prática

Rode a verificação **do próprio repo** (nunca a do scaffold) e registre o resultado real. Testes proporcionais ao risco: nada de burocracia para landing page, nada de "compila, então está pronto" para plataforma com dados/identidade/privilégio. Quando a verificação falhar duas vezes num lote, pare e reporte — não acumule mudança não verificada. Ver /samba-tdd para o ciclo de escrita e /samba-security para os testes negativos obrigatórios.
