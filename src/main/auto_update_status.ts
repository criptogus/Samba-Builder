/**
 * Estado da última verificação de atualização (main process).
 *
 * Fica separado de `src/main.ts` por dois motivos: o wiring do Electron não é
 * testável, e a interface precisa de um retrato estável do que aconteceu — "já
 * verifiquei, está atualizado" é diferente de "nunca verifiquei" e de "falhou".
 *
 * Sem imports de Electron/React: é só estado + assinantes.
 */

export type AutoUpdatePhase =
  /** A opção está desligada ou o app não está empacotado: não há verificação. */
  | "disabled"
  /** Verificação em andamento. */
  | "checking"
  | "up-to-date"
  | "update-available"
  /** Baixando (o Squirrel.Mac emite `update-downloaded` ao terminar). */
  | "downloading"
  /** Baixada e pronta: só falta reiniciar. */
  | "downloaded"
  | "error";

export interface AutoUpdateStatus {
  enabled: boolean;
  phase: AutoUpdatePhase;
  /** ISO da última verificação concluída (null = nunca). */
  lastCheckedAt: string | null;
  /** Versão nova quando existe/foi baixada. */
  version: string | null;
  /** Motivo legível de falha, truncado. */
  message: string | null;
}

export const MAX_AUTO_UPDATE_MESSAGE_LENGTH = 300;

export function truncateAutoUpdateMessage(
  value: string,
  max = MAX_AUTO_UPDATE_MESSAGE_LENGTH,
): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

const INITIAL_STATUS: AutoUpdateStatus = {
  enabled: false,
  phase: "disabled",
  lastCheckedAt: null,
  version: null,
  message: null,
};

let status: AutoUpdateStatus = { ...INITIAL_STATUS };
const listeners = new Set<(status: AutoUpdateStatus) => void>();

export function getAutoUpdateStatus(): AutoUpdateStatus {
  return { ...status };
}

/** Atualiza o retrato e avisa quem observa (broadcast para o renderer). */
export function recordAutoUpdateStatus(
  patch: Partial<AutoUpdateStatus>,
): AutoUpdateStatus {
  const next: AutoUpdateStatus = { ...status, ...patch };
  if (patch.message !== undefined && patch.message !== null) {
    next.message = truncateAutoUpdateMessage(patch.message);
  }
  status = next;
  const snapshot = getAutoUpdateStatus();
  for (const listener of listeners) {
    listener(snapshot);
  }
  return snapshot;
}

/** Marca uma verificação concluída, carimbando o horário. */
export function recordAutoUpdateCheck(
  patch: Omit<Partial<AutoUpdateStatus>, "lastCheckedAt"> = {},
  now: () => Date = () => new Date(),
): AutoUpdateStatus {
  return recordAutoUpdateStatus({
    ...patch,
    lastCheckedAt: now().toISOString(),
  });
}

export function onAutoUpdateStatusChange(
  listener: (status: AutoUpdateStatus) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Só para testes: volta ao estado inicial e descarta assinantes. */
export function resetAutoUpdateStatusForTests(): void {
  status = { ...INITIAL_STATUS };
  listeners.clear();
}
