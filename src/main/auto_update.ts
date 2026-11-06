/**
 * Política de atualização do Samba Builder.
 *
 * O canal são as releases deste repositório na API do GitHub
 * (`src/ipc/services/release_check.ts`). O serviço público do Electron
 * (`update.electronjs.org`) descarta toda release marcada como pré-lançamento,
 * e este produto só publica beta — por isso aquele feed responde "no updates"
 * mesmo com um zip darwin publicado. A checagem da API inclui beta, ordena por
 * semver (a lista do GitHub não vem ordenada) e não instala sozinha: o build
 * não é assinado.
 *
 * A decisão é pura para poder ser testada sem Electron, janela ou rede.
 */

import type { ReleaseCheckResult } from "../ipc/services/release_check";

/** Repositório cujas releases são o canal de atualização. */
export const AUTO_UPDATE_REPO = "criptogus/Samba-Builder";

/** Intervalo da checagem periódica no processo principal. */
export const AUTO_UPDATE_INTERVAL = "1 hour";

export const RELEASE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export interface ReleaseCheckStatusPatch {
  phase: "up-to-date" | "update-available" | "error";
  version: string | null;
  message: string | null;
}

/** Traduz o resultado da API de releases para o retrato das Configurações. */
export function statusFromReleaseCheck(
  result: ReleaseCheckResult,
): ReleaseCheckStatusPatch {
  if (result.status === "update-available") {
    return {
      phase: "update-available",
      version: result.latestVersion,
      message: null,
    };
  }
  if (result.status === "up-to-date") {
    return {
      phase: "up-to-date",
      version: result.latestVersion,
      message: null,
    };
  }
  return {
    phase: "error",
    version: null,
    message: result.reason ?? "unavailable",
  };
}

export interface AutoUpdatePolicyInput {
  /** Opção do usuário ("Auto-update" em Configurações). */
  enableAutoUpdate: boolean;
  /** `app.isPackaged`: em desenvolvimento não existe app instalado para atualizar. */
  isPackaged: boolean;
  /** Builds de teste não devem falar com a rede. */
  isTestBuild: boolean;
}

export function shouldEnableAutoUpdate({
  enableAutoUpdate,
  isPackaged,
  isTestBuild,
}: AutoUpdatePolicyInput): boolean {
  if (isTestBuild) return false;
  if (!isPackaged) return false;
  return enableAutoUpdate;
}
