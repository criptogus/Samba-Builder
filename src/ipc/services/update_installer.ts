import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import { pickReleaseAsset } from "./release_check";

export type UpdateInstallPhase =
  | "downloading"
  | "verifying"
  | "extracting"
  | "installing"
  | "done";

export interface UpdateInstallProgress {
  phase: UpdateInstallPhase;
  percent: number;
}

export interface ReleaseAssetInfo {
  name: string;
  url: string;
  digest: string | null;
  size: number | null;
}

export interface InstallUpdateResult {
  status: "scheduled" | "unsupported" | "failed";
  reason: string | null;
}

interface GithubAssetLike {
  name?: string;
  browser_download_url?: string;
  digest?: string | null;
  size?: number;
}

/**
 * O arquivo instalável desta plataforma/arquitetura, com url e digest.
 *
 * Puro. Reusa `pickReleaseAsset` (o mesmo que a checagem usa para dizer qual
 * arquivo baixar), então os dois nunca discordam sobre o nome.
 */
export function pickInstallableAsset(
  assets: readonly GithubAssetLike[],
  platform: NodeJS.Platform,
  arch: string,
): ReleaseAssetInfo | null {
  const usable = assets.filter(
    (asset): asset is { name: string; browser_download_url: string } =>
      typeof asset.name === "string" &&
      typeof asset.browser_download_url === "string",
  );
  const name = pickReleaseAsset(
    usable.map((asset) => asset.name),
    platform,
    arch,
  );
  if (!name) {
    return null;
  }
  const found = usable.find((asset) => asset.name === name);
  if (!found) {
    return null;
  }
  const original = assets.find((asset) => asset.name === name);
  return {
    name,
    url: found.browser_download_url,
    digest: original?.digest ?? null,
    size: original?.size ?? null,
  };
}

/** sha256 do arquivo, em streaming (o pacote tem centenas de MB). */
export async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve());
  });
  return hash.digest("hex");
}

/** Baixa para o disco, informando o progresso em porcentagem. */
export async function downloadAsset({
  url,
  destination,
  onProgress,
  expectedBytes = null,
  fetchImpl = fetch,
}: {
  url: string;
  destination: string;
  onProgress?: (percent: number) => void;
  expectedBytes?: number | null;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "Samba-Builder-Updater" },
    redirect: "follow",
  });
  if (!response.ok || !response.body) {
    throw new Error(`download falhou: HTTP ${response.status}`);
  }
  const headerLength = Number(response.headers.get("content-length"));
  const total =
    Number.isFinite(headerLength) && headerLength > 0
      ? headerLength
      : (expectedBytes ?? 0);

  let received = 0;
  const handle = await fsp.open(destination, "w");
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      await handle.write(chunk);
      received += chunk.byteLength;
      if (total > 0) {
        onProgress?.(Math.min(99, Math.round((received / total) * 100)));
      }
    }
  } finally {
    await handle.close();
  }
}

/**
 * Script que troca o bundle depois que o app fechar. Puro: dá para testar.
 *
 * Reversível por construção: o bundle antigo vai para o Lixo com carimbo de
 * data (nunca `rm -rf` no app do usuário), a quarentena é limpa porque o build
 * não é assinado, e o app reabre sozinho.
 */
export function buildSwapScript(): string {
  return [
    "#!/bin/bash",
    "# Troca o bundle do app por uma versao nova, depois que ele fechar.",
    "# O bundle antigo vai para o Lixo com carimbo de data (reversivel).",
    "set -u",
    'APP="$1"',
    'STAGED="$2"',
    'TRASH="$3"',
    'PID="$4"',
    "# espera o app fechar (ate 2 minutos)",
    "for _ in $(seq 1 240); do",
    '  kill -0 "$PID" 2>/dev/null || break',
    "  sleep 0.5",
    "done",
    "sleep 1",
    'STAMP="$(date +%Y%m%d-%H%M%S)"',
    'if [ -d "$APP" ]; then',
    '  mv "$APP" "$TRASH/Samba Builder $STAMP.app" || exit 1',
    "fi",
    'cp -R "$STAGED" "$APP" || exit 1',
    'xattr -cr "$APP" >/dev/null 2>&1',
    'open "$APP"',
    'rm -rf "$(dirname "$STAGED")"',
    "",
  ].join("\n");
}

function runCommand(
  command: string,
  args: string[],
  spawnImpl: typeof spawn = spawn,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} terminou com codigo ${code}`)),
    );
  });
}

export interface InstallUpdateOptions {
  platform: NodeJS.Platform;
  arch: string;
  /** Caminho do bundle em execução (derivado de app.getPath("exe")). */
  appBundlePath: string | null;
  assets: readonly GithubAssetLike[];
  /** Onde montar a área de trabalho (temp). */
  stagingRoot: string;
  /** Pasta do Lixo do usuário. */
  trashDir: string;
  /** PID do app, para o script esperar ele fechar. */
  pid: number;
  isPackaged: boolean;
  onProgress?: (progress: UpdateInstallProgress) => void;
  fetchImpl?: typeof fetch;
  spawnImpl?: typeof spawn;
  extractImpl?: (archivePath: string, destination: string) => Promise<void>;
  logger?: { warn: (message: string, error?: unknown) => void };
}

/**
 * Baixa, confere, extrai e agenda a troca do app.
 *
 * Só macOS: nas outras plataformas o instalador do sistema é que manda, e a
 * resposta é `unsupported` com o motivo — a UI então oferece a página da
 * release, em vez de fingir que instalou.
 */
export async function installUpdate({
  platform,
  arch,
  appBundlePath,
  assets,
  stagingRoot,
  trashDir,
  pid,
  isPackaged,
  onProgress,
  fetchImpl = fetch,
  spawnImpl = spawn,
  extractImpl,
  logger,
}: InstallUpdateOptions): Promise<InstallUpdateResult> {
  if (platform !== "darwin") {
    return {
      status: "unsupported",
      reason: "instalação automática disponível só no macOS",
    };
  }
  if (!isPackaged) {
    return {
      status: "unsupported",
      reason: "rodando em desenvolvimento: instale pela release",
    };
  }
  if (!appBundlePath || !appBundlePath.endsWith(".app")) {
    return {
      status: "unsupported",
      reason: "não consegui localizar o app em execução",
    };
  }

  const asset = pickInstallableAsset(assets, platform, arch);
  if (!asset) {
    return {
      status: "failed",
      reason: `esta release não tem arquivo para macOS ${arch}`,
    };
  }

  let workDir: string | null = null;
  try {
    workDir = await fsp.mkdtemp(path.join(stagingRoot, "samba-update-"));
    const archivePath = path.join(workDir, asset.name);
    const extractDir = path.join(workDir, "extraido");
    const bundleName = path.basename(appBundlePath);
    const stagedApp = path.join(extractDir, bundleName);

    onProgress?.({ phase: "downloading", percent: 0 });
    await downloadAsset({
      url: asset.url,
      destination: archivePath,
      expectedBytes: asset.size,
      fetchImpl,
      onProgress: (percent) => onProgress?.({ phase: "downloading", percent }),
    });

    onProgress?.({ phase: "verifying", percent: 0 });
    if (asset.digest) {
      const expected = asset.digest.replace(/^sha256:/i, "").toLowerCase();
      const actual = await sha256File(archivePath);
      if (actual !== expected) {
        throw new Error("o arquivo baixado não bate com o digest publicado");
      }
    }
    onProgress?.({ phase: "verifying", percent: 100 });

    onProgress?.({ phase: "extracting", percent: 0 });
    await fsp.mkdir(extractDir, { recursive: true });
    if (extractImpl) {
      await extractImpl(archivePath, extractDir);
    } else {
      await runCommand(
        "ditto",
        ["-x", "-k", archivePath, extractDir],
        spawnImpl,
      );
    }
    if (!fs.existsSync(stagedApp)) {
      throw new Error(`o arquivo baixado não contém ${bundleName}`);
    }
    onProgress?.({ phase: "extracting", percent: 100 });

    onProgress?.({ phase: "installing", percent: 0 });
    await fsp.mkdir(trashDir, { recursive: true });
    const scriptPath = path.join(workDir, "trocar.sh");
    await fsp.writeFile(scriptPath, buildSwapScript(), { mode: 0o755 });
    const child = spawnImpl(
      "/bin/bash",
      [scriptPath, appBundlePath, stagedApp, trashDir, String(pid)],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    onProgress?.({ phase: "done", percent: 100 });
    return { status: "scheduled", reason: null };
  } catch (error) {
    logger?.warn("Falha ao instalar a atualização", error);
    if (workDir) {
      await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
