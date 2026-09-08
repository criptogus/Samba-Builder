import { execGit } from "../utils/git_utils";
const paths = [
  "*.ts",
  "*.tsx",
  "*.js",
  "*.jsx",
  "*.mjs",
  "*.cjs",
  "*.css",
  "*.scss",
  "*.html",
  "*.vue",
  "*.svelte",
  "*.py",
  "*.go",
  "*.rs",
  "*.java",
  "*.cs",
  "*.swift",
  "*.kt",
  "*.sql",
  "*.php",
  "*.rb",
  ":(exclude)**/node_modules/**",
  ":(exclude)**/dist/**",
  ":(exclude)**/build/**",
  ":(exclude)**/vendor/**",
  ":(exclude)**/*.min.js",
  ":(exclude)**/*.generated.*",
];
async function git(root: string, args: string[]) {
  const result = await execGit(
    ["-c", "core.fsmonitor=false", "-c", "grep.threads=2", ...args],
    root,
    { maxBuffer: 4 * 1024 * 1024, signal: AbortSignal.timeout(20000) },
  );
  if (result.exitCode !== 0)
    throw Object.assign(
      new Error(result.stderr || "Não foi possível medir o repositório Git."),
      { code: result.exitCode },
    );
  return result.stdout.trim();
}
export async function assertCodeCommitted(root: string) {
  if (await git(root, ["status", "--porcelain"]))
    throw new Error(
      "Salve as alterações em um commit Git antes de iniciar ou encerrar a sprint.",
    );
}
export async function readCodeMetrics(root: string, base?: string) {
  const commit = await git(root, ["rev-parse", "HEAD"]);
  if (base && !/^[a-f0-9]{40,64}$/.test(base))
    throw new Error("Invalid sprint base commit");
  let counts = "";
  try {
    counts = await git(root, [
      "grep",
      "-I",
      "-c",
      "-e",
      "^",
      commit,
      "--",
      ...paths,
    ]);
  } catch (error) {
    if ((error as { code?: number }).code !== 1) throw error;
  }
  const lines = counts ? counts.split("\n") : [];
  const codeLines = lines.reduce(
    (n, l) => n + Number(l.slice(l.lastIndexOf(":") + 1)),
    0,
  );
  let addedLines: number | null = null,
    removedLines: number | null = null,
    commits: number | null = null;
  if (base) {
    const diff = await git(root, [
      "diff",
      "--numstat",
      "--no-ext-diff",
      "--no-textconv",
      base,
      commit,
      "--",
      ...paths,
    ]);
    addedLines = 0;
    removedLines = 0;
    for (const line of diff.split("\n")) {
      const [added, removed] = line.split("\t");
      if (/^\d+$/.test(added ?? "") && /^\d+$/.test(removed ?? "")) {
        addedLines += Number(added);
        removedLines += Number(removed);
      }
    }
    commits = Number(
      await git(root, ["rev-list", "--count", `${base}..${commit}`]),
    );
  }
  return {
    commit,
    codeLines,
    codeFiles: lines.length,
    addedLines,
    removedLines,
    commits,
  };
}
