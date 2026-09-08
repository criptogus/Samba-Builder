import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareAwsSource } from "./aws_source";
let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "aws-source-test-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});
describe("isolated AWS build context", () => {
  it("omits local secrets, dependencies and caches, and detects source edits", async () => {
    const source = path.join(root, "source");
    const destination = path.join(root, "context");
    await fs.mkdir(source);
    await fs.writeFile(path.join(source, "Dockerfile"), "FROM node:24\n");
    await fs.writeFile(path.join(source, "server.js"), "console.log('ok');");
    await fs.writeFile(path.join(source, ".env.production"), "SECRET=private");
    await fs.writeFile(path.join(source, "private.pem"), "private");
    await fs.mkdir(path.join(source, "node_modules"));
    await fs.writeFile(path.join(source, "node_modules", "large.js"), "cache");
    const review = await prepareAwsSource(source);
    expect(await prepareAwsSource(source, destination)).toEqual(review);
    expect((await fs.readdir(destination)).sort()).toEqual([
      "Dockerfile",
      "server.js",
    ]);
    await fs.writeFile(path.join(source, "server.js"), "changed");
    expect((await prepareAwsSource(source)).sourceDigest).not.toBe(
      review.sourceDigest,
    );
  });
  it("rejects missing Dockerfile and symbolic links", async () => {
    await expect(prepareAwsSource(root)).rejects.toThrow("Dockerfile");
    await fs.writeFile(path.join(root, "Dockerfile"), "FROM scratch");
    await fs.symlink(path.join(root, "Dockerfile"), path.join(root, "link"));
    await expect(prepareAwsSource(root)).rejects.toThrow("simbólico");
  });
  it("rejects oversized individual files before reading them into memory", async () => {
    await fs.writeFile(path.join(root, "Dockerfile"), "FROM scratch");
    const handle = await fs.open(path.join(root, "large.bin"), "w");
    await handle.truncate(21 * 1024 * 1024);
    await handle.close();
    await expect(prepareAwsSource(root)).rejects.toThrow("limite");
  });
});
it("honors root and nested gitignore rules without allowing credentials back in", async () => {
  const source = path.join(root, "source");
  const context = path.join(root, "context");
  await fs.mkdir(source);
  await fs.writeFile(path.join(source, "Dockerfile"), "FROM scratch");
  await fs.writeFile(path.join(source, ".gitignore"), "private.json\n!.env\n");
  await fs.writeFile(path.join(source, "private.json"), "secret");
  await fs.writeFile(path.join(source, ".env"), "secret");
  await fs.mkdir(path.join(source, "backend"));
  await fs.writeFile(
    path.join(source, "backend", ".gitignore"),
    "private.json\n",
  );
  await fs.writeFile(path.join(source, "backend", "private.json"), "secret");
  await prepareAwsSource(source, context);
  await expect(fs.stat(path.join(context, "private.json"))).rejects.toThrow();
  await expect(
    fs.stat(path.join(context, "backend", "private.json")),
  ).rejects.toThrow();
  await expect(fs.stat(path.join(context, ".env"))).rejects.toThrow();
});
