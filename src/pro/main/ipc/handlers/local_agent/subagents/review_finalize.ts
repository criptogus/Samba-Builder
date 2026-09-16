import {
  extractAddedLines,
  runReviewRules,
  type RuleFinding,
} from "./review_ruleset";
import {
  parseReviewResult,
  type ParsedReviewResult,
  type ReviewFinding,
} from "./review_result";
import type { ReviewTarget } from "./review_target";

/**
 * Fecha a revisão combinando as três camadas (REQ-25/26/27):
 *
 * 1. **Regras determinísticas** rodam sobre o diff e entram no relatório como
 *    achados próprios — valem mesmo se o modelo devolver JSON inválido.
 * 2. **Cobertura** compara os arquivos enviados com os que o revisor declara ter
 *    revisado: arquivo enviado e não declarado rebaixa o status para `partial`.
 * 3. **Ancoragem** confere cada achado do modelo contra as linhas adicionadas do
 *    diff; linha fora do diff vira achado "não ancorado" em vez de posição falsa.
 */

export interface ReviewCoverage {
  /** Arquivos enviados ao revisor. */
  sent: number;
  /** Quantos o revisor declarou ter revisado (`null` = não declarou). */
  declaredReviewed: number | null;
  /** Enviados que o revisor não declarou — o "corte de caminho" clássico. */
  uncovered: string[];
  /** Arquivos que nem chegaram ao revisor, com o motivo. */
  excluded: Array<{ path: string; reason: string }>;
}

export interface FinalizedReview extends ParsedReviewResult {
  coverage: ReviewCoverage;
  ruleFindings: RuleFinding[];
  unanchoredFindings: number;
}

/** `"src/a.ts (binary)"` → `{ path, reason }`. */
export function parseExclusion(exclusion: string): {
  path: string;
  reason: string;
} {
  const match = /^(.*?)\s+\(([^()]*)\)\s*$/.exec(exclusion);
  if (!match) return { path: exclusion.trim(), reason: "excluído" };
  return { path: match[1].trim(), reason: match[2].trim() };
}

function addedLineIndex(diff: string): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  for (const line of extractAddedLines(diff)) {
    let lines = index.get(line.path);
    if (!lines) {
      lines = new Set<number>();
      index.set(line.path, lines);
    }
    lines.add(line.line);
  }
  return index;
}

function withAnchoring(
  findings: ReviewFinding[],
  index: Map<string, Set<number>>,
): { findings: ReviewFinding[]; unanchored: number } {
  let unanchored = 0;
  const anchored = findings.map((finding) => {
    const line = finding.line;
    const isAnchored =
      line !== undefined && (index.get(finding.path)?.has(line) ?? false);
    if (isAnchored) return finding;
    unanchored += 1;
    return { ...finding, unanchored: true, origin: finding.origin ?? "model" };
  });
  return { findings: anchored, unanchored };
}

function renderFinalReport(params: {
  parsed: ParsedReviewResult;
  coverage: ReviewCoverage;
  ruleFindings: RuleFinding[];
  unanchoredFindings: number;
}): string {
  const { parsed, coverage, ruleFindings, unanchoredFindings } = params;
  const sections: string[] = [parsed.summary];

  if (ruleFindings.length > 0) {
    sections.push(
      [
        `Achados de verificação automática (${ruleFindings.length}):`,
        ...ruleFindings.map((finding, position) => {
          const location = `${finding.path}:${finding.line}`;
          return `${position + 1}. [${finding.severity.toUpperCase()}] ${finding.title} (${location}) — regra ${finding.ruleId}\nImpacto: ${finding.impact}\nCorreção: ${finding.remediation}`;
        }),
      ].join("\n"),
    );
  }

  if (parsed.findings.length > 0) {
    sections.push(
      [
        `Achados do revisor (${parsed.findings.length}):`,
        ...parsed.findings.map((finding, position) => {
          const location = `${finding.path}${finding.line ? `:${finding.line}` : ""}`;
          const drift = finding.unanchored
            ? " — posição não confirmada no diff"
            : "";
          return `${position + 1}. [${finding.severity.toUpperCase()}] ${finding.title} (${location})${drift}\nImpacto: ${finding.impact}\nCorreção: ${finding.remediation}`;
        }),
      ].join("\n"),
    );
  }

  const coverageLines = [
    "Cobertura:",
    `- arquivos enviados: ${coverage.sent}`,
    coverage.declaredReviewed === null
      ? "- arquivos revisados: não declarado pelo revisor"
      : `- arquivos revisados: ${coverage.declaredReviewed} de ${coverage.sent}`,
  ];
  if (coverage.uncovered.length > 0) {
    coverageLines.push(
      `- enviados sem revisão declarada: ${coverage.uncovered.join(", ")}`,
    );
  }
  if (coverage.excluded.length > 0) {
    coverageLines.push(
      "- fora do revisor:",
      ...coverage.excluded.map((item) => `  - ${item.path} (${item.reason})`),
    );
  }
  if (unanchoredFindings > 0) {
    coverageLines.push(
      `- achados sem posição confirmada no diff: ${unanchoredFindings}`,
    );
  }
  sections.push(coverageLines.join("\n"));

  return sections.join("\n\n");
}

export function finalizeReview(params: {
  target: ReviewTarget;
  rawOutput: string;
}): FinalizedReview {
  const parsed = parseReviewResult(params.rawOutput, params.target.files);

  const ruleFindings = runReviewRules(params.target.diff);
  const index = addedLineIndex(params.target.diff);
  const { findings, unanchored } = withAnchoring(parsed.findings, index);

  const excluded = params.target.exclusions.map(parseExclusion);
  const declared = parsed.reviewed_files;
  const uncovered =
    declared === undefined
      ? []
      : params.target.files.filter((file) => !declared.includes(file));

  const coverage: ReviewCoverage = {
    sent: params.target.files.length,
    declaredReviewed: declared === undefined ? null : declared.length,
    uncovered,
    excluded,
  };

  // Arquivo enviado e não revisado é o defeito que o relatório precisa nomear:
  // sem isso, "no_findings" pode significar "não olhei".
  const status =
    uncovered.length > 0 && parsed.status !== "partial"
      ? "partial"
      : parsed.status;
  const trimmed = { ...parsed, findings, status };
  const report = renderFinalReport({
    parsed: trimmed,
    coverage,
    ruleFindings,
    unanchoredFindings: unanchored,
  });

  return {
    ...trimmed,
    report,
    findingCount: findings.length,
    coverage,
    ruleFindings,
    unanchoredFindings: unanchored,
  };
}
