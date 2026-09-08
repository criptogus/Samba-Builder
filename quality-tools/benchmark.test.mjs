import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { benchmark, safeOutput, validateConfig } from "./benchmark.mjs";
const config = {
  baseUrl: "http://127.0.0.1:11434/v1/",
  model: "local-test",
  maxUSD: 1,
  inputUSDPerMillion: 1,
  outputUSDPerMillion: 1,
  maxOutputTokens: 100,
  arms: [{ prompt: "old" }, { prompt: "new" }],
};
test("requires explicit prices and budget", () =>
  assert.throws(() => validateConfig({ ...config, maxUSD: undefined })));
test("rejects file escape and Git metadata writes", () => {
  for (const p of ["../secret", "/tmp/secret", ".git/config", "C:\\secret"])
    assert.throws(() => safeOutput("/tmp/output", p));
});
test("budget exhaustion makes no provider request", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "benchmark-"));
  try {
    let calls = 0;
    await benchmark({ ...config, maxUSD: 0.00001 }, root, {
      fetcher: async () => {
        calls++;
        throw Error();
      },
    });
    assert.equal(calls, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test("persists measured tokens without claiming code execution", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "benchmark-"));
  try {
    let calls = 0;
    const records = await benchmark(config, root, {
      fetcher: async () => {
        calls++;
        return {
          ok: true,
          json: async () => ({
            usage: { prompt_tokens: 10, completion_tokens: 20 },
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    files: [
                      { path: "index.html", content: "<h1>Fixture</h1>" },
                    ],
                  }),
                },
              },
            ],
          }),
        };
      },
    });
    assert.equal(calls, 12);
    assert.equal(records[0].inputTokens, 10);
    const result = JSON.parse(
      await fs.readFile(path.join(root, "results.json")),
    );
    assert.match(result.verification, /Generated artifacts only/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("preexisting output cannot redirect generated files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "benchmark-existing-"));
  try {
    await fs.mkdir(path.join(root, "public-site"));
    let calls = 0;
    await assert.rejects(
      benchmark(config, root, {
        fetcher: async () => {
          calls++;
        },
      }),
      /empty output/,
    );
    assert.equal(calls, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
