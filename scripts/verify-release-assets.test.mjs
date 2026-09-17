import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  resolveRepository,
  verifyRequiredPlatforms,
  verifyReleaseAssetProvenance,
} = require("./verify-release-assets.js");

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const asset = (name, bytes) => ({
  name,
  size: bytes.byteLength,
  digest: `sha256:${sha256(bytes)}`,
});

test("resolve o repositorio a partir do ambiente do Actions, nunca de valor fixo", () => {
  assert.deepEqual(
    resolveRepository({ GITHUB_REPOSITORY: "criptogus/Samba-Builder" }),
    {
      owner: "criptogus",
      repo: "Samba-Builder",
    },
  );
  assert.deepEqual(resolveRepository({ GITHUB_REPOSITORY: "outro/fork" }), {
    owner: "outro",
    repo: "fork",
  });
});

test("cai no repositorio padrao quando o ambiente nao informa", () => {
  assert.deepEqual(resolveRepository({}), {
    owner: "criptogus",
    repo: "Samba-Builder",
  });
});

test("recusa slug de repositorio invalido", () => {
  assert.throws(
    () => resolveRepository({ GITHUB_REPOSITORY: "sem-barra" }),
    /invalid repository slug/,
  );
});

test("exige um manifesto de proveniencia por plataforma", () => {
  assert.throws(
    () => verifyRequiredPlatforms([{ name: "release-provenance-macos.json" }]),
    /macos-intel/,
  );

  verifyRequiredPlatforms(
    ["linux", "macos", "macos-intel", "windows"].map((platform) => ({
      name: `release-provenance-${platform}.json`,
    })),
  );
});

test("proveniencia rejeita asset cujo digest nao bate", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "provenance-"));
  const artifactBytes = Buffer.from("binario");
  const manifest = {
    artifacts: [
      {
        name: "Samba.Builder-darwin-arm64-1.14.0-beta.7.zip",
        sha256: sha256(artifactBytes),
        size: artifactBytes.byteLength,
      },
    ],
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  fs.writeFileSync(
    path.join(directory, "release-provenance-macos.json"),
    manifestBytes,
  );

  const tampered = Buffer.from("outro binario");
  assert.throws(
    () =>
      verifyReleaseAssetProvenance(
        [
          asset("release-provenance-macos.json", manifestBytes),
          asset("Samba.Builder-darwin-arm64-1.14.0-beta.7.zip", tampered),
        ],
        directory,
      ),
    /does not match provenance/,
  );

  verifyReleaseAssetProvenance(
    [
      asset("release-provenance-macos.json", manifestBytes),
      asset("Samba.Builder-darwin-arm64-1.14.0-beta.7.zip", artifactBytes),
    ],
    directory,
  );
});
