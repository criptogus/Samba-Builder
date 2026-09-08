import log from "electron-log";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { getSambaAppPath } from "../../paths/paths";
import { createTypedHandler } from "./base";
import { designSystemContracts } from "../types/design_system";
import {
  parseAppliedPath,
  parseListTemplatesOutput,
  parseSavedSlug,
  resolveDesignSystemToolkitPath,
  runDesignToolkit,
} from "../services/design_system_toolkit";

const logger = log.scope("design_system_handlers");

async function getApp(appId: number) {
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });
  if (!app) {
    throw new Error(`App with id ${appId} not found`);
  }
  return app;
}

export function registerDesignSystemHandlers() {
  createTypedHandler(designSystemContracts.listTemplates, async () => {
    const scriptPath = resolveDesignSystemToolkitPath();
    const stdout = await runDesignToolkit(scriptPath, ["list-templates"]);
    return { templates: parseListTemplatesOutput(stdout) };
  });

  createTypedHandler(
    designSystemContracts.extractTemplate,
    async (_, params) => {
      const app = await getApp(params.appId);
      const appDir = getSambaAppPath(app.path);
      const scriptPath = resolveDesignSystemToolkitPath();

      // Extract the app's design system to a temp JSON, then save it as a
      // template under the requested name.
      const tmpJson = path.join(
        os.tmpdir(),
        `samba-design-system-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
      );
      try {
        await runDesignToolkit(scriptPath, [
          "extract",
          appDir,
          "--name",
          params.name,
          "--out",
          tmpJson,
        ]);
        const saveOut = await runDesignToolkit(scriptPath, [
          "save-template",
          tmpJson,
          "--name",
          params.name,
        ]);
        const slug = parseSavedSlug(saveOut) || params.name;
        logger.info(
          `Extracted design system '${params.name}' (${slug}) from ${appDir}`,
        );
        return { slug, name: params.name };
      } finally {
        try {
          fs.unlinkSync(tmpJson);
        } catch {
          // Best-effort cleanup of the temp file.
        }
      }
    },
  );

  createTypedHandler(designSystemContracts.applyTemplate, async (_, params) => {
    const app = await getApp(params.appId);
    const appDir = getSambaAppPath(app.path);
    const scriptPath = resolveDesignSystemToolkitPath();

    const stdout = await runDesignToolkit(scriptPath, [
      "apply-template",
      params.slug,
      appDir,
    ]);
    logger.info(`Applied design system '${params.slug}' to ${appDir}`);
    return { slug: params.slug, appliedPath: parseAppliedPath(stdout) };
  });
}
