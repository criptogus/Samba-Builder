import { dialog, BrowserWindow } from "electron";
import { meetingsContracts } from "../types/meetings";
import { createTypedHandler } from "./base";
import { readSettings } from "@/main/settings";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { MEETING_AUDIO_EXTENSIONS } from "@/shared/meeting_briefing";
import { transcribeMeetingAudio } from "../services/meetings/transcribe";
import { MeetingImportRegistry } from "../services/meetings/import_registry";
const imports = new MeetingImportRegistry();
export function registerMeetingsHandlers() {
  createTypedHandler(
    meetingsContracts.cancelAudio,
    async (event, { requestId }) => {
      imports.cancel(event.sender.id, requestId);
    },
  );
  createTypedHandler(
    meetingsContracts.importAudio,
    async (event, { requestId }) => {
      const key = readSettings().providerSettings?.openai?.apiKey?.value;
      if (!key)
        throw new DyadError(
          "Configure sua chave OpenAI em Settings → AI Providers → OpenAI para transcrever áudio. Você também pode importar uma transcrição pronta, sem esse serviço.",
          DyadErrorKind.Auth,
        );
      const owner = event.sender.id;
      const cancel = () => imports.cancel(owner, requestId);
      event.sender.once("destroyed", cancel);
      try {
        return await imports.run(owner, requestId, async (signal) => {
          const options = {
            title: "Selecionar gravação para transcrever com OpenAI",
            properties: ["openFile"] as "openFile"[],
            filters: [
              { name: "Gravações", extensions: MEETING_AUDIO_EXTENSIONS },
            ],
          };
          const window = BrowserWindow.fromWebContents(event.sender);
          const result = window
            ? await dialog.showOpenDialog(window, options)
            : await dialog.showOpenDialog(options);
          if (result.canceled || !result.filePaths[0] || signal.aborted)
            return null;
          try {
            return await transcribeMeetingAudio(
              result.filePaths[0],
              key,
              signal,
            );
          } catch (error) {
            if (signal.aborted) return null;
            throw error;
          }
        });
      } finally {
        event.sender.removeListener("destroyed", cancel);
      }
    },
  );
}
