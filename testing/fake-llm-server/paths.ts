/**
 * Path resolution for the fake-LLM server that works in BOTH runtime layouts:
 *
 *   - Compiled CLI (Playwright): `__dirname` is `testing/fake-llm-server/dist`,
 *     so the repo root is three levels up.
 *   - In-process (vitest chat-flow harness): `__dirname` is
 *     `testing/fake-llm-server` (no `dist`), so the repo root is two levels up.
 *
 * Rather than hard-code either depth, we walk up looking for `e2e-tests/fixtures`.
 * `FAKE_LLM_FIXTURES_DIR` (set by the harness) short-circuits the search.
 */
import fs from "node:fs";
import path from "node:path";

let cachedFixturesDir: string | undefined;

export function resolveFixturesDir(): string {
  if (process.env.FAKE_LLM_FIXTURES_DIR) {
    return process.env.FAKE_LLM_FIXTURES_DIR;
  }
  if (cachedFixturesDir) {
    return cachedFixturesDir;
  }
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, "e2e-tests", "fixtures");
    if (fs.existsSync(candidate)) {
      cachedFixturesDir = candidate;
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  // Legacy compiled-layout assumption as a last resort.
  return path.join(__dirname, "..", "..", "..", "e2e-tests", "fixtures");
}

/**
 * Resolve a fixture file inside `directory`. Exact names win. When the
 * requested name differs only by letter case (macOS checkouts vs Linux CI),
 * the matching directory entry is used.
 */
export function resolveFixtureFile(
  directory: string,
  fileName: string,
): string | undefined {
  const exact = path.join(directory, fileName);
  if (fs.existsSync(exact)) return exact;
  let entries: string[];
  try {
    entries = fs.readdirSync(directory);
  } catch {
    return undefined;
  }
  const wanted = fileName.toLowerCase();
  const match = entries.find((entry) => entry.toLowerCase() === wanted);
  return match ? path.join(directory, match) : undefined;
}

/** Directory the fake server writes `[dump]` request bodies into. */
export function resolveDumpDir(): string {
  return process.env.FAKE_LLM_DUMP_DIR || path.join(__dirname, "generated");
}
