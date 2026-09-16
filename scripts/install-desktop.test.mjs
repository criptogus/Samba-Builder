import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertInstallable,
  desktopBundledAppPath,
  installPlan,
  productNameFromManifest,
} from "./install-desktop.mjs";

function makeTempRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "samba-install-"));
  mkdirSync(path.join(root, "out", "desktop"), { recursive: true });
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "samba-builder", productName: "Samba Builder" }),
  );
  return root;
}

function packLocally(root, name, platform, arch) {
  const app = desktopBundledAppPath(root, name, platform, arch);
  mkdirSync(app, { recursive: true });
  writeFileSync(path.join(app, "marker"), "built");
  return app;
}

test("resolve o bundle empacotado por plataforma", () => {
  assert.equal(
    desktopBundledAppPath("root", "Samba Builder", "darwin", "arm64"),
    path.join(
      "root",
      "out/desktop/Samba Builder-darwin-arm64/Samba Builder.app",
    ),
  );
  assert.equal(
    desktopBundledAppPath("root", "Samba Builder", "win32", "x64"),
    path.join("root", "out/desktop/Samba Builder-win32-x64/Samba Builder.exe"),
  );
});

test("lê o nome do produto do package.json", () => {
  const root = makeTempRoot();
  try {
    assert.equal(productNameFromManifest(root), "Samba Builder");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recusa instalar quando o pacote local ainda não foi gerado", () => {
  const root = makeTempRoot();
  const destination = mkdtempSync(path.join(os.tmpdir(), "samba-dest-"));
  try {
    const plan = installPlan({
      root,
      name: "Samba Builder",
      platform: "darwin",
      arch: "arm64",
      destinationRoot: destination,
    });

    assert.equal(plan.replacingExisting, false);
    assert.throws(() => assertInstallable(plan), /desktop:build/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(destination, { recursive: true, force: true });
  }
});

test("planeja a substituição de uma instalação existente", () => {
  const root = makeTempRoot();
  const destination = mkdtempSync(path.join(os.tmpdir(), "samba-dest-"));
  try {
    packLocally(root, "Samba Builder", "darwin", "arm64");
    mkdirSync(path.join(destination, "Samba Builder.app"), { recursive: true });

    const plan = installPlan({
      root,
      name: "Samba Builder",
      platform: "darwin",
      arch: "arm64",
      destinationRoot: destination,
    });

    assert.equal(plan.replacingExisting, true);
    assert.equal(plan.destination, path.join(destination, "Samba Builder.app"));
    assert.doesNotThrow(() => assertInstallable(plan));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(destination, { recursive: true, force: true });
  }
});

test("recusa quando origem e destino são o mesmo caminho", () => {
  const root = makeTempRoot();
  try {
    packLocally(root, "Samba Builder", "darwin", "arm64");
    const plan = installPlan({
      root,
      name: "Samba Builder",
      platform: "darwin",
      arch: "arm64",
      // Destino é a própria pasta que contém o bundle.
      destinationRoot: path.dirname(
        desktopBundledAppPath(root, "Samba Builder", "darwin", "arm64"),
      ),
    });

    assert.equal(plan.samePath, true);
    assert.throws(() => assertInstallable(plan), /mesmo caminho/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
