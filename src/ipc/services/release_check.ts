/**
 * Checagem de nova versão — Service Worker-free, sem backend próprio.
 *
 * O Samba Builder é standalone: não consulta servidor do projeto original.
 * Esta é a única consulta externa da checagem, e ela é explícita: a API pública
 * de releases DESTE repositório. O usuário decide baixar; nada é instalado
 * automaticamente (builds não são assinados, então auto-instalação não existe).
 */

/** Repositório de onde saem as versões publicadas. */
export const RELEASE_REPO = "criptogus/Samba-Builder";

export type ReleaseCheckStatus =
  | "update-available"
  | "up-to-date"
  | "unavailable";

export interface ReleaseCheckResult {
  status: ReleaseCheckStatus;
  /** Versão que está rodando (app.getVersion()). */
  currentVersion: string;
  /** Versão mais nova publicada, quando encontrada. */
  latestVersion: string | null;
  /** Página da release para o usuário baixar. */
  releaseUrl: string | null;
  /** Nome do arquivo da plataforma atual dentro da release. */
  assetName: string | null;
  /** Por que não deu para verificar (só quando status = unavailable). */
  reason: string | null;
}

interface ParsedVersion {
  core: number[];
  /** null = versão estável; array = pré-lançamento (beta.2 → [2]). */
  pre: (string | number)[] | null;
}

/** Aceita "1.14.0", "v1.14.0" e "1.14.0-beta.2". */
function parseVersion(value: string): ParsedVersion | null {
  const trimmed = value.trim().replace(/^v/i, "");
  if (!trimmed) {
    return null;
  }
  const [corePart, ...rest] = trimmed.split("-");
  const core = corePart.split(".").map((piece) => Number(piece));
  if (core.length === 0 || core.some((piece) => !Number.isInteger(piece))) {
    return null;
  }
  if (rest.length === 0) {
    return { core, pre: null };
  }
  const pre = rest
    .join("-")
    .split(".")
    .map((piece) => (/^\d+$/.test(piece) ? Number(piece) : piece));
  return { core, pre };
}

/**
 * Compara duas versões: >0 se `a` é mais nova que `b`, <0 se mais antiga, 0 se iguais.
 * Regra semver: pré-lançamento é sempre mais antigo que a versão estável do mesmo núcleo
 * ("1.14.0" > "1.14.0-beta.2").
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) {
    return 0;
  }
  const size = Math.max(left.core.length, right.core.length);
  for (let index = 0; index < size; index += 1) {
    const diff = (left.core[index] ?? 0) - (right.core[index] ?? 0);
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }
  if (left.pre === null && right.pre === null) {
    return 0;
  }
  if (left.pre === null) {
    return 1;
  }
  if (right.pre === null) {
    return -1;
  }
  const preSize = Math.max(left.pre.length, right.pre.length);
  for (let index = 0; index < preSize; index += 1) {
    const leftPiece = left.pre[index];
    const rightPiece = right.pre[index];
    if (leftPiece === undefined) {
      return -1;
    }
    if (rightPiece === undefined) {
      return 1;
    }
    if (leftPiece === rightPiece) {
      continue;
    }
    if (typeof leftPiece === "number" && typeof rightPiece === "number") {
      return leftPiece > rightPiece ? 1 : -1;
    }
    return String(leftPiece) > String(rightPiece) ? 1 : -1;
  }
  return 0;
}

/** Qual arquivo da release corresponde à plataforma/arquitetura atuais. */
export function pickReleaseAsset(
  assetNames: string[],
  platform: NodeJS.Platform,
  arch: string,
): string | null {
  const find = (test: (name: string) => boolean) =>
    assetNames.find(test) ?? null;
  if (platform === "darwin") {
    return arch === "arm64"
      ? find((name) => /-arm64\.zip$/i.test(name))
      : find((name) => /-x64\.zip$/i.test(name));
  }
  if (platform === "win32") {
    return find((name) => /Setup\.exe$/i.test(name));
  }
  if (platform === "linux") {
    return (
      find((name) => /_amd64\.deb$/i.test(name)) ??
      find((name) => /\.rpm$/i.test(name)) ??
      find((name) => /\.AppImage$/i.test(name))
    );
  }
  return null;
}

interface GithubRelease {
  tag_name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  assets?: { name?: string }[];
}

/** Escolhe a release mais nova (inclui pré-lançamento) e o asset da plataforma. */
export function selectLatestRelease(
  releases: GithubRelease[],
  platform: NodeJS.Platform,
  arch: string,
): { version: string; url: string; assetName: string | null } | null {
  const candidates = releases
    .filter((release) => !release.draft && typeof release.tag_name === "string")
    .map((release) => ({
      version: (release.tag_name as string).replace(/^v/i, ""),
      url: release.html_url ?? "",
      assetNames: (release.assets ?? [])
        .map((asset) => asset.name)
        .filter((name): name is string => typeof name === "string"),
    }))
    .filter((release) => parseVersion(release.version) !== null);
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => compareVersions(b.version, a.version));
  const newest = candidates[0];
  return {
    version: newest.version,
    url: newest.url,
    assetName: pickReleaseAsset(newest.assetNames, platform, arch),
  };
}

export interface CheckForReleaseOptions {
  currentVersion: string;
  /** Token do GitHub do usuário, quando existir: o repositório é privado. */
  token?: string | null;
  platform?: NodeJS.Platform;
  arch?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Consulta as releases e diz se há versão mais nova.
 * Nunca lança: falha de rede/token vira `unavailable` com motivo legível.
 */
export async function checkForRelease({
  currentVersion,
  token = null,
  platform = process.platform,
  arch = process.arch,
  fetchImpl = fetch,
}: CheckForReleaseOptions): Promise<ReleaseCheckResult> {
  const base: ReleaseCheckResult = {
    status: "unavailable",
    currentVersion,
    latestVersion: null,
    releaseUrl: null,
    assetName: null,
    reason: null,
  };
  const request = (useToken: boolean) =>
    fetchImpl(
      `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=20`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Samba-Builder-Update-Check",
          ...(useToken && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
  try {
    let response = await request(true);
    // O repositório de releases é público: credencial expirada ou sem permissão
    // não pode derrubar a checagem — se falhou com token, tenta sem ele.
    if (!response.ok && token) {
      response = await request(false);
    }
    if (!response.ok) {
      return {
        ...base,
        reason:
          response.status === 404
            ? "no-access"
            : response.status === 403
              ? "rate-limit"
              : `http-${response.status}`,
      };
    }
    const releases = (await response.json()) as GithubRelease[];
    const latest = selectLatestRelease(
      Array.isArray(releases) ? releases : [],
      platform,
      arch,
    );
    if (!latest) {
      return { ...base, reason: "no-releases" };
    }
    return {
      status:
        compareVersions(latest.version, currentVersion) > 0
          ? "update-available"
          : "up-to-date",
      currentVersion,
      latestVersion: latest.version,
      releaseUrl: latest.url,
      assetName: latest.assetName,
      reason: null,
    };
  } catch (error) {
    return {
      ...base,
      reason:
        error instanceof Error && error.name === "TimeoutError"
          ? "timeout"
          : "network",
    };
  }
}

export interface UpdateDialogContent {
  type: "info" | "warning";
  title: string;
  message: string;
  detail: string;
  buttons: string[];
  /** Índice do botão que abre o download; −1 quando não há o que baixar. */
  downloadButtonIndex: number;
}

const UNAVAILABLE_REASON: Record<string, { pt: string; en: string }> = {
  "no-access": {
    pt: "O repositório de releases exige credencial e o app não tem uma configurada. Conecte sua conta do GitHub em Configurações para que a checagem funcione.",
    en: "The releases repository requires credentials and none is configured. Connect your GitHub account in Settings so the check can work.",
  },
  "rate-limit": {
    pt: "O GitHub recusou a consulta por limite de requisições. Tente de novo em alguns minutos.",
    en: "GitHub refused the request due to rate limiting. Try again in a few minutes.",
  },
  timeout: {
    pt: "A consulta demorou demais para responder.",
    en: "The request took too long to respond.",
  },
  network: {
    pt: "Não foi possível falar com o GitHub (verifique a conexão).",
    en: "Could not reach GitHub (check your connection).",
  },
  "no-releases": {
    pt: "Ainda não há versão publicada para comparar.",
    en: "There is no published version to compare against yet.",
  },
};

/**
 * Texto do diálogo do menu "Verificar atualizações", no idioma do sistema.
 * É pura de propósito: a decisão de texto e de botão é testável sem Electron.
 */
export function describeReleaseCheck(
  result: ReleaseCheckResult,
  locale: string,
): UpdateDialogContent {
  const pt = locale.toLowerCase().startsWith("pt");
  if (result.status === "update-available") {
    return {
      type: "info",
      title: pt ? "Nova versão disponível" : "New version available",
      message: pt
        ? `A versão ${result.latestVersion} já está publicada.`
        : `Version ${result.latestVersion} is available.`,
      detail: pt
        ? `Você está na ${result.currentVersion}. A instalação é manual — o botão abre a página de download.`
        : `You are on ${result.currentVersion}. Installing is manual — the button opens the download page.`,
      buttons: pt ? ["Baixar", "Depois"] : ["Download", "Later"],
      downloadButtonIndex: 0,
    };
  }
  if (result.status === "up-to-date") {
    const latest = result.latestVersion ?? result.currentVersion;
    return {
      type: "info",
      title: pt ? "Você está atualizado" : "You are up to date",
      message: pt
        ? `A versão mais recente publicada é a ${latest}.`
        : `The latest published version is ${latest}.`,
      detail: pt
        ? `Rodando ${result.currentVersion}.`
        : `Running ${result.currentVersion}.`,
      buttons: ["OK"],
      downloadButtonIndex: -1,
    };
  }
  const reason = UNAVAILABLE_REASON[result.reason ?? ""] ?? {
    pt: `A checagem não completou (${result.reason ?? "motivo desconhecido"}).`,
    en: `The check did not complete (${result.reason ?? "unknown reason"}).`,
  };
  return {
    type: "warning",
    title: pt ? "Não foi possível verificar" : "Could not check for updates",
    message: pt
      ? "O app não conseguiu consultar as versões publicadas."
      : "The app could not reach the published versions.",
    detail: pt ? reason.pt : reason.en,
    buttons: ["OK"],
    downloadButtonIndex: -1,
  };
}
