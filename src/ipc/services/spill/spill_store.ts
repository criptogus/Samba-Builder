import * as fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getUserDataPath } from "@/paths/paths";

/**
 * Spill (REQ-22): guarda texto grande fora do contexto do modelo e devolve um
 * localizador, em vez de truncar e perder o resto.
 *
 * O `dsh` divide isso em store + backend + política; aqui o backend é o sistema
 * de arquivos local, em pasta privada por sessão dentro da área de dados do
 * Samba (nunca dentro do app do usuário, para não sujar o repositório dele).
 */

export const SPILL_DIRECTORY_NAME = "spill";
export const SPILL_DIRECTORY_MODE = 0o700;
export const SPILL_FILE_MODE = 0o600;

export interface SpillWriteResult {
  locator: string;
  bytes: number;
}

export interface SpillTextOptions {
  directory: string;
  /** Identifica a sessão (ex.: `chat-12`) — isola um spill do outro. */
  sessionKey: string;
  /** Nome legível de origem (ex.: `server.log`), usado só para o nome do arquivo. */
  label: string;
}

/** Pasta padrão dos spills na máquina do usuário. */
export function resolveSpillDirectory(): string {
  return path.join(getUserDataPath(), SPILL_DIRECTORY_NAME);
}

/** Slug seguro: nunca usar texto de origem cru como nome de arquivo. */
export function spillSlug(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || fallback;
}

export async function spillText(
  text: string,
  { directory, sessionKey, label }: SpillTextOptions,
): Promise<SpillWriteResult> {
  const sessionDirectory = path.join(
    directory,
    spillSlug(sessionKey, "session"),
  );
  await fs.mkdir(sessionDirectory, {
    recursive: true,
    mode: SPILL_DIRECTORY_MODE,
  });

  const digest = crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 8);
  const fileName = `${spillSlug(label, "output")}-${digest}.txt`;
  const locator = path.join(sessionDirectory, fileName);
  await fs.writeFile(locator, text, {
    encoding: "utf8",
    mode: SPILL_FILE_MODE,
  });

  return { locator, bytes: Buffer.byteLength(text, "utf8") };
}
