import path from "node:path";
import { getUserDataPath } from "@/paths/paths";
import type { GameStudioSnapshot } from "@/shared/game_studio";
import { listExtensions } from "@/ipc/services/extensions/load";
import { USER_EXTENSIONS_DIRECTORY } from "@/ipc/services/extensions/roots";
import { BUNDLED_GAME_SKILLS, ensureBundledGameSkills } from "./bundled_skills";
import { inspectGameComputer } from "./computer";
import { discoverMachineSkills } from "./machine_skills";

export async function readGameStudioSnapshot(options?: {
  home?: string;
  userDataDirectory?: string;
  pathEntries?: readonly string[];
}): Promise<GameStudioSnapshot> {
  const userDataDirectory = options?.userDataDirectory ?? getUserDataPath();
  await ensureBundledGameSkills(userDataDirectory);
  const installed = await listExtensions(
    [
      {
        scope: "user",
        directory: path.join(userDataDirectory, USER_EXTENSIONS_DIRECTORY),
      },
    ],
    "skill",
  );
  const slugs = new Set(installed.map((entry) => entry.slug));
  const [discovered, computer] = await Promise.all([
    discoverMachineSkills({
      home: options?.home,
      installedSlugs: slugs,
    }),
    inspectGameComputer(options?.pathEntries),
  ]);
  return {
    bundled: BUNDLED_GAME_SKILLS.map((skill) => ({
      slug: skill.slug,
      title: skill.title,
      description: skill.description,
      installed: slugs.has(skill.slug),
    })),
    discovered,
    computer,
  };
}
