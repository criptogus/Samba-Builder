import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { getElectron } from "../../paths/paths";
import type { DesignSystemTemplate } from "../types/design_system";

const execFileAsync = promisify(execFile);

/**
 * Design System Toolkit runner.
 *
 * The toolkit CLI lives at `samba/design-system/design.py` inside the Samba
 * Builder install and is executed with `python3`. Each public function here is
 * a thin, testable wrapper: callers pass the resolved script path (see
 * {@link resolveDesignSystemToolkitPath}) so pure parsing logic stays
 * independent of Electron.
 */

export const DESIGN_TOOLKIT_RELATIVE_PATH = path.join(
  "samba",
  "design-system",
  "design.py",
);

/** Allow tests/embedders to point at a different toolkit script. */
export const DESIGN_TOOLKIT_PATH_ENV = "SAMBA_DESIGN_SYSTEM_TOOLKIT_PATH";

export function resolveDesignSystemToolkitPath(): string {
  const overridden = process.env[DESIGN_TOOLKIT_PATH_ENV];
  if (overridden) {
    return path.resolve(overridden);
  }
  // In a packaged/dev Electron app the toolkit ships next to the app; in a bare
  // Node context fall back to the repository root.
  const electron = getElectron();
  const base = electron?.app?.getAppPath?.() ?? process.cwd();
  const candidate = path.join(base, DESIGN_TOOLKIT_RELATIVE_PATH);
  return fs.existsSync(candidate) ? candidate : path.resolve(base, candidate);
}

function pythonCommand(): string {
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Runs the design.py CLI with the given args and resolves with its stdout.
 * Rejects with an Error carrying the CLI's stdout+stderr on non-zero exit.
 */
export async function runDesignToolkit(
  scriptPath: string,
  args: string[],
  cwd?: string,
): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(
      pythonCommand(),
      [scriptPath, ...args],
      {
        cwd,
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );
    return stdout || stderr || "";
  } catch (err: unknown) {
    const message = extractToolkitError(err, scriptPath, args);
    throw new Error(message);
  }
}

function extractToolkitError(
  err: unknown,
  scriptPath: string,
  args: string[],
): string {
  const error = err as {
    stdout?: string;
    stderr?: string;
    message?: string;
  };
  const detail = [error.stdout, error.stderr, error.message]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join("\n");
  return `Design System Toolkit failed (${pythonCommand()} ${scriptPath} ${args.join(" ")}).\n${detail || "Unknown error."}`.trim();
}

// ---------------------------------------------------------------- parsing ---

function splitListLine(line: string): Pick<
  DesignSystemTemplate,
  "slug" | "name" | "from"
> & { tagsText: string } | null {
  // design.py list-templates prints: `  <slug> <name> from=<from> tags=<tags>`
  const m = line.match(/^\s*(\S+)\s+(.+?)\s+from=(.*)$/);
  if (!m) return null;
  const [, slug, nameAndRest, fromPart] = m;
  const name = nameAndRest.trim();
  // fromPart looks like `<from> tags=<comma,list>` (tags optional).
  const tagsIndex = fromPart.lastIndexOf(" tags=");
  const from =
    tagsIndex >= 0 ? fromPart.slice(0, tagsIndex).trim() : fromPart.trim();
  const tagsText =
    tagsIndex >= 0
      ? fromPart
          .slice(tagsIndex + " tags=".length)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(",")
      : "";
  if (!slug || !name) return null;
  return { slug, name, tagsText, from };
}

/** Parses the plain-text output of `design.py list-templates`. */
export function parseListTemplatesOutput(stdout: string): DesignSystemTemplate[] {
  const templates: DesignSystemTemplate[] = [];
  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = splitListLine(line);
    if (!parsed) continue;
    templates.push({
      slug: parsed.slug,
      name: parsed.name,
      description: "",
      tags: parsed.tagsText ? parsed.tagsText.split(",") : [],
      savedAt: "",
      from: parsed.from,
    });
  }
  return templates;
}

/** Extracts the slug (file basename) from a `Template salvo: <path>` line. */
export function parseSavedSlug(stdout: string): string {
  const m = stdout.match(/Template salvo:\s*(.+?)\s*$/m);
  if (m) {
    return path.basename(m[1].trim()).replace(/\.json$/, "");
  }
  // Fall back to a slug derived from the first non-empty token if present.
  const first = stdout.split("\n").find((l) => l.trim());
  return first?.trim().split(/\s+/)[0] ?? "";
}

/** Extracts the applied file path from an `apply-template` success line. */
export function parseAppliedPath(stdout: string): string {
  const m = stdout.match(/aplicado:\s*(.+?)\s*$/m);
  return (m?.[1] ?? stdout).trim();
}
