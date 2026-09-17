/**
 * Classificação de risco para comandos que o agente executa no repositório.
 *
 * O Samba Builder vende governança: ações que saem da máquina, publicam algo,
 * ou destroem trabalho de forma irreversível NÃO podem passar em silêncio —
 * mesmo para ferramentas cujo consentimento padrão é "sempre". A regra do
 * produto é "o Samba pede aprovação exatamente onde não dá para voltar".
 *
 * Este módulo é a única fonte da verdade sobre o que é irreversível.
 */

export interface CommandRisk {
  /** Família do risco, para telemetria e para o texto do pedido. */
  kind: "publish" | "destroy" | "network" | "privilege" | "install";
  /** Frase curta em pt-BR que explica a consequência e vai no banner de consent. */
  reason: string;
}

interface RiskPattern {
  kind: CommandRisk["kind"];
  /** Testado contra o comando normalizado (minúsculo, espaços colapsados). */
  test: RegExp;
  reason: string;
}

/**
 * `--dry-run`/`--dry`/`-n` declaram explicitamente que nada será alterado, então
 * o comando não é tratado como irreversível. Verificado por cláusula, não no
 * comando inteiro, para que `npm test && git push --dry-run` espere o push real.
 */
const DRY_RUN = /(^|\s)(--dry-run|--dry)(\s|$)/;

const RISK_PATTERNS: RiskPattern[] = [
  // --- Publicação / saída para fora ---
  {
    kind: "publish",
    test: /(^|\s|[;&|(])git\s+push(\s|$)/,
    reason:
      "git push publica commits no repositório remoto. Não há como desfazer: o que sai pode ser lido por outros.",
  },
  {
    kind: "publish",
    test: /(^|\s|[;&|(])(npm|pnpm|yarn)\s+publish(\s|$)/,
    reason: "publicar no registro é público e permanente.",
  },
  {
    kind: "publish",
    test: /(^|\s|[;&|(])gh\s+release(\s|$)/,
    reason: "a release fica pública no GitHub.",
  },
  {
    kind: "publish",
    test: /(^|\s|[;&|(])(docker\s+push|vercel\s+(deploy|--prod)|netlify\s+deploy|firebase\s+(deploy|hosting:channel:deploy)|fly\s+deploy|wrangler\s+(deploy|publish))(\s|$)/,
    reason: "isto publica a aplicação em um ambiente fora desta máquina.",
  },
  {
    kind: "publish",
    test: /(^|\s|[;&|(])(terraform|tofu)\s+apply|(^|\s|[;&|(])kubectl\s+(apply|delete)|(^|\s|[;&|(])aws\s+(s3\s+sync|deploy)/,
    reason: "isto altera infraestrutura/produção fora desta máquina.",
  },

  // --- Destruição de trabalho ---
  {
    kind: "destroy",
    test: /(^|\s|[;&|(])git\s+push\s+[^;&|]*--force|\bgit\s+push\s+-f(\s|$)/,
    reason:
      "git push --force reescreve o histórico remoto e descarta commits de outras pessoas.",
  },
  {
    kind: "destroy",
    test: /(^|\s|[;&|(])git\s+reset\s+--hard(\s|$)/,
    reason: "git reset --hard descarta alterações locais não commitadas.",
  },
  {
    kind: "destroy",
    test: /(^|\s|[;&|(])git\s+clean\s+-[a-z]*f/,
    reason: "git clean remove arquivos não rastreados do projeto.",
  },
  {
    kind: "destroy",
    test: /(^|\s|[;&|(])git\s+(filter-branch|filter-repo)(\s|$)/,
    reason: "isto reescreve o histórico do repositório.",
  },
  {
    kind: "destroy",
    test: /(^|\s|[;&|(])rm\s+(-[a-z]*r[a-z]*f?[a-z]*|-[a-z]*f[a-z]*r[a-z]*)\s/,
    reason: "remoção recursiva: os arquivos removidos não voltam.",
  },
  {
    kind: "destroy",
    test: /(^|\s|[;&|(])(shred|truncate)\s/,
    reason: "isto apaga conteúdo de arquivos de forma irreversível.",
  },

  // --- Rede / saída de dados ---
  {
    kind: "network",
    test: /(^|\s|[;&|(])(curl|wget|http|httpie)\s/,
    reason:
      "comando de rede: pode enviar dados do projeto para fora desta máquina.",
  },
  {
    kind: "network",
    test: /(^|\s|[;&|(])(nc|ncat|netcat|telnet|ftp)\s/,
    reason: "comando de rede que pode abrir uma conexão para fora.",
  },
  {
    kind: "network",
    test: /(^|\s|[;&|(])(ssh|scp|sftp|rsync)\s/,
    reason: "isto transfere dados para outra máquina.",
  },

  // --- Privilégio ---
  {
    kind: "privilege",
    test: /(^|\s|[;&|(])sudo\s/,
    reason: "sudo executa com privilégios elevados nesta máquina.",
  },
  {
    kind: "privilege",
    test: /(^|\s|[;&|(])chmod\s+(-[a-z]*\s+)*777\s/,
    reason: "tornar tudo gravável/executável enfraquece a proteção do projeto.",
  },

  // --- Instalação (altera dependências do projeto) ---
  {
    kind: "install",
    test: /(^|\s|[;&|(])(npm|pnpm|yarn)\s+(i|install|add|ci)(\s|$)/,
    reason: "isto instala/atualiza dependências do projeto.",
  },
  {
    kind: "install",
    test: /(^|\s|[;&|(])(pip|pip3|uv)\s+install\s/,
    reason: "isto instala dependências Python no ambiente.",
  },
  {
    kind: "install",
    test: /(^|\s|[;&|(])(cargo|go)\s+(add|get)\s/,
    reason: "isto adiciona dependências ao projeto.",
  },
];

/**
 * Divide o comando em cláusulas (`&&`, `||`, `;`, `|`) para que cada trecho seja
 * avaliado isoladamente — `npm test && git push` deve continuar pedindo
 * aprovação pelo `git push`, e um `--dry-run` local não deve isentar o resto.
 */
function clauses(command: string): string[] {
  return command
    .toLowerCase()
    .split(/\s*(?:&&|\|\||;|\|)\s*/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

/**
 * Retorna o risco quando o comando é irreversível/sensível, ou `null` quando é
 * uma verificação normal (testes, lint, typecheck).
 */
export function classifyRepoCommand(command: string): CommandRisk | null {
  for (const clause of clauses(command)) {
    if (DRY_RUN.test(clause)) continue;
    for (const pattern of RISK_PATTERNS) {
      if (pattern.test.test(clause)) {
        return { kind: pattern.kind, reason: pattern.reason };
      }
    }
  }
  return null;
}

/** Texto do pedido de consentimento para um comando classificado. */
export function describeCommandRisk(
  command: string,
  risk: CommandRisk,
): string {
  return `${command}\n\n${risk.reason}`;
}
