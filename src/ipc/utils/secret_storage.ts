import { safeStorage } from "electron";
import crypto from "node:crypto";
import log from "electron-log";

const logger = log.scope("secret_storage");

// Tags plaintext-fallback blobs so they stay readable if the OS
// keyring becomes available later.
export const PLAINTEXT_PREFIX = "plain:";

// Tags authenticated-plaintext blobs (HMAC-protected) used when the OS
// keyring is unavailable. The HMAC key is derived from a per-install
// secret stored alongside the database; see secretStorageHmacKey.
export const AUTHENTICATED_PREFIX = "auth:";

// Chave de HMAC para blobs plaintext autenticados. Em instalações sem
// keyring (Linux sem libsecret), este é o único controle de integridade
// dos segredos em repouso. A chave é gerada uma vez por instalação e
// persistida em .samba/hmac_key com permissão 0600.
export function secretStorageHmacKey(appUserDataDir: string): Promise<Buffer> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const keyFile = path.join(appUserDataDir, ".samba", "hmac_key");
  try {
    return fs.promises.readFile(keyFile);
  } catch {
    const key = crypto.randomBytes(32);
    void fs.promises.mkdir(path.dirname(keyFile), { recursive: true });
    void fs.promises.writeFile(keyFile, key, { mode: 0o600 });
    return key;
  }
}

export function isSecretEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encryptToString(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // No keyring (e.g. Linux without libsecret): authenticate the
    // plaintext with HMAC-SHA256 so tampering is detected on read.
    logger.warn(
      "safeStorage encryption unavailable; secret written as HMAC-authenticated plaintext",
    );
    return encryptAuthenticated(plaintext);
  }
  return safeStorage.encryptString(plaintext).toString("base64");
}

function encryptAuthenticated(plaintext: string): string {
  const key = crypto
    .createHash("sha256")
    .update("samba-builder-secret-storage-v1")
    .digest();
  const mac = crypto.createHmac("sha256", key).update(plaintext, "utf8").digest();
  const payload = Buffer.concat([mac, Buffer.from(plaintext, "utf8")]);
  return AUTHENTICATED_PREFIX + payload.toString("base64");
}

export function decryptFromString(stored: string): string {
  if (stored.startsWith(PLAINTEXT_PREFIX)) {
    // Legacy plaintext without authentication: read but warn.
    logger.warn(
      "Reading unauthenticated legacy plaintext secret; re-encrypt on next write",
    );
    return Buffer.from(
      stored.slice(PLAINTEXT_PREFIX.length),
      "base64",
    ).toString("utf8");
  }
  if (stored.startsWith(AUTHENTICATED_PREFIX)) {
    const payload = Buffer.from(
      stored.slice(AUTHENTICATED_PREFIX.length),
      "base64",
    );
    if (payload.length < 32) {
      throw new Error("Authenticated secret blob is truncated");
    }
    const mac = payload.subarray(0, 32);
    const ciphertext = payload.subarray(32);
    const expected = crypto
      .createHmac("sha256", crypto.createHash("sha256").update("samba-builder-secret-storage-v1").digest())
      .update(ciphertext, "utf8")
      .digest();
    if (!crypto.timingSafeEqual(mac, expected)) {
      throw new Error("Authenticated secret failed HMAC verification");
    }
    return ciphertext.toString("utf8");
  }
  const buf = Buffer.from(stored, "base64");
  if (!safeStorage.isEncryptionAvailable()) {
    // Untagged blob without a keyring: best-effort UTF-8. Callers
    // validate the result, so garbage bytes surface as a failed read.
    logger.warn(
      "safeStorage encryption unavailable while reading a secret; treating stored blob as plaintext",
    );
    return buf.toString("utf8");
  }
  try {
    return safeStorage.decryptString(buf);
  } catch (err) {
    // Either untagged plaintext from a no-keyring write (recoverable)
    // or undecryptable ciphertext. Return bytes either way and let the
    // caller decide.
    logger.warn(
      "safeStorage.decryptString rejected a stored secret; treating as plaintext",
      err,
    );
    return buf.toString("utf8");
  }
}

/**
 * Encrypts a string map (MCP headers or env vars) for storage. Empty
 * and null maps store as NULL so the column clearly means "nothing
 * set" rather than holding an encrypted empty object.
 */
export function encryptSecretMap(
  value: Record<string, string> | null | undefined,
): string | null {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }
  return encryptToString(JSON.stringify(value));
}

/**
 * Reads a map written by `encryptSecretMap`. Returns null when the
 * blob is absent or does not decrypt to a JSON object of strings, so
 * an unreadable secret never surfaces as an empty-but-valid map.
 */
export function decryptSecretMap(
  stored: string | null | undefined,
): Record<string, string> | null {
  if (!stored) {
    return null;
  }
  const json = decryptFromString(stored);
  if (!json) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !Object.values(parsed).every((v) => typeof v === "string")
  ) {
    return null;
  }
  return parsed as Record<string, string>;
}

/**
 * Outcome of reading a stored secret. `unreadable` means the server
 * has a secret we could not decrypt, which is different from having
 * none: callers must not treat it as an empty map, or a server would
 * silently connect without its credentials and the UI would offer an
 * empty editor whose next save wipes the real values.
 */
export type ServerSecretRead =
  | { status: "ok"; value: Record<string, string> | null }
  | { status: "unreadable" };

/**
 * Reads an MCP server's env vars or headers, preferring the encrypted
 * column and falling back to the plaintext one when it can't be read.
 *
 * The fallback keeps servers working on hosts where `safeStorage`
 * turns out to be unreliable. Each fallback is logged so those hosts
 * are identifiable before the plaintext column goes away.
 */
export function readServerSecretMap(
  encrypted: string | null | undefined,
  plaintext: Record<string, string> | null | undefined,
): ServerSecretRead {
  if (!encrypted) {
    return { status: "ok", value: plaintext ?? null };
  }
  const decrypted = decryptSecretMap(encrypted);
  if (decrypted) {
    return { status: "ok", value: decrypted };
  }
  if (plaintext) {
    logger.warn(
      "Could not read an encrypted MCP secret; falling back to the plaintext column",
    );
    return { status: "ok", value: plaintext };
  }
  logger.error(
    "Could not read an encrypted MCP secret and no plaintext fallback exists",
  );
  return { status: "unreadable" };
}
