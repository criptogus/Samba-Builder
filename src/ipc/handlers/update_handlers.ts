import { app } from "electron";

import { readSettings } from "../../main/settings";
import { checkForRelease } from "../services/release_check";
import { systemContracts } from "../types/system";
import { createTypedHandler } from "./base";

/**
 * Checagem de nova versão.
 *
 * O repositório de releases é privado, então a consulta usa o token do GitHub
 * do usuário — lido aqui no processo principal e nunca enviado ao renderer.
 * Sem token (ou sem rede) a resposta é `unavailable` com um motivo, e a UI
 * apenas informa: a instalação é manual.
 */
export function registerUpdateHandlers() {
  createTypedHandler(systemContracts.checkForUpdates, async () => {
    const settings = readSettings();
    return checkForRelease({
      currentVersion: app.getVersion(),
      token: settings.githubAccessToken?.value ?? null,
    });
  });
}
