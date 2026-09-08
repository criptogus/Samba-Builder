import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { secrets, dependencies, browserCheck } from "./runner.mjs";
test("Secretlint detects a synthetic token without returning its value", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "secretlint-"));
  try {
    const token = "ghp_" + "A".repeat(36);
    await fs.writeFile(path.join(root, "app.txt"), token);
    const r = await secrets(root);
    assert.equal(r.status, "failed");
    assert.ok(!JSON.stringify(r).includes(token));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test("OSV failure and missing lockfiles are never passes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "osv-"));
  try {
    assert.equal((await dependencies(root)).status, "inconclusive");
    await fs.writeFile(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        packages: { "node_modules/test": { version: "1.0.0" } },
      }),
    );
    assert.equal(
      (await dependencies(root, async () => ({ ok: false }))).status,
      "inconclusive",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test("real Chromium detects accessibility defects and visual changes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "visual-"));
  let text = "First";
  const server = http
    .createServer((req, res) =>
      res.end(
        `<!doctype html><html lang="en"><title>Fixture</title><body><main><h1>${text}</h1><button></button></main></body></html>`,
      ),
    )
    .listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const config = {
    url: `http://127.0.0.1:${server.address().port}`,
    artifactDir: root,
    baseline: path.join(root, "baseline.png"),
    maxLcpMs: 60000,
    maxCls: 1,
  };
  try {
    assert.equal(
      (await browserCheck("accessibility", config)).status,
      "failed",
    );
    assert.equal((await browserCheck("visual", config)).status, "inconclusive");
    await fs.copyFile(path.join(root, "current.png"), config.baseline);
    assert.equal((await browserCheck("visual", config)).status, "passed");
    text = "Completely changed";
    assert.equal((await browserCheck("visual", config)).status, "failed");
    const perf = await browserCheck("performance", config);
    assert.ok(perf.metrics.lcpMs > 0);
  } finally {
    server.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("empty source coverage is inconclusive", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "empty-secrets-"));
  try {
    assert.equal((await secrets(root)).status, "inconclusive");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
