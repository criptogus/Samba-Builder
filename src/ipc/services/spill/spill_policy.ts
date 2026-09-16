import type { SpillWriteResult } from "./spill_store";

/**
 * Política de spill: decide entre devolver o texto inteiro ou trocar por um
 * preview + localizador. É opt-in pelo `maxInlineBytes` do chamador.
 *
 * Falha de armazenamento **não** engole o resultado: quem chama decide o
 * fallback (no `read_file`, o aviso de truncamento de sempre).
 */

export type SpillOutcome =
  | { spilled: false }
  | { spilled: true; preview: string; locator: string; bytes: number };

export interface SpillOversizedTextOptions {
  maxInlineBytes: number;
  store: (text: string) => Promise<SpillWriteResult>;
}

/** Corta em limite de bytes sem quebrar caractere multibyte. */
export function previewOnCharBoundary(text: string, maxBytes: number): string {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length <= maxBytes) return text;
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  return bytes.subarray(0, end).toString("utf8");
}

export function spillNotice(result: SpillWriteResult): string {
  return `\n\n[O restante (${result.bytes} bytes no total) está salvo em ${result.locator}. Leia só o trecho necessário desse caminho em vez de pedir o arquivo inteiro.]`;
}

export async function spillOversizedText(
  text: string,
  { maxInlineBytes, store }: SpillOversizedTextOptions,
): Promise<SpillOutcome> {
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= maxInlineBytes) return { spilled: false };

  try {
    const written = await store(text);
    return {
      spilled: true,
      preview: previewOnCharBoundary(text, maxInlineBytes),
      locator: written.locator,
      bytes: written.bytes,
    };
  } catch {
    return { spilled: false };
  }
}
