import { openAsBlob } from "node:fs";
import { lstat } from "node:fs/promises";
import path from "node:path";
import {
  MAX_MEETING_AUDIO_BYTES,
  MEETING_AUDIO_EXTENSIONS,
  normalizeTranscript,
} from "@/shared/meeting_briefing";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export async function transcribeMeetingAudio(
  filename: string,
  apiKey: string,
  signal: AbortSignal,
  request: typeof fetch = fetch,
) {
  const stat = await lstat(filename);
  const extension = path.extname(filename).slice(1).toLowerCase();
  if (
    !stat.isFile() ||
    stat.size < 1 ||
    stat.size > MAX_MEETING_AUDIO_BYTES ||
    !MEETING_AUDIO_EXTENSIONS.includes(extension)
  ) {
    throw new DyadError(
      "Use um arquivo de áudio compatível de até 24 MB. Para reuniões maiores, exporte a transcrição ou divida o áudio.",
      DyadErrorKind.Validation,
    );
  }
  signal.throwIfAborted();
  const form = new FormData();
  // A file-backed Blob streams the upload without materializing the recording
  // in the renderer or encoding it as base64 across IPC.
  form.append("file", await openAsBlob(filename), path.basename(filename));
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  const response = await request(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.any([signal, AbortSignal.timeout(180_000)]),
      redirect: "error",
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new DyadError(
      response.status === 401
        ? "A chave OpenAI configurada não foi aceita."
        : response.status === 429
          ? "A OpenAI atingiu o limite de uso ou saldo. Verifique sua conta antes de tentar novamente."
          : `A transcrição não foi concluída (OpenAI HTTP ${response.status}).`,
      response.status === 401 ? DyadErrorKind.Auth : DyadErrorKind.External,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Resposta vazia da transcrição.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let json = "";
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES)
        throw new Error(
          "Transcrição muito longa. Divida a gravação em partes menores.",
        );
      json += decoder.decode(part.value, { stream: true });
    }
    json += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const result: unknown = JSON.parse(json);
  if (
    !result ||
    typeof result !== "object" ||
    !("text" in result) ||
    typeof result.text !== "string"
  )
    throw new Error("Resposta de transcrição inválida.");
  // Preserve source timing when Whisper returns it; do not invent speakers.
  const segments =
    "segments" in result && Array.isArray(result.segments)
      ? result.segments
      : [];
  const timed = segments.filter(
    (segment) =>
      typeof segment?.start === "number" &&
      Number.isFinite(segment.start) &&
      segment.start >= 0 &&
      typeof segment.text === "string",
  );
  const text =
    timed.length === segments.length && timed.length > 0
      ? timed
          .map(
            (segment) =>
              `[${Math.floor(segment.start / 60)}:${String(Math.floor(segment.start % 60)).padStart(2, "0")}] ${segment.text.trim()}`,
          )
          .join("\n")
      : result.text;
  return { filename: path.basename(filename), text: normalizeTranscript(text) };
}
