import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_AUTO_UPDATE_MESSAGE_LENGTH,
  getAutoUpdateStatus,
  onAutoUpdateStatusChange,
  recordAutoUpdateCheck,
  recordAutoUpdateStatus,
  resetAutoUpdateStatusForTests,
  truncateAutoUpdateMessage,
} from "./auto_update_status";

afterEach(() => {
  resetAutoUpdateStatusForTests();
});

describe("truncateAutoUpdateMessage", () => {
  it("corta mensagem longa e sinaliza o corte", () => {
    const long = "x".repeat(MAX_AUTO_UPDATE_MESSAGE_LENGTH + 50);
    const result = truncateAutoUpdateMessage(long);

    expect(result).toHaveLength(MAX_AUTO_UPDATE_MESSAGE_LENGTH);
    expect(result.endsWith("…")).toBe(true);
  });

  it("preserva mensagem curta, sem espaços nas pontas", () => {
    expect(truncateAutoUpdateMessage("  erro curto  ")).toBe("erro curto");
  });
});

describe("estado do auto-update", () => {
  it("começa desligado e nunca verificado", () => {
    expect(getAutoUpdateStatus()).toEqual({
      enabled: false,
      phase: "disabled",
      lastCheckedAt: null,
      version: null,
      message: null,
    });
  });

  it("registra a verificação concluída com horário", () => {
    const status = recordAutoUpdateCheck(
      { enabled: true, phase: "up-to-date", version: null },
      () => new Date("2026-09-08T12:00:00.000Z"),
    );

    expect(status).toMatchObject({
      enabled: true,
      phase: "up-to-date",
      lastCheckedAt: "2026-09-08T12:00:00.000Z",
    });
  });

  it("guarda a versão quando há atualização baixada", () => {
    const status = recordAutoUpdateCheck({
      enabled: true,
      phase: "downloaded",
      version: "1.15.0",
    });

    expect(status.version).toBe("1.15.0");
    expect(status.phase).toBe("downloaded");
  });

  it("trunca a mensagem de erro ao registrar", () => {
    const status = recordAutoUpdateStatus({
      enabled: true,
      phase: "error",
      message: "y".repeat(1_000),
    });

    expect(status.message).toHaveLength(MAX_AUTO_UPDATE_MESSAGE_LENGTH);
  });

  it("avisa assinantes a cada mudança e para de avisar ao cancelar", () => {
    const listener = vi.fn();
    const unsubscribe = onAutoUpdateStatusChange(listener);

    recordAutoUpdateStatus({ enabled: true, phase: "checking" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "checking" }),
    );

    unsubscribe();
    recordAutoUpdateStatus({ phase: "up-to-date" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("entrega uma cópia, para o consumidor não mutar o estado interno", () => {
    const snapshot = getAutoUpdateStatus();
    snapshot.phase = "error";

    expect(getAutoUpdateStatus().phase).toBe("disabled");
  });
});
