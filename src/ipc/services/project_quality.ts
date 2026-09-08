import { app, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { apps, projectQualityRuns } from "@/db/schema";
import { getSambaAppPath } from "@/paths/paths";
import { QualityReportSchema, type QualityKind } from "@/delivery/quality";
import { spawnStreaming } from "../utils/spawn_streaming";
import {
  getManagedNodeBinaryPath,
  getManagedNodeNpmCommand,
  isManagedNodeInstalled,
  withManagedNodePath,
} from "../utils/managed_node";
import { runningApps } from "../utils/process_manager";
import { readDeliveryCommit } from "./delivery_readiness";
let active: AbortController | null = null;
const home = () => path.join(app.getPath("userData"), "quality");
const sources = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "quality-tools")
    : path.join(process.cwd(), "quality-tools");
async function toolDirectory() {
  const lock = await fs.readFile(path.join(sources(), "package-lock.json"));
  return path.join(
    home(),
    "tools-" + createHash("sha256").update(lock).digest("hex").slice(0, 16),
  );
}
async function runtime() {
  const managed = await isManagedNodeInstalled();
  const env: NodeJS.ProcessEnv = {};
  for (const name of [
    "PATH",
    "Path",
    "HOME",
    "USERPROFILE",
    "SystemRoot",
    "SYSTEMROOT",
    "COMSPEC",
    "ComSpec",
    "TEMP",
    "TMP",
    "TMPDIR",
    "LOCALAPPDATA",
    "APPDATA",
  ])
    if (process.env[name]) env[name] = process.env[name];
  return {
    node: managed
      ? getManagedNodeBinaryPath()
      : process.platform === "win32"
        ? "node.exe"
        : "node",
    npm: managed ? getManagedNodeNpmCommand() : "npm",
    env: withManagedNodePath(env),
  };
}
export function cancelQuality() {
  active?.abort();
}
export async function installQualityTools() {
  if (active)
    throw new Error("Uma verificação ou instalação já está em andamento.");
  active = new AbortController();
  try {
    const root = await toolDirectory();
    await fs.mkdir(root, { recursive: true });
    for (const file of ["package.json", "package-lock.json", "runner.mjs"])
      await fs.copyFile(path.join(sources(), file), path.join(root, file));
    const rt = await runtime();
    for (const [command, args] of [
      [rt.npm, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]],
      [
        rt.node,
        [
          path.join(root, "node_modules/playwright/cli.js"),
          "install",
          "chromium",
        ],
      ],
    ] as const) {
      const result = await spawnStreaming({
        command,
        args: [...args],
        cwd: root,
        env: rt.env,
        signal: active.signal,
        timeoutMs: 600000,
      });
      if (result.code !== 0 || result.aborted || result.timedOut)
        throw new Error(
          "Instalação não concluída. Verifique Node.js 22+, rede e espaço em disco; tente novamente.",
        );
    }
    await fs.writeFile(path.join(root, ".ready"), "1");
  } finally {
    active = null;
  }
}
export async function listQualityRuns(appId: number) {
  return db
    .select()
    .from(projectQualityRuns)
    .where(eq(projectQualityRuns.appId, appId))
    .orderBy(desc(projectQualityRuns.createdAt))
    .limit(30)
    .all()
    .map(({ appId: _, report, ...row }) => ({
      ...row,
      report: QualityReportSchema.parse(JSON.parse(report)),
    }));
}
export async function runQuality(
  appId: number,
  kind: QualityKind,
  limits: { maxLcpMs: number; maxCls: number },
) {
  if (active)
    throw new Error(
      "Uma verificação já está em andamento. Aguarde ou cancele.",
    );
  const record = db.select().from(apps).where(eq(apps.id, appId)).get();
  if (!record) throw new Error("Projeto não encontrado.");
  active = new AbortController();
  const id = randomUUID(),
    createdAt = Date.now(),
    root = getSambaAppPath(record.path);
  const artifactDir = path.join(home(), String(appId), id);
  let commit: string | null = null;
  let report = QualityReportSchema.parse({
    status: "inconclusive",
    summary: "Verificação interrompida ou incompleta.",
    findings: [],
  });
  try {
    const tools = await toolDirectory();
    await fs.access(path.join(tools, ".ready"));
    commit = await readDeliveryCommit(root).catch(() => null);
    await fs.mkdir(artifactDir, { recursive: true });
    const config = path.join(artifactDir, "input.json");
    await fs.writeFile(
      config,
      JSON.stringify({
        root,
        url: runningApps.get(appId)?.originalUrl,
        artifactDir,
        baseline: path.join(home(), String(appId), "baseline.png"),
        ...limits,
      }),
      { mode: 0o600 },
    );
    // Restore our packaged runner every invocation; project files cannot replace it.
    await fs.copyFile(
      path.join(sources(), "runner.mjs"),
      path.join(tools, "runner.mjs"),
    );
    const rt = await runtime();
    const result = await spawnStreaming({
      command: rt.node,
      args: [
        "--max-old-space-size=512",
        path.join(tools, "runner.mjs"),
        kind,
        config,
      ],
      cwd: tools,
      env: rt.env,
      signal: active.signal,
      timeoutMs: 180000,
    });
    if (!result.aborted && !result.timedOut && result.code === 0)
      report = QualityReportSchema.parse(JSON.parse(result.stdout.trim()));
    const after = await readDeliveryCommit(root).catch(() => null);
    if (!commit || after !== commit) commit = null;
  } catch {
    report = {
      status: "inconclusive",
      summary:
        "Verificação incompleta: confira ferramentas, preview e limites de leitura.",
      findings: [],
    };
  } finally {
    await fs
      .rm(path.join(artifactDir, "input.json"), { force: true })
      .catch(() => {});
    active = null;
  }
  db.insert(projectQualityRuns)
    .values({
      id,
      appId,
      kind,
      commit,
      createdAt,
      toolVersion: "samba-quality-tools/1.0.0",
      report: JSON.stringify(report),
    })
    .run();
  return {
    id,
    kind,
    commit,
    createdAt,
    toolVersion: "samba-quality-tools/1.0.0",
    report,
  };
}
export async function qualityArtifacts(
  appId: number,
  id: string,
  approve: boolean,
) {
  const row = db
    .select()
    .from(projectQualityRuns)
    .where(eq(projectQualityRuns.id, id))
    .get();
  if (!row || row.appId !== appId || row.kind !== "visual")
    throw new Error("Captura visual não encontrada neste projeto.");
  const dir = path.join(home(), String(appId), id);
  if (!approve) {
    const error = await shell.openPath(dir);
    if (error) throw new Error("Não foi possível abrir as imagens.");
    return;
  }
  const project = db.select().from(apps).where(eq(apps.id, appId)).get();
  if (
    !project ||
    !row.commit ||
    row.commit !== (await readDeliveryCommit(getSambaAppPath(project.path)))
  )
    throw new Error("A captura precisa corresponder à versão salva atual.");
  await fs.copyFile(
    path.join(dir, "current.png"),
    path.join(home(), String(appId), "baseline.png"),
  );
}
