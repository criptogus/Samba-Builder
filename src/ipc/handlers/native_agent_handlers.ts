import { gitCurrentBranch } from "../utils/git_utils";
import { app, dialog, BrowserWindow } from "electron";
import path from "node:path";
import * as fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { getSambaAppPath } from "@/paths/paths";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { NATIVE_AGENTS, type NativeAgent } from "@/shared/native_agents";
import { nativeAgentContracts } from "../types/native_agents";
import { createTypedHandler } from "./base";
import { appOperationCoordinator } from "../services/app_operation_coordinator";
import { NativeAgentRegistry } from "../services/native_agents/registry";
import {
  resolveExecutable,
  setExecutable,
} from "../services/native_agents/executables";
import { loginAgent, taskDrivers } from "../services/native_agents/drivers";
import { stopNativeAgentProcesses } from "../services/native_agents/process";
import { queryInvalidationBus } from "@/window_infrastructure/main/query_invalidation_bus";
const registry = new NativeAgentRegistry();
async function executable(provider: NativeAgent) {
  const result = await resolveExecutable(provider);
  if (!result)
    throw new SambaError(
      "Instale o programa oficial ou selecione seu executável antes de conectar.",
      SambaErrorKind.Precondition,
    );
  return result;
}
export function registerNativeAgentHandlers() {
  const observed = new Set<number>();
  const observe = (sender: Electron.WebContents) => {
    if (observed.has(sender.id)) return;
    observed.add(sender.id);
    sender.once("destroyed", () => {
      registry.cancelOwner(sender.id);
      observed.delete(sender.id);
    });
  };
  createTypedHandler(nativeAgentContracts.status, async () =>
    Promise.all(
      NATIVE_AGENTS.map(async (agent) => {
        const path = await resolveExecutable(agent.id);
        return { provider: agent.id, installed: !!path, path };
      }),
    ),
  );
  createTypedHandler(
    nativeAgentContracts.selectExecutable,
    async (event, { provider }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: `Selecionar executável ${provider}`,
        properties: ["openFile"],
      };
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths[0]) return false;
      await setExecutable(provider, result.filePaths[0]);
      return true;
    },
  );
  createTypedHandler(
    nativeAgentContracts.login,
    async (event, { provider }) => {
      observe(event.sender);
      return registry.start(
        event.sender.id,
        provider,
        "login",
        async (runtime) => {
          const cwd = path.join(app.getPath("userData"), "native-agent-login");
          await fs.mkdir(cwd, { recursive: true });
          await loginAgent(provider, {
            ...runtime,
            cwd,
            prompt: "",
            executable: await executable(provider),
          });
        },
      );
    },
  );
  createTypedHandler(
    nativeAgentContracts.start,
    async (event, { provider, appId, prompt }) => {
      observe(event.sender);
      return registry.start(
        event.sender.id,
        provider,
        "task",
        async (runtime) => {
          const program = await executable(provider);
          await appOperationCoordinator.run(
            {
              appId,
              operation: "native-agent-task",
              resources: [
                { resource: "app-path", mode: "read" },
                "repository",
                "runtime-config",
                "provider",
              ],
              refuseWhenRecording: "run a local agent",
            },
            async () => {
              runtime.controller.signal.throwIfAborted();
              const project = await db.query.apps.findFirst({
                where: eq(apps.id, appId),
              });
              if (!project)
                throw new SambaError(
                  "Projeto não encontrado.",
                  SambaErrorKind.NotFound,
                );
              const cwd = getSambaAppPath(project.path);
              if (!(await gitCurrentBranch({ path: cwd })))
                throw new SambaError(
                  "Volte à versão atual do projeto antes de executar um agente local.",
                  SambaErrorKind.Conflict,
                );
              runtime.controller.signal.throwIfAborted();
              try {
                await taskDrivers[provider]({
                  ...runtime,
                  executable: program,
                  cwd,
                  prompt,
                });
              } finally {
                queryInvalidationBus.publish([
                  { family: "app", appId },
                  { family: "app-files", appId },
                  { family: "versions", appId },
                  { family: "uncommitted-files", appId },
                ]);
              }
            },
          );
        },
      );
    },
  );
  createTypedHandler(nativeAgentContracts.read, async (event, { id }) =>
    registry.read(id, event.sender.id),
  );
  createTypedHandler(
    nativeAgentContracts.respond,
    async (event, { id, approvalId, allow, text }) =>
      registry.respond(id, event.sender.id, approvalId, allow, text),
  );
  createTypedHandler(
    nativeAgentContracts.loginInput,
    async (event, { id, text }) => registry.input(id, event.sender.id, text),
  );
  createTypedHandler(nativeAgentContracts.cancel, async (event, { id }) =>
    registry.cancel(id, event.sender.id),
  );
  app.on("before-quit", () => {
    registry.shutdown();
    stopNativeAgentProcesses();
  });
}
