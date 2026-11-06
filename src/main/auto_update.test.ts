import { describe, expect, it } from "vitest";
import {
  AUTO_UPDATE_INTERVAL,
  AUTO_UPDATE_REPO,
  RELEASE_CHECK_INTERVAL_MS,
  shouldEnableAutoUpdate,
  statusFromReleaseCheck,
} from "./auto_update";

describe("shouldEnableAutoUpdate", () => {
  const packaged = {
    enableAutoUpdate: true,
    isPackaged: true,
    isTestBuild: false,
  };

  it("liga só com a opção do usuário e um app instalado", () => {
    expect(shouldEnableAutoUpdate(packaged)).toBe(true);
  });

  it("respeita a opção desligada", () => {
    expect(
      shouldEnableAutoUpdate({ ...packaged, enableAutoUpdate: false }),
    ).toBe(false);
  });

  it("não roda em desenvolvimento, onde não existe app instalado", () => {
    expect(shouldEnableAutoUpdate({ ...packaged, isPackaged: false })).toBe(
      false,
    );
  });

  it("não roda em build de teste", () => {
    expect(shouldEnableAutoUpdate({ ...packaged, isTestBuild: true })).toBe(
      false,
    );
  });
});

describe("canal de atualização", () => {
  it("aponta para as releases deste repositório", () => {
    expect(AUTO_UPDATE_REPO).toBe("criptogus/Samba-Builder");
    expect(AUTO_UPDATE_INTERVAL).toBe("1 hour");
    expect(RELEASE_CHECK_INTERVAL_MS).toBe(60 * 60 * 1000);
  });

  it("traduz a checagem da API para o retrato das Configurações", () => {
    expect(
      statusFromReleaseCheck({
        status: "update-available",
        currentVersion: "1.14.0-beta.13",
        latestVersion: "1.14.0-beta.14",
        releaseUrl: "https://example.test/rel",
        assetName: null,
        reason: null,
      }),
    ).toEqual({
      phase: "update-available",
      version: "1.14.0-beta.14",
      message: null,
    });

    expect(
      statusFromReleaseCheck({
        status: "unavailable",
        currentVersion: "1.14.0-beta.13",
        latestVersion: null,
        releaseUrl: null,
        assetName: null,
        reason: "no-access",
      }).phase,
    ).toBe("error");
  });
});
