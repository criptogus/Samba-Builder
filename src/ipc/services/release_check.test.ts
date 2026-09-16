import { describe, expect, it, vi } from "vitest";

import {
  checkForRelease,
  compareVersions,
  pickReleaseAsset,
  selectLatestRelease,
} from "./release_check";

const ASSETS = [
  "SambaBuilder-1.14.0-beta.2-arm64.zip",
  "SambaBuilder-1.14.0-beta.2-x64.zip",
  "SambaBuilder-1.14.0-beta.2-Setup.exe",
  "samba-builder_1.14.0-beta.2_amd64.deb",
  "samba-builder-1.14.0-beta.2-1.x86_64.rpm",
  "samba-builder-1.14.0-beta.2-x86_64.AppImage",
];

describe("compareVersions", () => {
  it("trata pré-lançamento como mais antigo que a versão estável do mesmo núcleo", () => {
    expect(compareVersions("1.14.0", "1.14.0-beta.2")).toBe(1);
    expect(compareVersions("1.14.0-beta.2", "1.14.0")).toBe(-1);
  });

  it("compara número de beta", () => {
    expect(compareVersions("1.14.0-beta.2", "1.14.0-beta.1")).toBe(1);
    expect(compareVersions("1.14.0-beta.1", "1.14.0-beta.2")).toBe(-1);
    expect(compareVersions("1.14.0-beta.2", "1.14.0-beta.2")).toBe(0);
  });

  it("compara núcleos diferentes", () => {
    expect(compareVersions("1.15.0", "1.14.0-beta.2")).toBe(1);
    expect(compareVersions("1.13.9", "1.14.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
  });

  it("aceita o prefixo v e ignora versão inválida", () => {
    expect(compareVersions("v1.14.0", "1.14.0")).toBe(0);
    expect(compareVersions("abc", "1.14.0")).toBe(0);
  });
});

describe("pickReleaseAsset", () => {
  it("escolhe o zip certo por arquitetura no macOS", () => {
    expect(pickReleaseAsset(ASSETS, "darwin", "arm64")).toBe(
      "SambaBuilder-1.14.0-beta.2-arm64.zip",
    );
    expect(pickReleaseAsset(ASSETS, "darwin", "x64")).toBe(
      "SambaBuilder-1.14.0-beta.2-x64.zip",
    );
  });

  it("escolhe o instalador no Windows e um pacote no Linux", () => {
    expect(pickReleaseAsset(ASSETS, "win32", "x64")).toBe(
      "SambaBuilder-1.14.0-beta.2-Setup.exe",
    );
    expect(pickReleaseAsset(ASSETS, "linux", "x64")).toBe(
      "samba-builder_1.14.0-beta.2_amd64.deb",
    );
  });

  it("devolve null quando não há asset da plataforma", () => {
    expect(pickReleaseAsset(["foo.txt"], "darwin", "arm64")).toBeNull();
    expect(pickReleaseAsset(ASSETS, "freebsd", "x64")).toBeNull();
  });
});

describe("selectLatestRelease", () => {
  it("ignora rascunhos e escolhe a maior versão, inclusive pré-lançamento", () => {
    const latest = selectLatestRelease(
      [
        { tag_name: "v1.14.0-beta.1", html_url: "u1", assets: [] },
        { tag_name: "v1.14.0-beta.3", html_url: "u3", assets: [] },
        {
          tag_name: "v9.9.9",
          html_url: "draft",
          draft: true,
          assets: [],
        },
      ],
      "darwin",
      "arm64",
    );
    expect(latest?.version).toBe("1.14.0-beta.3");
    expect(latest?.url).toBe("u3");
  });

  it("devolve null sem releases válidas", () => {
    expect(selectLatestRelease([], "darwin", "arm64")).toBeNull();
    expect(
      selectLatestRelease([{ tag_name: "sem-versao" }], "darwin", "arm64"),
    ).toBeNull();
  });
});

describe("checkForRelease", () => {
  it("reporta nova versão quando a release publicada é maior", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          tag_name: "v1.14.0-beta.2",
          html_url: "https://example.test/rel",
          assets: ASSETS.map((name) => ({ name })),
        },
      ],
    })) as unknown as typeof fetch;

    const result = await checkForRelease({
      currentVersion: "1.14.0-beta.1",
      platform: "darwin",
      arch: "arm64",
      fetchImpl,
    });

    expect(result.status).toBe("update-available");
    expect(result.latestVersion).toBe("1.14.0-beta.2");
    expect(result.assetName).toBe("SambaBuilder-1.14.0-beta.2-arm64.zip");
    expect(result.releaseUrl).toBe("https://example.test/rel");
  });

  it("reporta atualizado quando roda a mesma versão", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [{ tag_name: "v1.14.0-beta.2", assets: [] }],
    })) as unknown as typeof fetch;

    const result = await checkForRelease({
      currentVersion: "1.14.0-beta.2",
      platform: "darwin",
      arch: "arm64",
      fetchImpl,
    });

    expect(result.status).toBe("up-to-date");
  });

  it("não lança quando o repositório privado responde 404 sem token", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await checkForRelease({
      currentVersion: "1.14.0-beta.2",
      platform: "darwin",
      arch: "arm64",
      fetchImpl,
    });

    expect(result.status).toBe("unavailable");
    expect(result.reason).toBe("no-access");
  });

  it("não lança quando a rede falha", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("sem rede");
    }) as unknown as typeof fetch;

    const result = await checkForRelease({
      currentVersion: "1.14.0-beta.2",
      platform: "darwin",
      arch: "arm64",
      fetchImpl,
    });

    expect(result.status).toBe("unavailable");
    expect(result.reason).toBe("network");
  });

  it("envia o token do usuário no cabeçalho (repo privado)", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    })) as unknown as typeof fetch;

    await checkForRelease({
      currentVersion: "1.14.0",
      token: "tok",
      platform: "darwin",
      arch: "arm64",
      fetchImpl,
    });

    const headers = (
      fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }
    ).mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
  });
});
