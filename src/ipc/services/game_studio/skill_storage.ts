import * as fs from "node:fs/promises";
import path from "node:path";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { EXTENSION_SLUG_PATTERN } from "@/shared/extensions";
import { SKILL_FILE_NAME } from "../extensions/discovery";
import { USER_EXTENSIONS_DIRECTORY } from "../extensions/roots";

function invalidDestination(): never {
  throw new SambaError(
    "A pasta de destino da skill contém um link ou arquivo inválido.",
    SambaErrorKind.Validation,
  );
}

/** Reject links in every destination component before writing any skill. */
export async function safeSkillsDirectory(
  userDataDirectory: string,
): Promise<string> {
  await fs.mkdir(userDataDirectory, { recursive: true });
  let directory = await fs.realpath(userDataDirectory);
  for (const segment of [USER_EXTENSIONS_DIRECTORY, "skills"]) {
    directory = path.join(directory, segment);
    try {
      await fs.mkdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) invalidDestination();
  }
  return directory;
}

async function existingSkill(destination: string): Promise<boolean> {
  try {
    const directory = await fs.lstat(destination);
    if (directory.isSymbolicLink() || !directory.isDirectory())
      invalidDestination();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  try {
    const file = await fs.lstat(path.join(destination, SKILL_FILE_NAME));
    if (file.isSymbolicLink() || !file.isFile()) invalidDestination();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      invalidDestination();
    throw error;
  }
}

/** Publish complete directories atomically; never follow existing destination links. */
export async function installSkillFiles(
  userDataDirectory: string,
  slug: string,
  files: ReadonlyArray<{ relativePath: string; contents: string }>,
): Promise<"installed" | "already-present"> {
  if (!EXTENSION_SLUG_PATTERN.test(slug)) invalidDestination();
  const directory = await safeSkillsDirectory(userDataDirectory);
  const destination = path.join(directory, slug);
  if (await existingSkill(destination)) return "already-present";
  const staging = await fs.mkdtemp(path.join(directory, ".install-"));
  try {
    for (const file of files) {
      const target = path.resolve(staging, file.relativePath);
      if (!target.startsWith(staging + path.sep)) invalidDestination();
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.contents, {
        encoding: "utf8",
        flag: "wx",
      });
    }
    try {
      await fs.rename(staging, destination);
    } catch (error) {
      if (await existingSkill(destination)) return "already-present";
      throw error;
    }
    return "installed";
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}
