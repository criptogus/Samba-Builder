// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
const state = vi.hoisted(() => ({ directory: "", token: "test-token" }));
vi.mock("electron", () => ({ app: { getPath: () => state.directory } }));
vi.mock("@/main/settings", () => ({
  readSettings: () => ({ githubAccessToken: { value: state.token } }),
}));
import {
  prepareProjectTemplate,
  publishProjectTemplate,
  cachedTeamTemplates,
  syncTeamTemplates,
  discardTemplateDraft,
} from "./store";
vi.mock("../../utils/git_utils", () => ({
  gitClone: vi.fn(),
  getCurrentCommitHash: vi.fn(),
}));
import { createFromTemplate } from "../../handlers/createFromTemplate";
import { snapshotTemplateFiles, safeTemplatePath } from "./files";
import { TeamTemplatesGithub } from "./github";
import {
  TEAM_TEMPLATE_DIRECTORY,
  TEAM_TEMPLATE_REPO,
} from "@/shared/project_templates";

const sha = (value: string) => createHash("sha1").update(value).digest("hex");
function fakeGithub() {
  const blobs = new Map<string, Buffer>();
  const trees = new Map<string, any[]>();
  const commits = new Map<string, string>();
  const baseTree = sha("original-tree");
  let head = sha("original-commit");
  commits.set(head, baseTree);
  trees.set(baseTree, [
    {
      path: "keep.txt",
      type: "blob",
      mode: "100644",
      content: "Existing repository file",
    },
  ]);
  let rejectPush = false;
  const calls: { route: string; method: string; body: any }[] = [];
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toMatch(
        `https://api.github.com/repos/${TEAM_TEMPLATE_REPO}`,
      );
      const route = String(url).split(TEAM_TEMPLATE_REPO)[1];
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ route, method, body });
      const reply = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), { status });
      if (route === "") return reply({ default_branch: "main", private: true });
      if (route === "/git/ref/heads/main")
        return reply({ object: { sha: head } });
      if (route.startsWith("/contents/")) {
        const index = trees
          .get(commits.get(head)!)
          ?.find(
            (item) => item.path === `${TEAM_TEMPLATE_DIRECTORY}/index.json`,
          );
        return index
          ? reply({
              encoding: "base64",
              content: Buffer.from(index.content).toString("base64"),
            })
          : reply({}, 404);
      }
      if (route === "/git/blobs" && method === "POST") {
        const content = Buffer.from(body.content, "base64");
        const id = createHash("sha1")
          .update(`blob ${content.length}\0`)
          .update(content)
          .digest("hex");
        blobs.set(id, content);
        return reply({ sha: id }, 201);
      }
      if (route === "/git/trees" && method === "POST") {
        const tree = [
          ...(trees.get(body.base_tree) ?? []).filter(
            (item) => !body.tree.some((other: any) => other.path === item.path),
          ),
          ...body.tree,
        ];
        const id = sha(JSON.stringify(tree));
        trees.set(id, tree);
        return reply({ sha: id }, 201);
      }
      if (route === "/git/commits" && method === "POST") {
        const id = sha(JSON.stringify(body));
        commits.set(id, body.tree);
        return reply({ sha: id }, 201);
      }
      if (route.startsWith("/git/commits/"))
        return reply({ tree: { sha: commits.get(route.split("/").pop()!) } });
      if (route === "/git/refs/heads/main" && method === "PATCH") {
        expect(body.force).toBe(false);
        if (rejectPush) return reply({}, 422);
        head = body.sha;
        return reply({ object: { sha: head } });
      }
      if (route.startsWith("/git/trees/")) {
        const id = route.split("/").pop()!.split("?")[0];
        return reply({
          truncated: false,
          tree: trees
            .get(id)!
            .map((item) => ({ ...item, size: blobs.get(item.sha)?.length })),
        });
      }
      if (route.startsWith("/git/blobs/"))
        return reply({
          content: blobs.get(route.split("/").pop()!)!.toString("base64"),
          encoding: "base64",
        });
      throw new Error(`Unexpected ${method} ${route}`);
    },
  );
  return {
    fetcher,
    calls,
    trees,
    get root() {
      return trees.get(commits.get(head)!)!;
    },
    conflict: () => {
      rejectPush = true;
    },
  };
}
let source: string;
beforeEach(async () => {
  state.directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "samba-template-test-"),
  );
  source = path.join(state.directory, "source");
  state.token = "test-token";
  await fs.mkdir(source);
  await fs.writeFile(
    path.join(source, "package.json"),
    '{"scripts":{"dev":"vite"}}',
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(state.directory, { recursive: true, force: true });
});

it("publishes a reviewed snapshot atomically, preserves repository files and recreates an independent project", async () => {
  const remote = fakeGithub();
  vi.stubGlobal("fetch", remote.fetcher);
  await fs.writeFile(path.join(source, "hello.txt"), "Original source");
  await fs.writeFile(path.join(source, ".env.local"), "SECRET=private");
  const draft = await prepareProjectTemplate(source, {
    title: "Portal",
    description: "Base da equipe",
  });
  expect(remote.calls).toHaveLength(0); // Review has no upload.
  await fs.writeFile(path.join(source, "hello.txt"), "Changed after review");
  const template = await publishProjectTemplate(draft.id);
  expect(template.isTeam).toBe(true);
  expect(remote.root.find((item) => item.path === "keep.txt").content).toBe(
    "Existing repository file",
  );
  expect(remote.calls.filter((call) => call.method === "PATCH")).toHaveLength(
    1,
  );
  expect(JSON.stringify(remote.calls)).not.toContain("SECRET");
  expect(await cachedTeamTemplates()).toEqual([template]);
  // A fresh team member discovers the same catalog before downloading it.
  await fs.rm(path.join(state.directory, "team-templates", "index.json"));
  expect(await syncTeamTemplates()).toEqual({ count: 1, private: true });
  const destination = path.join(state.directory, "new-project");
  await createFromTemplate({
    templateId: template.id,
    fullAppPath: destination,
  });
  expect(await fs.readFile(path.join(destination, "hello.txt"), "utf8")).toBe(
    "Original source",
  );
  await expect(
    fs.access(path.join(destination, ".env.local")),
  ).rejects.toThrow();
  expect(await fs.readFile(path.join(source, "hello.txt"), "utf8")).toBe(
    "Changed after review",
  );
});
it("excludes dependencies, nested credentials, ignored files and symlinks while preserving nested unignore rules", async () => {
  for (const folder of ["node_modules", ".git", "src"])
    await fs.mkdir(path.join(source, folder));
  await fs.writeFile(path.join(source, ".gitignore"), "*.local\n*.txt\n");
  await fs.writeFile(path.join(source, "src", ".gitignore"), "!keep.txt\n");
  for (const name of [
    "node_modules/heavy",
    ".git/config",
    "src/.env",
    "src/.npmrc",
    "src/key.pem",
    "src/private.local",
    "src/drop.txt",
    "src/keep.txt",
  ])
    await fs.writeFile(path.join(source, name), name);
  await fs.symlink(
    path.join(source, "package.json"),
    path.join(source, "linked.json"),
  );
  const draft = await prepareProjectTemplate(source, {
    title: "Base",
    description: "Fonte",
  });
  expect(draft.files.map((file) => file.path)).toEqual([
    ".gitignore",
    "package.json",
    "src/.gitignore",
    "src/keep.txt",
  ]);
  expect(draft.excluded).toBeGreaterThan(5);
});
it("cleans partial snapshots when size limits fail", async () => {
  const file = await fs.open(path.join(source, "large.bin"), "w");
  await file.truncate(20_000_001);
  await file.close();
  await expect(
    prepareProjectTemplate(source, { title: "Base", description: "Fonte" }),
  ).rejects.toThrow("Limite");
  expect(
    await fs.readdir(path.join(state.directory, "team-templates", "drafts")),
  ).toEqual([]);
});
it("requires authentication and never mutates the repository on an unreviewed draft", async () => {
  const remote = fakeGithub();
  vi.stubGlobal("fetch", remote.fetcher);
  state.token = "";
  const draft = await prepareProjectTemplate(source, {
    title: "Base",
    description: "Fonte",
  });
  await expect(publishProjectTemplate(draft.id)).rejects.toThrow(
    "Conecte sua conta",
  );
  expect(remote.calls).toHaveLength(0);
  await discardTemplateDraft(draft.id);
  await expect(publishProjectTemplate(draft.id)).rejects.toThrow();
});
it("retains a draft and the old catalog when concurrent pushes conflict", async () => {
  const remote = fakeGithub();
  vi.stubGlobal("fetch", remote.fetcher);
  remote.conflict();
  const draft = await prepareProjectTemplate(source, {
    title: "Base",
    description: "Fonte",
  });
  await expect(publishProjectTemplate(draft.id)).rejects.toThrow(
    "nenhuma alteração será forçada",
  );
  expect(remote.root.map((item) => item.path)).toEqual(["keep.txt"]);
  expect(await cachedTeamTemplates()).toEqual([]);
  await expect(
    fs.access(
      path.join(
        state.directory,
        "team-templates",
        "drafts",
        draft.id,
        "draft.json",
      ),
    ),
  ).resolves.toBeUndefined();
});
it("rejects traversal, symlinks, submodules and oversized remote inventories before writing", async () => {
  for (const entry of [
    { path: "../escape", mode: "100644", type: "blob" },
    { path: "link", mode: "120000", type: "blob" },
    { path: "module", mode: "160000", type: "commit" },
  ]) {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          truncated: false,
          tree: [{ ...entry, sha: sha("blob"), size: 1 }],
        }),
      ),
    );
    const remote = new TeamTemplatesGithub("key", fetcher);
    await expect(
      remote.download(
        {
          id: "9e9674ad-184f-4bcf-a12d-3f26c2ad975a",
          title: "Base",
          description: "Fonte",
          createdAt: new Date().toISOString(),
          treeSha: sha("tree"),
        },
        path.join(state.directory, "target"),
      ),
    ).rejects.toThrow("incompatível");
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});
it("rejects modified reviewed copies before uploading their content", async () => {
  const remote = fakeGithub();
  vi.stubGlobal("fetch", remote.fetcher);
  const draft = await prepareProjectTemplate(source, {
    title: "Base",
    description: "Fonte",
  });
  await fs.writeFile(
    path.join(
      state.directory,
      "team-templates",
      "drafts",
      draft.id,
      "files",
      "package.json",
    ),
    "tampered",
  );
  await expect(publishProjectTemplate(draft.id)).rejects.toThrow(
    "alterado após a revisão",
  );
  expect(remote.calls.every((call) => call.method === "GET")).toBe(true);
});
it("validates cross-platform paths and leaves the source unchanged", async () => {
  for (const name of [
    "/absolute",
    "a/../b",
    "C:/file",
    "src\\evil",
    "CON.txt",
    "folder/trailing.",
    "x/.env",
    "x/id.key",
  ])
    expect(safeTemplatePath(name)).toBe(false);
  expect(safeTemplatePath("src/Olá.tsx")).toBe(true);
  const destination = path.join(state.directory, "copy");
  await snapshotTemplateFiles(source, destination);
  expect(await fs.readdir(source)).toEqual(["package.json"]);
});

it("reserves queued publications before a closing window can discard their drafts", async () => {
  const remote = fakeGithub();
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const started = new Promise<void>((r) => {
    entered = r;
  });
  let first = true;
  vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
    if (first) {
      first = false;
      entered();
      await gate;
    }
    return remote.fetcher(...args);
  });
  const firstDraft = await prepareProjectTemplate(source, {
    title: "First",
    description: "Base",
  });
  const secondDraft = await prepareProjectTemplate(source, {
    title: "Second",
    description: "Base",
  });
  const firstPublish = publishProjectTemplate(firstDraft.id);
  await started;
  const secondPublish = publishProjectTemplate(secondDraft.id);
  const discard = discardTemplateDraft(secondDraft.id);
  release();
  const results = await Promise.allSettled([
    firstPublish,
    secondPublish,
    discard,
  ]);
  expect(results.map((result) => result.status)).toEqual([
    "fulfilled",
    "fulfilled",
    "fulfilled",
  ]);
  expect(await cachedTeamTemplates()).toHaveLength(2);
});
