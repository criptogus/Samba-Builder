import { ipc } from "@/ipc/types";
import {
  MAX_TRANSCRIPT_FILE_BYTES,
  normalizeTranscript,
} from "@/shared/meeting_briefing";
export const importAudio = (requestId: string) =>
  ipc.meetings.importAudio({ requestId });
export const cancelAudio = (requestId: string) =>
  ipc.meetings.cancelAudio({ requestId });
export async function importTranscript(file: File) {
  if (
    !/\.(txt|md|srt|vtt)$/i.test(file.name) ||
    file.size > MAX_TRANSCRIPT_FILE_BYTES
  )
    throw new Error("Use TXT, MD, SRT ou VTT de até 768 KB.");
  return { text: normalizeTranscript(await file.text()), filename: file.name };
}
