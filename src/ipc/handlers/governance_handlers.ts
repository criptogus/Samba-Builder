import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSambaAppPath, getElectron } from "@/paths/paths";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { createTypedHandler } from "./base";
import {
  governanceContracts,
  type GovernanceStatus,
} from "../types/governance";
import {
  detectGovernanceMode,
  readGovernanceRoles,
  readGovernanceState,
  readLastAudit,
  runGovernanceGate,
  resolveGovernanceGateScript,
} from "../services/governance";

const execFileAsync = promisify(execFile);

/** Localiza o gate.py dentro do repositório Samba Builder (fonte). */
function resolveGateScript(): string {
  const candidates: string[] = [];
  const electronApp = getElectron()?.app;
  const appPath = electronApp?.getAppPath?.();
  if (appPath)
    candidates.push(path.join(appPath, "samba", "governance", "gate.py"));
  candidates.push(path.join(process.cwd(), "samba", "governance", "gate.py"));
  const found = resolveGovernanceGateScript(candidates);
  if (!found) {
    throw new SambaError(
      "gate.py de governança não encontrado — rode o Samba Builder a partir do repositório.",
      SambaErrorKind.Precondition,
    );
  }
  return found;
}

/** Identidade de quem age: email git do projeto; vazio se não resolvível. */
async function resolveActingUser(appDir: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["config", "--get", "user.email"],
      { cwd: appDir, timeout: 5000 },
    );
    return stdout.trim();
  } catch {
    return "";
  }
}

function assembleStatus(opts: {
  appDir: string;
  actingAs: string;
}): GovernanceStatus {
  const mode = detectGovernanceMode(opts.appDir);
  const { stage, vetos } = readGovernanceState(opts.appDir);
  const roles = readGovernanceRoles(opts.appDir);
  const lastAudit = readLastAudit(opts.appDir);
  return {
    mode,
    stage: mode === "governed" ? stage : null,
    vetos,
    roles,
    lastAudit,
    actingAs: opts.actingAs,
    gateAvailable: true,
    gateError: null,
  };
}

export function registerGovernanceHandlers(): void {
  createTypedHandler(governanceContracts.get, async (_, { appPath }) => {
    const appDir = getSambaAppPath(appPath);
    const actingAs = await resolveActingUser(appDir);
    return assembleStatus({ appDir, actingAs });
  });

  createTypedHandler(
    governanceContracts.run,
    async (_, { appPath, action, by }) => {
      const appDir = getSambaAppPath(appPath);
      const actingAs = by?.trim() ? by.trim() : await resolveActingUser(appDir);
      const result = await runGovernanceGate({
        gateScript: resolveGateScript(),
        appDir,
        action,
        by: actingAs,
      });
      return {
        ...result,
        status: assembleStatus({ appDir, actingAs }),
      };
    },
  );
}
