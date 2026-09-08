import { app } from "electron";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  TemplateIdSchema,
  TemplateDraftSchema,
  TeamTemplateIndexSchema,
  TEAM_TEMPLATE_URL,
  TEAM_TEMPLATE_DIRECTORY,
  teamTemplateId,
  type TemplateDraft,
  type TeamTemplateEntry,
} from "@/shared/project_templates";
import type { Template } from "@/shared/templates";
import { readSettings } from "@/main/settings";
import { withLock } from "../../utils/lock_utils";
import { snapshotTemplateFiles } from "./files";
import { TeamTemplatesGithub } from "./github";

function root() {
  return path.join(app.getPath("userData"), "team-templates");
}
function draftPath(id: string) {
  return path.join(root(), "drafts", TemplateIdSchema.parse(id));
}
function github() {
  return new TeamTemplatesGithub(readSettings().githubAccessToken?.value);
}
async function readIndex() {
  try {
    return TeamTemplateIndexSchema.parse(
      JSON.parse(await fs.readFile(path.join(root(), "index.json"), "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { version: 1 as const, templates: [] };
    throw error;
  }
}
async function writeIndex(
  index: ReturnType<typeof TeamTemplateIndexSchema.parse>,
) {
  await fs.mkdir(root(), { recursive: true });
  const temporary = path.join(root(), `${randomUUID()}.json`);
  try {
    await fs.writeFile(temporary, JSON.stringify(index));
    await fs.rename(temporary, path.join(root(), "index.json"));
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
function toTemplate(entry: TeamTemplateEntry): Template {
  return {
    id: teamTemplateId(entry.id),
    title: entry.title,
    description: entry.description,
    imageUrl: "",
    githubUrl: `${TEAM_TEMPLATE_URL}/tree/HEAD/${TEAM_TEMPLATE_DIRECTORY}/${entry.id}`,
    isOfficial: false,
    isTeam: true,
  };
}
export async function cachedTeamTemplates() {
  return (await readIndex()).templates.map(toTemplate);
}
export async function syncTeamTemplates() {
  return withLock("team-templates:catalog", async () => {
    const remote = github();
    const head = await remote.head();
    const index = await remote.index(head.sha);
    await writeIndex(index);
    return { count: index.templates.length, private: head.private };
  });
}
async function prepareProjectTemplateUnlocked(
  source: string,
  metadata: Pick<TemplateDraft, "title" | "description">,
) {
  const id = randomUUID();
  const folder = draftPath(id);
  await fs.mkdir(path.join(root(), "drafts"), { recursive: true });
  // Interrupted reviews expire without a resident cleanup process.
  for (const entry of await fs.readdir(path.join(root(), "drafts"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory() || !TemplateIdSchema.safeParse(entry.name).success)
      continue;
    const old = draftPath(entry.name);
    const stat = await fs.stat(old).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    });
    if (stat && Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000)
      await discardTemplateDraft(entry.name);
  }
  try {
    const snapshot = await snapshotTemplateFiles(
      source,
      path.join(folder, "files"),
    );
    const draft = TemplateDraftSchema.parse({
      ...metadata,
      ...snapshot,
      id,
      createdAt: new Date().toISOString(),
    });
    await fs.writeFile(path.join(folder, "draft.json"), JSON.stringify(draft));
    return draft;
  } catch (error) {
    await fs.rm(folder, { recursive: true, force: true });
    throw error;
  }
}
export async function prepareProjectTemplate(
  source: string,
  metadata: Pick<TemplateDraft, "title" | "description">,
) {
  return withLock("team-templates:prepare", () =>
    prepareProjectTemplateUnlocked(source, metadata),
  );
}
export async function discardTemplateDraft(id: string) {
  return withLock(`team-template:${TemplateIdSchema.parse(id)}`, () =>
    fs.rm(draftPath(id), { recursive: true, force: true }),
  );
}
async function publishProjectTemplateUnlocked(id: string) {
  return withLock("team-templates:publish", async () => {
    const folder = draftPath(id);
    const draft = TemplateDraftSchema.parse(
      JSON.parse(await fs.readFile(path.join(folder, "draft.json"), "utf8")),
    );
    if (draft.id !== id) throw new Error("Rascunho de template inválido.");
    const entry = await github().publish(draft, path.join(folder, "files"));
    await withLock("team-templates:catalog", async () => {
      const index = await readIndex();
      await writeIndex({
        version: 1,
        templates: [...index.templates.filter((item) => item.id !== id), entry],
      });
    });
    await fs.rm(folder, { recursive: true, force: true });
    return toTemplate(entry);
  });
}
export async function publishProjectTemplate(id: string) {
  // Reserve this draft before queuing the single uploader so closing another
  // window cannot discard an already-admitted publication.
  return withLock(`team-template:${TemplateIdSchema.parse(id)}`, () =>
    publishProjectTemplateUnlocked(id),
  );
}
export async function createFromTeamTemplate(
  templateId: string,
  destination: string,
) {
  const id = TemplateIdSchema.parse(templateId.slice("team:".length));
  const entry = (await readIndex()).templates.find((item) => item.id === id);
  if (!entry)
    throw new Error(
      "Template da equipe não encontrado. Atualize o catálogo em Templates.",
    );
  const staging = path.join(root(), `download-${randomUUID()}`);
  try {
    await github().download(entry, staging);
    async function copyDirectory(source: string, target: string) {
      await fs.mkdir(target, { recursive: true });
      for (const file of await fs.readdir(source, { withFileTypes: true })) {
        const from = path.join(source, file.name);
        const to = path.join(target, file.name);
        if (file.isDirectory()) await copyDirectory(from, to);
        else await fs.copyFile(from, to, constants.COPYFILE_EXCL);
      }
    }
    await copyDirectory(staging, destination);
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}
