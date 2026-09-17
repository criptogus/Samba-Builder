import log from "electron-log";
import fetch from "node-fetch";
import { IS_TEST_BUILD } from "../utils/test_utils";
import { createTypedHandler } from "./base";
import { systemContracts } from "../types/system";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";

const logger = log.scope("release_note_handlers");

export function registerReleaseNoteHandlers() {
  createTypedHandler(
    systemContracts.doesReleaseNoteExist,
    async (_, params) => {
      const { version } = params;

      if (!version || typeof version !== "string") {
        throw new SambaError(
          "Invalid version provided",
          SambaErrorKind.Validation,
        );
      }

      // For E2E tests, we don't want to check for release notes
      // or show release notes, as it interferes with the tests.
      if (IS_TEST_BUILD) {
        return { exists: false };
      }
      const releaseNoteUrl = `https://github.com/criptogus/Samba-Builder/releases/tag/v${encodeURIComponent(version)}`;

      logger.debug(`Checking for release note at: ${releaseNoteUrl}`);

      try {
        // O corpo da release, e nao so a existencia da pagina: release publicada
        // sem notas (as do workflow nasciam assim) abria o "o que ha de novo" em
        // branco. Melhor nao mostrar nada do que mostrar uma tela vazia.
        const response = await fetch(
          `https://api.github.com/repos/criptogus/Samba-Builder/releases/tags/v${encodeURIComponent(version)}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "Samba-Builder-Release-Notes",
            },
          },
        );
        if (!response.ok) {
          logger.debug(
            `Release note not found for version ${version} (HTTP ${response.status})`,
          );
          return { exists: false };
        }
        const release = (await response.json()) as {
          body?: string | null;
          draft?: boolean;
        };
        const hasNotes =
          release.draft !== true && (release.body ?? "").trim().length > 0;
        if (!hasNotes) {
          logger.debug(
            `Release ${version} has no notes body; not opening a blank dialog`,
          );
          return { exists: false };
        }
        logger.debug(
          `Release note found for version ${version} at ${releaseNoteUrl}`,
        );
        return { exists: true, url: releaseNoteUrl };
      } catch (error) {
        logger.error(
          `Error fetching release note for version ${version} at ${releaseNoteUrl}:`,
          error,
        );
        // In case of network errors, etc., assume it doesn't exist or is inaccessible.
        // Throwing an error here would propagate to the client and might be too disruptive
        // if the check is just for UI purposes (e.g., showing a link).
        // Consider if specific errors should be thrown based on requirements.
        return { exists: false };
      }
    },
  );

  logger.debug("Registered release note IPC handlers");
}
