import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const excluded = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  "test-results",
  ".dyad",
]);
export async function sourceFiles(root) {
  const files = [];
  let incomplete = false,
    bytes = 0,
    entries = 0;
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (++entries > 10000) {
        incomplete = true;
        return;
      }
      if (excluded.has(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        incomplete = true;
        continue;
      }
      if (entry.isDirectory()) {
        await walk(file);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(file);
      if (
        stat.size > 2_000_000 ||
        files.length >= 5000 ||
        bytes + stat.size > 64_000_000
      ) {
        incomplete = true;
        continue;
      }
      bytes += stat.size;
      files.push(file);
    }
  }
  await walk(root);
  return { files, incomplete };
}
const report = (status, summary, findings = [], metrics = {}) => ({
  status,
  summary,
  findings: findings.slice(0, 100),
  metrics,
});
export async function secrets(root) {
  const { lintSource } = await import("@secretlint/core");
  const { creator } =
    await import("@secretlint/secretlint-rule-preset-recommend");
  const inventory = await sourceFiles(root);
  const findings = [];
  let inspected = 0;
  for (const file of inventory.files) {
    const content = await fs.readFile(file);
    if (content.includes(0)) continue;
    inspected++;
    const result = await lintSource({
      source: {
        content: content.toString("utf8"),
        filePath: file,
        contentType: "text",
      },
      options: {
        maskSecrets: true,
        config: {
          rules: [
            {
              id: "@secretlint/secretlint-rule-preset-recommend",
              rule: creator,
            },
          ],
        },
      },
    });
    for (const message of result.messages)
      findings.push({
        file: path.relative(root, file),
        line: message.loc?.start?.line,
        rule: message.ruleId,
      });
  }
  return report(
    findings.length
      ? "failed"
      : inventory.incomplete || !inspected
        ? "inconclusive"
        : "passed",
    !inspected
      ? "Nenhum arquivo de texto foi verificado."
      : inventory.incomplete
        ? "Cobertura parcial: limite de leitura ou link simbólico."
        : "Secretlint executado nos arquivos de texto; histórico Git não incluído.",
    findings,
    { files: inspected, findings: findings.length },
  );
}
export async function dependencies(root, fetcher = fetch) {
  const packages = new Map();
  let lock = false;
  try {
    const stat = await fs.stat(path.join(root, "package-lock.json"));
    if (stat.size > 16_000_000) throw Error("lock too large");
    const json = JSON.parse(
      await fs.readFile(path.join(root, "package-lock.json"), "utf8"),
    );
    lock = true;
    for (const [key, value] of Object.entries(json.packages ?? {})) {
      const name = value.name || key.split("node_modules/").at(-1);
      if (key && name && /^\d+\./.test(value.version ?? ""))
        packages.set(`${name}@${value.version}`, {
          package: { name, ecosystem: "npm" },
          version: value.version,
        });
    }
  } catch (error) {
    if (error.code !== "ENOENT")
      return report(
        "inconclusive",
        "Lockfile npm inválido ou excedendo o limite.",
      );
  }
  if (!lock) {
    try {
      const { parse } = await import("yaml");
      const stat = await fs.stat(path.join(root, "pnpm-lock.yaml"));
      if (stat.size > 16_000_000) throw Error("lock too large");
      const json = parse(
        await fs.readFile(path.join(root, "pnpm-lock.yaml"), "utf8"),
      );
      lock = true;
      for (const key of Object.keys(json.packages ?? {})) {
        const clean = key.replace(/^\//, "").split("(")[0];
        const match = clean.match(/^(.+)@(\d+\.[^/]+)$/);
        if (match)
          packages.set(clean, {
            package: { name: match[1], ecosystem: "npm" },
            version: match[2],
          });
      }
    } catch (error) {
      if (error.code !== "ENOENT")
        return report(
          "inconclusive",
          "Lockfile pnpm inválido ou não suportado.",
        );
    }
  }
  if (!packages.size || packages.size > 5000)
    return report(
      "inconclusive",
      "É necessário um lockfile npm/pnpm suportado com até 5.000 dependências.",
    );
  const queries = [...packages.values()],
    findings = [];
  for (let start = 0; start < queries.length; start += 100) {
    const batch = queries.slice(start, start + 100);
    const response = await fetcher("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queries: batch }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      return report("inconclusive", "A consulta OSV não foi concluída.");
    const json = await response.json();
    if (!Array.isArray(json.results) || json.results.length !== batch.length)
      return report("inconclusive", "Resposta OSV incompleta.");
    json.results.forEach((result, index) => {
      for (const vulnerability of result.vulns ?? [])
        findings.push({
          file: batch[index].package.name,
          rule: String(vulnerability.id).slice(0, 200),
        });
    });
  }
  return report(
    findings.length ? "failed" : "passed",
    "Consulta à base OSV para versões exatas do lockfile npm/pnpm.",
    findings,
    { packages: queries.length, findings: findings.length },
  );
}
export async function browserCheck(kind, config) {
  const url = new URL(config.url);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.protocol !== "http:" ||
    url.username ||
    url.password
  )
    throw Error("Only local preview URLs are allowed");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      window.__sambaVitals = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          window.__sambaVitals.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (!e.hadRecentInput) window.__sambaVitals.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const response = await page.goto(url.href, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    if (!response?.ok())
      return report(
        "inconclusive",
        "A página não retornou uma resposta válida.",
      );
    if (kind === "accessibility") {
      const axe = await import("axe-core");
      const findings = [];
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await page.evaluate(axe.default.source);
        const result = await page.evaluate(async () =>
          window.axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
            },
          }),
        );
        for (const violation of result.violations)
          findings.push({ file: `viewport-${width}`, rule: violation.id });
      }
      return report(
        findings.length ? "failed" : "passed",
        "axe-core em desktop e mobile. Testes manuais de teclado/leitor de tela continuam necessários.",
        findings,
        { violations: findings.length },
      );
    }
    if (kind === "performance") {
      const metrics = await page.evaluate(() => ({
        lcpMs: window.__sambaVitals.lcp,
        cls: window.__sambaVitals.cls,
        domNodes: document.querySelectorAll("*").length,
      }));
      return report(
        !metrics.lcpMs
          ? "inconclusive"
          : metrics.lcpMs > config.maxLcpMs || metrics.cls > config.maxCls
            ? "failed"
            : "passed",
        "Medição de laboratório na preview atual, sem simulação de rede; não representa Core Web Vitals de usuários reais.",
        [],
        metrics,
      );
    }
    const { PNG } = await import("pngjs");
    const { default: pixelmatch } = await import("pixelmatch");
    const current = await page.screenshot({ animations: "disabled" });
    await fs.mkdir(config.artifactDir, { recursive: true });
    await fs.writeFile(path.join(config.artifactDir, "current.png"), current);
    let baseline;
    try {
      baseline = await fs.readFile(config.baseline);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!baseline)
      return report(
        "inconclusive",
        "Imagem capturada. Revise e aprove a referência visual antes da comparação.",
      );
    const a = PNG.sync.read(current),
      b = PNG.sync.read(baseline);
    if (a.width !== b.width || a.height !== b.height)
      return report("failed", "Dimensões diferentes da referência visual.");
    const diff = new PNG({ width: a.width, height: a.height });
    const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
      threshold: 0.1,
    });
    await fs.writeFile(
      path.join(config.artifactDir, "diff.png"),
      PNG.sync.write(diff),
    );
    return report(
      changed ? "failed" : "passed",
      "Comparação com referência aprovada; mudanças visuais exigem revisão humana.",
      [],
      { changedPixels: changed, totalPixels: a.width * a.height },
    );
  } finally {
    await browser.close();
  }
}
export async function execute(kind, config) {
  if (kind === "secrets") return secrets(config.root);
  if (kind === "dependencies") return dependencies(config.root);
  return browserCheck(kind, config);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const config = JSON.parse(await fs.readFile(process.argv[3], "utf8"));
    console.log(JSON.stringify(await execute(process.argv[2], config)));
  } catch {
    console.log(
      JSON.stringify(
        report(
          "inconclusive",
          "A verificação não pôde ser concluída. Confira as ferramentas e a preview.",
        ),
      ),
    );
    process.exitCode = 2;
  }
}
