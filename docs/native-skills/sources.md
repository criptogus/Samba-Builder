# Pesquisa e decisões de integração

Revisão em 5 de setembro de 2026. Foram consultados os 17 repositórios: README, árvore, licença disponível e amostras relevantes. A análise é de curadoria, não uma auditoria de cada arquivo ou de cada dependência. Revisões fixadas abaixo tornam a pesquisa reproduzível.

As 14 skills nativas são sínteses/adaptações para as ferramentas e permissões reais do Samba. Não são cópias integrais dos produtos. Conteúdo de licença restritiva ou sem licença clara não foi incorporado. A licença de um catálogo não se estende automaticamente aos projetos listados.

## [obra/superpowers](https://github.com/obra/superpowers/tree/b36e0829c6d0140e93cfef2ca599b1b07d4a7797)

- Revisão: `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`.
- Tipo: Skills de engenharia.
- Licença observada: MIT.
- Decisão: Adaptação dos fluxos de planejamento e diagnóstico. Sem gates universais de aprovação, hooks ou delegação automática.

## [mattpocock/skills](https://github.com/mattpocock/skills/tree/3cca18b368ae95cdbdebbff572ccafa662551015)

- Revisão: `3cca18b368ae95cdbdebbff572ccafa662551015`.
- Tipo: Skills de engenharia.
- Licença observada: MIT.
- Decisão: Testes por comportamento, revisão e desenho de fronteiras; adaptados ao runner e aos modos do Samba.

## [affaan-m/ECC](https://github.com/affaan-m/ECC/tree/e04ea0b9cc8248686edf5ac751cadff550e162b8)

- Revisão: `e04ea0b9cc8248686edf5ac751cadff550e162b8`.
- Tipo: Skills, regras e harness.
- Licença observada: MIT.
- Decisão: Curadoria de segurança e operação. Não importamos centenas de skills, hooks e processos do harness.

## [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills/tree/2c606141936f1eeef17fa3043a72095b4765b9c2)

- Revisão: `2c606141936f1eeef17fa3043a72095b4765b9c2`.
- Tipo: Diretrizes de programação.
- Licença observada: Licença não localizada na revisão.
- Decisão: Referência conceitual somente; nenhum texto ou arquivo incorporado. Princípios gerais de simplicidade escritos independentemente.

## [microsoft/markitdown](https://github.com/microsoft/markitdown/tree/4459ed01155f8e1a7ac007f441d34f0422746191)

- Revisão: `4459ed01155f8e1a7ac007f441d34f0422746191`.
- Tipo: Conversor Python.
- Licença observada: MIT.
- Decisão: Skill de documentos orienta extração e verifica capacidade disponível. Python/MarkItDown não empacotados; conversão binária depende de ferramenta externa.

## [anthropics/skills](https://github.com/anthropics/skills/tree/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f)

- Revisão: `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`.
- Tipo: Skills e ferramentas.
- Licença observada: Por diretório: frontend-design Apache-2.0; docx restritiva.
- Decisão: Análise da estrutura de carregamento progressivo. Não incorporamos materiais DOCX/PDF/PPTX/XLSX proprietários nem seus scripts; orientação documental própria.

## [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents/tree/1454492577d1af4884722837f491fef14b501e21)

- Revisão: `1454492577d1af4884722837f491fef14b501e21`.
- Tipo: Perfis de especialistas.
- Licença observada: MIT.
- Decisão: Perspectivas de revisão aplicadas pelo mesmo agente. Não cria uma agência persistente ou processos paralelos.

## [anthropics/claude-code](https://github.com/anthropics/claude-code/tree/d7dbd9a09f59775726ed14bbea8fc9dfdff62f7b)

- Revisão: `d7dbd9a09f59775726ed14bbea8fc9dfdff62f7b`.
- Tipo: Produto e plugins.
- Licença observada: Proprietária; LICENSE.md remete aos termos comerciais.
- Decisão: Analisado como referência de experiência. Binário, runtime e código não incorporados; nenhuma dependência obrigatória de Claude.

## [github/spec-kit](https://github.com/github/spec-kit/tree/4a7341a93d944d6efe153b71da4a1adb9c2b578c)

- Revisão: `4a7341a93d944d6efe153b71da4a1adb9c2b578c`.
- Tipo: Especificações, templates e CLI.
- Licença observada: MIT.
- Decisão: Fluxos de requisitos, plano e aceitação adaptados. Sem executar hooks, CLI ou extensão remota por instrução de skill.

## [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/f3ac195224eac1eb0dfe1a3059c2a6add78ffbe3)

- Revisão: `f3ac195224eac1eb0dfe1a3059c2a6add78ffbe3`.
- Tipo: Skill, dados e scripts de design.
- Licença observada: MIT na raiz; outros arquivos podem ter termos próprios.
- Decisão: Fluxos de design e acessibilidade curados. Busca Python, bancos de fontes e centenas de registros não empacotados.

## [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md/tree/8147538b4226ae41e2487a9179e3bcc1f68e8554)

- Revisão: `8147538b4226ae41e2487a9179e3bcc1f68e8554`.
- Tipo: Catálogo de análises DESIGN.md.
- Licença observada: MIT do catálogo.
- Decisão: Referência para estrutura e consistência visual. Não inclui cópias de marcas, screenshots ou todos os DESIGN.md.

## [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers/tree/9f3ae55c50a6b2cac8172700fc5af43cf16f76cf)

- Revisão: `9f3ae55c50a6b2cac8172700fc5af43cf16f76cf`.
- Tipo: Catálogo MCP.
- Licença observada: MIT do catálogo; cada servidor tem seus termos.
- Decisão: Skill orienta uso do gerenciador MCP existente. Não instala/autoriza servidores por pertencerem à lista.

## [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/ccbc15639c97057cbfcf32ecebc38ef716e4bb37)

- Revisão: `ccbc15639c97057cbfcf32ecebc38ef716e4bb37`.
- Tipo: Skills de direção visual.
- Licença observada: MIT.
- Decisão: Adaptação de direção visual e identidade. Sem assets, scripts ou pressupostos de ferramentas específicas.

## [lobehub/lobehub](https://github.com/lobehub/lobehub/tree/f2d2f18a24356e55e459b26c5588484dea6761d1)

- Revisão: `f2d2f18a24356e55e459b26c5588484dea6761d1`.
- Tipo: Aplicação completa.
- Licença observada: LobeHub Community License.
- Decisão: Referência de catálogo/experiência apenas. Não incorporamos código, prompts ou infraestrutura; a licença contém condições adicionais para derivados comerciais.

## [Egonex-AI/Understand-Anything](https://github.com/Egonex-AI/Understand-Anything/tree/787da45adbf18aab5c3e3e531b0374dd576f263c)

- Revisão: `787da45adbf18aab5c3e3e531b0374dd576f263c`.
- Tipo: Skills, indexador e dashboard.
- Licença observada: MIT.
- Decisão: Skill de mapa de código com evidência e leitura seletiva. Dashboard, indexador e watchers não incorporados.

## [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills/tree/be2a406907dbc61b73e6827ded415c96139d13a2)

- Revisão: `be2a406907dbc61b73e6827ded415c96139d13a2`.
- Tipo: Catálogo e automações.
- Licença observada: README anuncia Apache-2.0; licenças variam por pasta.
- Decisão: Referência para descoberta de integrações. Sem copiar skills em massa ou configurar credenciais; cada conector requer avaliação própria.

## [remotion-dev/remotion](https://github.com/remotion-dev/remotion/tree/cb053ab25292f8e7559dc5295f4286cde2268481)

- Revisão: `cb053ab25292f8e7559dc5295f4286cde2268481`.
- Tipo: Framework de vídeo e skills.
- Licença observada: Runtime: Remotion License; packages/agent-plugin: MIT.
- Decisão: Skill própria de criação/verificação em projetos Remotion. Runtime/Chromium/FFmpeg não incluídos; uso depende da instalação e dos termos aplicáveis.

## Revisão de qualidade — 2026-09-06

- [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices): a skill declara MIT em seu frontmatter; a API não informa licença global do repositório. Prioridades de waterfalls, bundle e cache orientaram a redação própria de samba-performance. Sem copiar o catálogo de regras, instalar scripts ou adicionar dependências.
- [Superpowers — verification-before-completion](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/verification-before-completion/SKILL.md): MIT, aviso já preservado. Princípio de conclusão com evidência incorporado à revisão e ao padrão comum, proporcional ao escopo e às ferramentas disponíveis.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/): referência pública de verificação. As orientações de segurança são redação própria, sem reprodução do standard nem promessa de conformidade/certificação ASVS.
- [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design): consultado como referência de direção visual; nenhum arquivo, ativo, script ou texto da skill foi incorporado nesta revisão.

A revisão não baixa nem executa conteúdo remoto em tempo de uso. Os arquivos locais e os testes são a versão efetiva do comportamento; popularidade dos repositórios não é evidência de qualidade das aplicações geradas.

## Movimento e direção de arte — revisão de 6 de setembro de 2026

`/samba-motion` é uma síntese original: coreografia, interrupção, tokens, fallback estático e manutenção. Referências técnicas consultadas: [Motion — acessibilidade](https://motion.dev/docs/react-accessibility) e [web.dev — animações eficientes](https://web.dev/articles/animations-guide). Nenhum componente pago, ativo visual ou código de exemplo foi incorporado. CSS é a primeira opção; a biblioteca existente é usada quando o comportamento exige coordenação adicional.

O padrão de geração agora inclui direção de arte e movimento sem seleção manual. As skills detalhadas continuam disponíveis por comando ou catálogo e carregadas sob demanda. Esses controles orientam o modelo; não constituem evidência de que qualquer aplicação gerada alcançou qualidade estética superior.
