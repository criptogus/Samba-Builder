/**
 * Decisão do pull request automático (REQ-32).
 *
 * Puro de propósito: a regra que decide abrir um PR no repositório do usuário
 * precisa ser testável sem rede, sem git e sem banco. O efeito (chamar a API)
 * fica em `ensurePullRequestAfterPush`.
 */

export interface AutoPullRequestDecisionInput {
  /** Opção do usuário; desligada por padrão. */
  enabled: boolean;
  /** Branch que acabou de ser enviada ao GitHub. */
  pushedBranch: string | null | undefined;
  /** Branch padrão do repositório (destino do pull request). */
  defaultBranch: string | null | undefined;
}

/**
 * Só abre PR quando o usuário pediu, existe branch enviada, existe destino e os
 * dois são diferentes — PR da branch padrão para ela mesma não existe, e abrir
 * um PR na branch principal seria surpresa, não ajuda.
 */
export function shouldOpenPullRequestAfterPush({
  enabled,
  pushedBranch,
  defaultBranch,
}: AutoPullRequestDecisionInput): boolean {
  if (!enabled) return false;
  if (!pushedBranch || !defaultBranch) return false;
  return pushedBranch !== defaultBranch;
}

/** Título do PR automático: legível para quem não conhece a branch. */
export function autoPullRequestTitle(pushedBranch: string): string {
  return `Samba Builder: ${pushedBranch}`;
}
