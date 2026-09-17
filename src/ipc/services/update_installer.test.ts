import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { spawn } from "node:child_process";
import { describe, expect, it, vi } from "vitest";

import {
  buildSwapScript,
  downloadAsset,
  installUpdate,
  pickInstallableAsset,
  sha256File,
} from "./update_installer";

const CI_ASSETS = [
  {
    name: "Samba.Builder-darwin-arm64-1.14.0-beta.8.zip",
    browser_download_url: "https://example.test/arm64.zip",
    digest: "sha256:abc",
    size: 10,
  },
  {
    name: "Samba.Builder-darwin-x64-1.14.0-beta.8.zip",
    browser_download_url: "https://example.test/x64.zip",
    digest: "sha256:def",
    size: 20,
  },
  {
    name: "Samba.Builder-1.14.0-beta.8.Setup.exe",
    browser_download_url: "https://example.test/win.exe",
    digest: null,
    size: 30,
  },
];

describe("pickInstallableAsset", () => {
  it("escolhe o zip do CI da arquitetura pedida, com url e digest", () => {
    expect(pickInstallableAsset(CI_ASSETS, "darwin", "arm64")).toEqual({
      name: "Samba.Builder-darwin-arm64-1.14.0-beta.8.zip",
      url: "https://example.test/arm64.zip",
      digest: "sha256:abc",
      size: 10,
    });
    expect(pickInstallableAsset(CI_ASSETS, "darwin", "x64")?.name).toBe(
      "Samba.Builder-darwin-x64-1.14.0-beta.8.zip",
    );
  });

  it("devolve null quando a release não tem arquivo da plataforma", () => {
    expect(pickInstallableAsset(CI_ASSETS, "linux", "x64")).toBeNull();
  });
});

describe("buildSwapScript", () => {
  const script = buildSwapScript();

  it("espera o app fechar antes de trocar o bundle", () => {
    expect(script).toContain('kill -0 "$PID"');
  });

  it("manda o bundle antigo para o Lixo com carimbo, em vez de apagar", () => {
    expect(script).toContain('mv "$APP" "$TRASH/Samba Builder $STAMP.app"');
    expect(script).toContain("date +%Y%m%d-%H%M%S");
    expect(script).not.toContain('rm -rf "$APP"');
  });

  it("limpa a quarentena do build não assinado e reabre o app", () => {
    expect(script).toContain("xattr -cr");
    expect(script).toContain('open "$APP"');
  });
});

describe("sha256File", () => {
  it("calcula o digest do arquivo", async () => {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "samba-sha-")),
      "a.bin",
    );
    fs.writeFileSync(file, "conteudo");
    expect(await sha256File(file)).toBe(
      crypto.createHash("sha256").update("conteudo").digest("hex"),
    );
  });
});

describe("downloadAsset", () => {
  it("grava o arquivo e informa progresso", async () => {
    const destination = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "samba-dl-")),
      "pacote.zip",
    );
    const percentuais: number[] = [];
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(5));
        controller.enqueue(new Uint8Array(5));
        controller.close();
      },
    });
    const fetchImpl = vi.fn(
      async () =>
        new Response(body, {
          status: 200,
          headers: { "content-length": "10" },
        }),
    );

    await downloadAsset({
      url: "https://example.test/x",
      destination,
      onProgress: (percent) => percentuais.push(percent),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fs.statSync(destination).size).toBe(10);
    expect(percentuais.at(-1)).toBeGreaterThan(50);
  });

  it("falha quando o download não vem 200", async () => {
    await expect(
      downloadAsset({
        url: "https://example.test/x",
        destination: path.join(os.tmpdir(), "nao-vai-existir.zip"),
        fetchImpl: (async () =>
          new Response("", { status: 404 })) as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/HTTP 404/);
  });
});

describe("installUpdate", () => {
  const base = {
    platform: "darwin" as const,
    arch: "arm64",
    appBundlePath: "/Applications/Samba Builder.app",
    assets: CI_ASSETS,
    stagingRoot: os.tmpdir(),
    trashDir: os.tmpdir(),
    pid: 1234,
    isPackaged: true,
  };

  it("recusa fora do macOS, com motivo", async () => {
    const result = await installUpdate({ ...base, platform: "win32" });
    expect(result.status).toBe("unsupported");
    expect(result.reason).toContain("macOS");
  });

  it("recusa em modo de desenvolvimento", async () => {
    const result = await installUpdate({ ...base, isPackaged: false });
    expect(result.status).toBe("unsupported");
  });

  it("recusa quando o app em execução não foi localizado", async () => {
    const result = await installUpdate({ ...base, appBundlePath: null });
    expect(result.status).toBe("unsupported");
  });

  it("baixa, confere o digest, extrai e agenda a troca", async () => {
    const bytes = Buffer.from("pacote");
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    const fases: string[] = [];
    const spawnImpl = vi.fn(() => ({ unref: () => {} }));

    const result = await installUpdate({
      ...base,
      assets: [
        {
          name: "Samba.Builder-darwin-arm64-1.14.0-beta.8.zip",
          browser_download_url: "https://example.test/a.zip",
          digest: `sha256:${digest}`,
          size: bytes.byteLength,
        },
      ],
      onProgress: (progress) => fases.push(progress.phase),
      fetchImpl: (async () =>
        new Response(bytes, {
          status: 200,
          headers: { "content-length": String(bytes.byteLength) },
        })) as unknown as typeof fetch,
      spawnImpl: spawnImpl as unknown as typeof spawn,
      extractImpl: async (_archive, destination) => {
        fs.mkdirSync(path.join(destination, "Samba Builder.app"), {
          recursive: true,
        });
      },
    });

    expect(result.status).toBe("scheduled");
    expect(fases).toContain("downloading");
    expect(fases).toContain("verifying");
    expect(fases).toContain("extracting");
    expect(fases).toContain("done");
    expect(spawnImpl).toHaveBeenCalledTimes(1);
  });

  it("não agenda nada quando o digest não bate", async () => {
    const spawnImpl = vi.fn();
    const result = await installUpdate({
      ...base,
      assets: [
        {
          name: "Samba.Builder-darwin-arm64-1.14.0-beta.8.zip",
          browser_download_url: "https://example.test/a.zip",
          digest: `sha256:${"0".repeat(64)}`,
          size: 6,
        },
      ],
      fetchImpl: (async () =>
        new Response(Buffer.from("pacote"), {
          status: 200,
        })) as unknown as typeof fetch,
      spawnImpl: spawnImpl as unknown as typeof spawn,
      extractImpl: async () => {},
    });

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("digest");
    expect(spawnImpl).not.toHaveBeenCalled();
  });
});
