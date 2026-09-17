import { app } from "electron";
import log from "electron-log";

import { safeSend } from "@/ipc/utils/safe_sender";

import { installLatestUpdate } from "../../main/update_install_flow";
import { readSettings } from "../../main/settings";
import { checkForRelease } from "../services/release_check";
import { systemContracts } from "../types/system";
import { createTypedHandler } from "./base";

const logger = log.scope("update");

/**
 * Checagem de nova versão e instalação dela.
 *
 * O token do GitHub do usuário é lido aqui no processo principal e nunca vai ao
 * renderer. A checagem é informativa; a instalação baixa, confere o digest
 * publicado, extrai e agenda a troca do bundle — o app fecha e reabre sozinho,
 * e o bundle antigo vai para o Lixo (reversível).
 */
export function registerUpdateHandlers() {
  createTypedHandler(systemContracts.checkForUpdates, async () => {
    const settings = readSettings();
    return checkForRelease({
      currentVersion: app.getVersion(),
      token: settings.githubAccessToken?.value ?? null,
    });
  });

  createTypedHandler(systemContracts.installUpdate, async (event) => {
    const result = await installLatestUpdate({
      onProgress: (progress) => {
        safeSend(event.sender, "update:install-progress", progress);
      },
      logger: {
        info: (message) => logger.info(message),
        warn: (message, error) => logger.warn(message, error),
      },
    });

    if (result.status === "scheduled") {
      // Dá tempo da UI mostrar que o app vai fechar e reabrir.
      setTimeout(() => {
        app.quit();
      }, 1500);
    } else if (result.status === "failed") {
      logger.warn(`Instalação não agendada: ${result.reason ?? "sem motivo"}`);
    }
    return result;
  });
}
