/**
 * Pré-passe determinístico do Reviewer (REQ-25).
 *
 * Ideia emprestada do OpenCodeReview: parte do review não precisa de modelo —
 * precisa de checagem. Aqui vivem regras objetivas sobre as linhas **adicionadas**
 * do diff. Elas rodam antes (e independentemente) do modelo, então uma regra que
 * acerta continua valendo mesmo se o modelo devolver JSON inválido.
 *
 * Limites de propósito: as regras são conservadoras (só acusam quando o padrão é
 * inequívoco), cada uma tem id estável e a remediação é específica. Ruído de
 * regra queima a confiança mais rápido do que um falso negativo.
 */

export interface DiffAddedLine {
  path: string;
  /** Número da linha no arquivo novo. */
  line: number;
  content: string;
}

export interface RuleFinding {
  ruleId: string;
  severity: "critical" | "high" | "medium" | "low";
  path: string;
  line: number;
  title: string;
  impact: string;
  remediation: string;
}

/** Extrai as linhas adicionadas, com o caminho e a linha no arquivo novo. */
export function extractAddedLines(diff: string): DiffAddedLine[] {
  const added: DiffAddedLine[] = [];
  let currentPath: string | null = null;
  let newLine = 0;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const target = raw.slice(4).trim();
      currentPath = target === "/dev/null" ? null : target.replace(/^b\//, "");
      continue;
    }
    if (raw.startsWith("--- ")) continue;
    if (raw.startsWith("@@")) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(raw);
      newLine = match ? Number(match[1]) : 0;
      continue;
    }
    if (!currentPath) continue;
    if (raw.startsWith("\\")) continue;

    if (raw.startsWith("+")) {
      added.push({ path: currentPath, line: newLine, content: raw.slice(1) });
      newLine += 1;
      continue;
    }
    if (raw.startsWith("-")) continue;
    newLine += 1;
  }

  return added;
}

const CLIENT_PATH = /\.(?:tsx|jsx|ts|js)$/;
const SERVER_PATH =
  /(?:^|\/)(?:api|server|supabase\/functions|edge-functions)\//;
const SQL_PATH = /\.sql$/;

interface Rule {
  id: string;
  severity: RuleFinding["severity"];
  title: string;
  impact: string;
  remediation: string;
  matches: (line: DiffAddedLine) => boolean;
  /** Regra que só decide olhando o diff inteiro (ver `findTablesMissingRls`). */
  needsWholeDiff?: boolean;
}

const SECRET_NAME =
  /(secret|token|api[_-]?key|password|private[_-]?key|service[_-]?role)/i;
const PUBLIC_ENV_PREFIX = /(VITE_|NEXT_PUBLIC_|REACT_APP_|PUBLIC_)/;
const SQL_STATEMENT = /\b(?:select|insert\s+into|update|delete\s+from)\b/i;

export const REVIEW_RULES: readonly Rule[] = [
  {
    id: "xss-unsafe-html",
    severity: "high",
    title: "HTML não confiável renderizado direto",
    impact:
      "Conteúdo controlado pelo usuário entra no DOM como HTML e pode executar script na sessão de quem abre a página.",
    remediation:
      "Renderize como texto (o próprio JSX já escapa) ou sanitize com uma biblioteca dedicada antes de injetar.",
    matches: (line) =>
      /dangerouslySetInnerHTML|\.innerHTML\s*=/.test(line.content) &&
      // Literal fixo (sem interpolação) não é o padrão de risco.
      !/dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*["'`][^"'`${}]*["'`]\s*\}\s*\}/.test(
        line.content,
      ),
  },
  {
    id: "sql-string-concat",
    severity: "high",
    title: "SQL montado por concatenação",
    impact:
      "Entrada do usuário pode alterar a consulta (injeção de SQL) em vez de ser tratada como valor.",
    remediation:
      "Use consulta parametrizada (placeholders) ou o query builder do provedor, passando os valores separadamente.",
    matches: (line) =>
      SQL_STATEMENT.test(line.content) &&
      /(?:\$\{|\+\s*(?!\s*$)[A-Za-z_$])/.test(line.content) &&
      /["'`]/.test(line.content),
  },
  {
    id: "supabase-service-role-in-client",
    severity: "critical",
    title: "Service role do Supabase em código de cliente",
    impact:
      "Essa chave ignora RLS e dá acesso total ao banco; no browser ela fica exposta para qualquer visitante.",
    remediation:
      "Mova a chamada para uma Edge Function (ou servidor) e use a chave pública com RLS no cliente.",
    matches: (line) =>
      /service[_-]?role/i.test(line.content) &&
      !SERVER_PATH.test(line.path) &&
      CLIENT_PATH.test(line.path),
  },
  {
    id: "public-secret-exposure",
    severity: "critical",
    title: "Segredo exposto em variável pública",
    impact:
      "Variáveis com prefixo público entram no bundle e são visíveis para qualquer pessoa que abrir o app.",
    remediation:
      "Renomeie sem o prefixo público e leia o valor só no servidor; se o valor já foi publicado, rotacione a chave.",
    matches: (line) =>
      PUBLIC_ENV_PREFIX.test(line.content) && SECRET_NAME.test(line.content),
  },
  {
    id: "secret-committed",
    severity: "critical",
    title: "Segredo literal no código",
    impact:
      "A credencial entra no histórico do Git e continua válida para quem tiver acesso ao repositório.",
    remediation:
      "Mova o valor para uma variável de ambiente fora do repositório e rotacione a credencial exposta.",
    matches: (line) =>
      SECRET_NAME.test(line.content) &&
      /(?:=|:)\s*["'][A-Za-z0-9_\-/+]{16,}["']/.test(line.content) &&
      !/process\.env|import\.meta\.env/.test(line.content),
  },
  {
    id: "table-without-rls",
    severity: "high",
    title: "Tabela criada sem Row Level Security",
    impact:
      "Sem RLS habilitado, a chave pública lê e escreve a tabela inteira — o isolamento por usuário não existe.",
    remediation:
      "Adicione `alter table ... enable row level security;` e as policies de select/insert/update/delete.",
    matches: (line) =>
      SQL_PATH.test(line.path) && /\bcreate\s+table\b/i.test(line.content),
    needsWholeDiff: true,
  },
];

/** Roda as regras sobre as linhas adicionadas, sem repetir o mesmo achado. */
export function runReviewRules(diff: string): RuleFinding[] {
  const lines = extractAddedLines(diff);
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    for (const rule of REVIEW_RULES) {
      if (rule.needsWholeDiff) continue;
      if (!rule.matches(line)) continue;
      const key = `${rule.id}:${line.path}:${line.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        path: line.path,
        line: line.line,
        title: rule.title,
        impact: rule.impact,
        remediation: rule.remediation,
      });
    }
  }

  return [...findings, ...findTablesMissingRls(diff)];
}

/**
 * Uma tabela nova só está coberta quando o mesmo diff habilita RLS — a regra
 * olha o conjunto, não a linha isolada.
 */
export function findTablesMissingRls(diff: string): RuleFinding[] {
  const lines = extractAddedLines(diff);
  const createsTable = lines.filter((line) =>
    REVIEW_RULES.find((rule) => rule.id === "table-without-rls")!.matches(line),
  );
  if (createsTable.length === 0) return [];

  const enablesRls = lines.some((line) =>
    /enable\s+row\s+level\s+security/i.test(line.content),
  );
  if (enablesRls) return [];

  const rule = REVIEW_RULES.find((rule) => rule.id === "table-without-rls")!;
  return createsTable.map((line) => ({
    ruleId: rule.id,
    severity: rule.severity,
    path: line.path,
    line: line.line,
    title: rule.title,
    impact: rule.impact,
    remediation: rule.remediation,
  }));
}
