import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { readFileSync } from "node:fs";
import { desktopExecutable, desktopLaunchOptions } from "./start-desktop.mjs";

test("the shipped manifest has one Samba product name and resolves the branded executable", () => {
  const source = readFileSync(
    new URL("../package.json", import.meta.url),
    "utf8",
  );
  assert.equal((source.match(/"productName"\s*:/g) || []).length, 1);
  const pkg = JSON.parse(source);
  assert.equal(pkg.productName, "Samba Builder");
  assert.match(
    desktopExecutable("root", pkg.productName, "darwin", "arm64"),
    /Samba Builder\.app/,
  );
});

test("resolves separate native desktop packages on Mac and Windows", () => {
  assert.equal(
    desktopExecutable("root", "Samba Builder", "darwin", "arm64"),
    path.join(
      "root",
      "out/desktop/Samba Builder-darwin-arm64/Samba Builder.app/Contents/MacOS/Samba Builder",
    ),
  );
  assert.equal(
    desktopExecutable("root", "Samba Builder", "win32", "x64"),
    path.join("root", "out/desktop/Samba Builder-win32-x64/Samba Builder.exe"),
  );
});
test("keeps the local profile and launches without shell or development environment", () => {
  const env = {
    NODE_ENV: "development",
    ELECTRON_RUN_AS_NODE: "1",
    E2E_TEST_BUILD: "true",
    DYAD_DEV_USER_DATA_DIR: "profile with spaces & %",
  };
  const { args, options } = desktopLaunchOptions("root", env);
  assert.deepEqual(args, [
    `--user-data-dir=${path.resolve("root", env.DYAD_DEV_USER_DATA_DIR)}`,
  ]);
  assert.equal(options.shell, false);
  assert.equal(options.env.NODE_ENV, "production");
  assert.equal(options.env.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(options.env.E2E_TEST_BUILD, undefined);
  assert.equal(env.NODE_ENV, "development");
  assert.deepEqual(desktopLaunchOptions("root", {}).args, [
    `--user-data-dir=${path.resolve("root", "userData")}`,
  ]);
});
