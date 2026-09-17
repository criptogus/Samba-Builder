import os from "node:os";
import path from "node:path";

import { app } from "electron";

import {
  compareVersions,
  fetchReleases,
  selectLatestRelease,
} from "../ipc/services/release_check";
import {
  installUpdate,
  type InstallUpdateResult,
  type UpdateInstallProgress,
} from "../ipc/services/update_installer";

import { readSettings } from "./settings";

/**
 * Caminho do bundle em execução.
 *
 * `/Applications/Samba Builder.app/Contents/MacOS/Samba Builder` -> sobe dois
 * níveis a partir do binário e chega no `.app`. Fora do macOS (ou fora de um
 * bundle) a instalação automática não se aplica.
 */
export function resolveAppBundlePath(): string | null {
  if (process.platform !== "darwin") {
    return null;
  }
  const bundle = path.resolve(path.dirname(app.getPath("exe")), "..", "..");
  return bundle.endsWith(".app") ? bundle : null;
}

export interface InstallLatestUpdateOptions {
  onProgress?: (progress: UpdateInstallProgress) => void;
  logger?: {
    info?: (message: string) => void;
    warn: (message: string, error?: unknown) => void;
  };
}

/**
 * Baixa e agenda a instalação da versão publicada mais nova.
 *
 * Usado tanto pelo handler de IPC (interface do app) quanto pelo item de menu,
 * para os dois não divergirem. Quem chama decide o que fazer quando o resultado
 * é `scheduled` — o app precisa fechar para a troca do bundle acontecer.
 */
export async function installLatestUpdate({
  onProgress,
  logger,
}: InstallLatestUpdateOptions = {}): Promise<InstallUpdateResult> {
  const settings = readSettings();
  const fetched = await fetchReleases({
    token: settings.githubAccessToken?.value ?? null,
  });
  if (!fetched.ok) {
    return {
      status: "failed",
      reason: `não consegui consultar as releases (HTTP ${fetched.status})`,
    };
  }

  const currentVersion = app.getVersion();
  const latest = selectLatestRelease(
    fetched.releases,
    process.platform,
    process.arch,
  );
  if (!latest || compareVersions(latest.version, currentVersion) <= 0) {
    return {
      status: "failed",
      reason: "não há versão mais nova publicada",
    };
  }

  const release = fetched.releases.find(
    (entry) => entry.tag_name === `v${latest.version}`,
  );
  if (!release?.assets) {
    return {
      status: "failed",
      reason: `não achei a release v${latest.version}`,
    };
  }

  logger?.info?.(`Instalando ${latest.version} por cima de ${currentVersion}`);
  return installUpdate({
    platform: process.platform,
    arch: process.arch,
    appBundlePath: resolveAppBundlePath(),
    assets: release.assets,
    stagingRoot: app.getPath("temp"),
    trashDir: path.join(os.homedir(), ".Trash"),
    pid: process.pid,
    isPackaged: app.isPackaged,
    onProgress,
    logger,
  });
}
