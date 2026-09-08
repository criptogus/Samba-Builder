import type { Finding } from "./schema";
export interface SourceFile {
  path: string;
  content: string;
}

/** Conservative source heuristics, never a substitute for an AppSec review. No secret values in results. */
export function scanSources(files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  function add(
    file: SourceFile,
    rule: string,
    severity: Finding["severity"],
    index: number,
    message: string,
    remediation: string,
  ) {
    const line = file.content.slice(0, index).split("\n").length;
    findings.push({
      id: `${rule}:${file.path}:${line}`,
      rule,
      severity,
      file: file.path,
      line,
      message,
      remediation,
    });
  }
  for (const file of files) {
    const rules: Array<[string, Finding["severity"], RegExp, string, string]> =
      [
        [
          "secret-key",
          "critical",
          /(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g,
          "Possível credencial no código.",
          "Revogue a credencial, remova do Git e use um cofre de secrets.",
        ],
        [
          "client-secret",
          "critical",
          /(?:VITE|NEXT_PUBLIC|PUBLIC)_[A-Z_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY)[A-Z_]*["']?\s*[:=]/g,
          "Secret exposto por variável pública.",
          "Mova a operação e a credencial para o servidor.",
        ],
        [
          "cors-wildcard",
          "high",
          /["']?Access-Control-Allow-Origin["']?\s*[:=]\s*["']\*["']/gi,
          "CORS permite qualquer origem.",
          "Restrinja às origens aprovadas do cliente.",
        ],
        [
          "raw-html",
          "medium",
          /dangerouslySetInnerHTML\s*=/g,
          "HTML direto precisa de revisão de XSS.",
          "Evite HTML não confiável ou aplique sanitização e testes negativos.",
        ],
        [
          "permissive-rls",
          "high",
          /(?:using|with\s+check)\s*\(\s*true\s*\)/gi,
          "Política RLS incondicional exige revisão.",
          "Restrinja por usuário/organização e teste acesso entre tenants.",
        ],
      ];
    for (const [rule, severity, pattern, message, remediation] of rules) {
      for (const match of file.content.matchAll(pattern))
        add(file, rule, severity, match.index, message, remediation);
    }
  }
  const sqlFiles = files.filter((file) => file.path.endsWith(".sql"));
  const sql = sqlFiles
    .map((file) => file.content.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ""))
    .join("\n");
  for (const file of sqlFiles) {
    const clean = file.content.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, (match) =>
      match.replace(/[^\n]/g, " "),
    );
    for (const match of clean.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:"?[\w]+"?\.)?"?[\w]+"?)/gi,
    )) {
      const table = match[1].replace(/"/g, "").toLowerCase();
      const bare = table.replace(/^public\./, "");
      const enabled = [
        ...sql.matchAll(
          /alter\s+table\s+(?:if\s+exists\s+)?((?:"?[\w]+"?\.)?"?[\w]+"?)\s+enable\s+row\s+level\s+security/gi,
        ),
      ].some(
        (enable) =>
          enable[1]
            .replace(/"/g, "")
            .toLowerCase()
            .replace(/^public\./, "") === bare,
      );
      if (!enabled)
        add(
          file,
          "rls-missing",
          "critical",
          match.index,
          `Tabela ${table} sem ENABLE ROW LEVEL SECURITY nas migrations locais.`,
          "Adicione RLS e políticas de acesso com testes negativos; valide também o banco remoto.",
        );
    }
    for (const match of clean.matchAll(/disable\s+row\s+level\s+security/gi))
      add(
        file,
        "rls-disabled",
        "critical",
        match.index,
        "Migration desabilita RLS.",
        "Remova a desativação e valide as políticas do banco.",
      );
  }
  return findings;
}
