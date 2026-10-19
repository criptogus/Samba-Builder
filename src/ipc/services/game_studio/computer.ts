import * as fs from "node:fs/promises";
import path from "node:path";
import type { GameComputerProgram } from "@/shared/game_studio";

export interface GameComputerProgramSpec {
  id: string;
  label: string;
  names: readonly string[];
}

/** Programas que mudam o que o construtor consegue fazer no computador. */
export const GAME_COMPUTER_PROGRAMS: readonly GameComputerProgramSpec[] = [
  { id: "node", label: "Node.js", names: ["node"] },
  { id: "blender", label: "Blender", names: ["blender"] },
  { id: "godot", label: "Godot", names: ["godot", "godot4"] },
  { id: "ffmpeg", label: "FFmpeg", names: ["ffmpeg"] },
  { id: "python", label: "Python", names: ["python3", "python"] },
];

function candidateNames(name: string): string[] {
  if (process.platform !== "win32") return [name];
  return [name, `${name}.exe`, `${name}.cmd`];
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(filePath);
    if (!stats.isFile() || stats.isSymbolicLink()) return false;
    await fs.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function programExists(
  spec: GameComputerProgramSpec,
  pathEntries: readonly string[],
): Promise<boolean> {
  for (const directory of pathEntries) {
    for (const name of spec.names) {
      for (const candidate of candidateNames(name)) {
        if (await isExecutable(path.join(directory, candidate))) return true;
      }
    }
  }
  return false;
}

export async function inspectGameComputer(
  pathEntries: readonly string[] = (process.env.PATH ?? "").split(
    path.delimiter,
  ),
): Promise<GameComputerProgram[]> {
  const programs: GameComputerProgram[] = [];
  for (const spec of GAME_COMPUTER_PROGRAMS) {
    programs.push({
      id: spec.id,
      label: spec.label,
      available: await programExists(spec, pathEntries),
    });
  }
  return programs;
}

export function formatGameComputer(
  programs: readonly GameComputerProgram[],
): string {
  return programs
    .map(
      (program) =>
        `- ${program.label}: ${program.available ? "disponível" : "ausente"}`,
    )
    .join("\n");
}
