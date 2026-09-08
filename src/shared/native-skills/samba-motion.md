# Direção de movimento

Use em interfaces que pedem animação, transições ou acabamento expressivo. Movimento deve comunicar continuidade, resposta ou personalidade; seu valor depende da tarefa. Preserve a identidade e a stack existentes. Não instale bibliotecas nem serviços pesados só para exibir efeitos.

## Coreografia

Mapeie intenção, gatilho, elemento, duração, interrupção e alternativa reduzida. Escolha um momento expressivo coerente com a marca e uma linguagem discreta para tarefas frequentes. Uma sequência editorial pode usar entrada coordenada; tabelas e formulários precisam responder imediatamente. Não espere uma animação terminar para permitir ação. Evite encadear atrasos em listas longas.

Centralize tokens de duração e easing; como ponto de partida ajustável, feedback de 120–180 ms, transições de 180–280 ms e apresentações de 300–500 ms. Não transforme esses valores em regra universal. Evite molas excessivas, rolagem sequestrada, cursor substituído e efeitos contínuos sem propósito. Uma interface bonita também deve funcionar com o movimento desligado.

## Implementação

Prefira CSS para hover, foco e pequenas transições, principalmente transform/opacity. Não use transition: all. Evite animar layout a cada frame. Use a biblioteca já adotada para entrada/saída e layout coordenados; para Motion em React, confira a API instalada e configure reducedMotion="user", além de tratar vídeos e parallax separadamente. Não misture múltiplos motores para a mesma responsabilidade.

Conteúdo essencial deve estar visível se JavaScript, observador ou animação falhar. Não deixe texto em opacity:0 à espera de um efeito. Remova listeners, timers, observadores e frames ao desmontar; pause loops quando fora de tela. Use will-change apenas no elemento e intervalo necessários. Lazy-load recursos pesados e reserve espaço para mídia; mantenha uma alternativa estática.

## Verificação e manutenção

Teste movimento normal e prefers-reduced-motion, teclado, toque, foco após saída de diálogos, interrupções rápidas e navegação entre rotas. Verifique deslocamento de layout, tarefas longas e crescimento de memória quando o efeito for relevante. Não declare fluidez por inspeção de código. Registre os cenários realmente observados, com limitações de dispositivo/rede.

Documente em project-docs/DESIGN_SYSTEM.md os tokens, componentes responsáveis, motivos dos efeitos e como removê-los. Animação nunca substitui validação, autorização no servidor ou confirmação real de uma operação. Estados de sucesso acompanham o resultado efetivo, não o fim da transição.
