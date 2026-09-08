import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getUserDataPath } from "@/paths/paths";
import { withLock } from "@/ipc/utils/lock_utils";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import {
  StoreSchema,
  type FactoryProject,
  type FactoryStore,
} from "../../../../packages/samba-factory/src/schema";

export async function readFactoryStore(): Promise<FactoryStore> {
  try {
    return StoreSchema.parse(
      JSON.parse(
        await fs.readFile(
          path.join(getUserDataPath(), "samba-factory.json"),
          "utf8",
        ),
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return { version: 1, projects: [] };
    throw new SambaError(
      "Não foi possível ler o registro da Fábrica. Preserve o arquivo samba-factory.json e restaure o backup.",
      SambaErrorKind.Precondition,
    );
  }
}
export async function writeFactoryStore(
  update: (store: FactoryStore) => FactoryStore,
): Promise<FactoryStore> {
  return withLock("samba-factory-store", async () => {
    const next = StoreSchema.parse(update(await readFactoryStore()));
    const target = path.join(getUserDataPath(), "samba-factory.json");
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(next, null, 2), {
        mode: 0o600,
        flag: "wx",
      });
      await fs.rename(temporary, target);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return next;
  });
}
export async function getFactoryProject(
  appId: number,
): Promise<FactoryProject | undefined> {
  return (await readFactoryStore()).projects.find(
    (project) => project.appId === appId,
  );
}
export async function mutateFactoryProject(
  appId: number,
  revision: number,
  update: (project: FactoryProject) => FactoryProject,
) {
  const store = await writeFactoryStore((current) => {
    const project = current.projects.find((entry) => entry.appId === appId);
    if (!project)
      throw new SambaError(
        "Projeto não cadastrado na Fábrica.",
        SambaErrorKind.NotFound,
      );
    if (project.revision !== revision)
      throw new SambaError(
        "O projeto mudou em outra janela. Atualize antes de continuar.",
        SambaErrorKind.Conflict,
      );
    return {
      ...current,
      projects: current.projects.map((entry) =>
        entry.appId === appId ? update(entry) : entry,
      ),
    };
  });
  return store.projects.find((entry) => entry.appId === appId)!;
}
