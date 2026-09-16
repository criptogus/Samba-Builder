/**
 * Política de auto-update do Samba Builder.
 *
 * O fork é standalone (sem backend próprio), então o canal de atualização são as
 * **releases deste repositório no GitHub**, servidas pelo serviço público do
 * Electron (`https://update.electronjs.org`). Nada aqui consulta o backend do
 * Samba — foi por isso que o updater original tinha sido removido, e removê-lo
 * deixou o switch "Auto-update" da interface prometendo algo que o app não faz.
 *
 * A decisão é pura para poder ser testada sem Electron, janela ou rede.
 */

/** Repositório cujas releases são o canal de atualização. */
export const AUTO_UPDATE_REPO = "criptogus/Samba-Builder";

/** O mínimo aceito pelo update-electron-app é 5 minutos. */
export const AUTO_UPDATE_INTERVAL = "1 hour";

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
