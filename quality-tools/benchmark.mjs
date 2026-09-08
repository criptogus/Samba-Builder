import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
export const scenarios = [
  [
    "public-site",
    "Create a responsive service website for a local repair business. Working service request form with validation, keyboard access and recovery, explicit demo data, no fabricated testimonials.",
  ],
  [
    "tenant-portal",
    "Create a client portal with server-side authentication and authorization. Organization A cannot read or mutate organization B records. Include executable negative tests and setup with synthetic identities.",
  ],
  [
    "booking",
    "Create booking with a persistent backend. Concurrent reservations cannot take the same slot. Include integration tests for the race and cancellation/retry.",
  ],
  [
    "webhook",
    "Create a simulated payment webhook with signature validation and persistent idempotency. Test bad signature, duplicate event and failed processing. No real payment services.",
  ],
  [
    "large-data",
    "Create a dashboard for 100000 synthetic records with bounded queries and pagination. Document measurement and include tests for page boundaries and unauthorized access.",
  ],
  [
    "design-refactor",
    "Create a compact software-house project dashboard with semantic design tokens, mobile/desktop states, keyboard access, empty/error states and tests. Avoid generic landing-page composition.",
  ],
];
export function validateConfig(config) {
  if (
    !config ||
    !Number.isFinite(config.maxUSD) ||
    config.maxUSD <= 0 ||
    !Number.isFinite(config.inputUSDPerMillion) ||
    config.inputUSDPerMillion < 0 ||
    !Number.isFinite(config.outputUSDPerMillion) ||
    config.outputUSDPerMillion < 0 ||
    !Number.isInteger(config.maxOutputTokens) ||
    config.maxOutputTokens < 100 ||
    config.maxOutputTokens > 20000
  )
    throw Error("Set explicit budget, token prices and output limit.");
  if (
    !Array.isArray(config.arms) ||
    config.arms.length !== 2 ||
    config.arms.some((a) => typeof a.prompt !== "string" || !a.prompt.trim())
  )
    throw Error("Provide exactly two prompt versions.");
  if (typeof config.model !== "string" || !config.model.trim())
    throw Error("Choose a model explicitly.");
  const endpoint = new URL(config.baseUrl);
  if (
    endpoint.username ||
    endpoint.password ||
    !(
      endpoint.protocol === "https:" ||
      (endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname))
    )
  )
    throw Error("Use HTTPS or a local model endpoint.");
  return config;
}
export function safeOutput(root, file) {
  if (
    typeof file !== "string" ||
    file.includes("\\") ||
    file.includes("\0") ||
    file.includes(":") ||
    path.isAbsolute(file) ||
    file.split("/").some((s) => s === ".." || s === ".git")
  )
    throw Error("Unsafe output path");
  const target = path.resolve(root, file);
  if (!target.startsWith(path.resolve(root) + path.sep))
    throw Error("Unsafe output path");
  return target;
}
export async function benchmark(
  config,
  output,
  { fetcher = fetch, apiKey = process.env.SAMBA_BENCHMARK_API_KEY } = {},
) {
  validateConfig(config);
  await fs.mkdir(output, { recursive: true });
  const outputStat = await fs.lstat(output);
  if (
    outputStat.isSymbolicLink() ||
    !outputStat.isDirectory() ||
    (await fs.readdir(output)).length
  )
    throw Error("Use an empty output directory without symbolic links.");
  output = await fs.realpath(output);
  const records = [];
  let spent = 0;
  const save = () =>
    fs.writeFile(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          model: config.model,
          budgetUSD: config.maxUSD,
          spentUSD: spent,
          records,
          verification:
            "Generated artifacts only. Build, security, visual, load and usability results must be measured before ranking arms.",
        },
        null,
        2,
      ),
    );
  for (const [scenarioId, request] of scenarios)
    for (let arm = 0; arm < config.arms.length; arm++) {
      const prompt = config.arms[arm].prompt;
      const user =
        request +
        ' Return only JSON: {"files":[{"path":"relative/path","content":"complete contents"}]}. Include PRD, architecture, design system, README, dependency manifest and executable tests. Use synthetic data; no credentials. Clearly document missing integrations.';
      const inputUpperBound = Buffer.byteLength(prompt + user, "utf8") + 8192;
      const reserve =
        (inputUpperBound * config.inputUSDPerMillion +
          config.maxOutputTokens * config.outputUSDPerMillion) /
        1e6;
      if (spent + reserve > config.maxUSD) {
        records.push({ scenarioId, arm, status: "budget-blocked" });
        await save();
        return records;
      }
      const started = Date.now();
      try {
        const response = await fetcher(
          new URL(
            "chat/completions",
            config.baseUrl.endsWith("/")
              ? config.baseUrl
              : config.baseUrl + "/",
          ),
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
              model: config.model,
              messages: [
                { role: "system", content: prompt },
                { role: "user", content: user },
              ],
              max_tokens: config.maxOutputTokens,
              temperature: 0,
            }),
            signal: AbortSignal.timeout(180000),
          },
        );
        if (!response.ok) throw Error("Provider request failed");
        const result = await response.json();
        const usage = result.usage;
        if (
          !Number.isSafeInteger(usage?.prompt_tokens) ||
          !Number.isSafeInteger(usage?.completion_tokens) ||
          usage.prompt_tokens < 0 ||
          usage.completion_tokens < 0
        )
          throw Error(
            "Provider did not report usable token usage; stop to avoid unknown spending",
          );
        const cost =
          (usage.prompt_tokens * config.inputUSDPerMillion +
            usage.completion_tokens * config.outputUSDPerMillion) /
          1e6;
        spent += cost;
        const record = {
          scenarioId,
          arm,
          status: "generated",
          durationMs: Date.now() - started,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          costUSD: cost,
        };
        records.push(record);
        try {
          const content = result.choices?.[0]?.message?.content;
          const parsed = JSON.parse(content);
          if (
            !Array.isArray(parsed.files) ||
            !parsed.files.length ||
            parsed.files.length > 100
          )
            throw Error("Invalid generated file manifest");
          const scenarioDir = path.join(output, scenarioId);
          if (arm === 0) await fs.mkdir(scenarioDir);
          const dir = path.join(scenarioDir, `arm-${arm}`);
          await fs.mkdir(dir);
          let bytes = 0;
          for (const file of parsed.files) {
            if (
              typeof file.content !== "string" ||
              (bytes += Buffer.byteLength(file.content)) > 2_000_000
            )
              throw Error("Generated output limit");
            const target = safeOutput(dir, file.path);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, file.content, { flag: "wx" });
          }
        } catch {
          record.status = "invalid-output";
        }
        await save();
        if (spent > config.maxUSD) throw Error("Budget reached");
      } catch {
        records.push({
          scenarioId,
          arm,
          status: "interrupted",
          durationMs: Date.now() - started,
        });
        await save();
        return records;
      }
    }
  return records;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const config = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  await benchmark(config, path.resolve(process.argv[3]));
}
