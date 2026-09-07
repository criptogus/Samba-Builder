import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  GovernanceRoleSchema,
  type GovernanceAuditEvent,
  type GovernanceRoles,
} from "../types/governance";

const execFileAsync = promisify(execFile);

const GOVERNANCE_YAML = "governance.yaml";
const STATE_FILE = path.join(".samba", "state.json");
const AUDIT_LOG = path.join(".samba", "audit", "audit.jsonl");

/** Espelha a lógica de load_mode do gate.py. */
export function detectGovernanceMode(appDir: string): "single" | "governed" {
  const file = path.join(appDir, GOVERNANCE_YAML);
  if (!fs.existsSync(file)) return "single";
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return "single";
  }
  const match = content.match(/^\s*mode:\s*(single|governed)\b/m);
  return match ? (match[1] as "single" | "governed") : "governed";
}

/** Parseia a seção `roles:` do governance.yaml (inline `[a, b]` ou itemizada). */
export function readGovernanceRoles(appDir: string): GovernanceRoles {
  const empty: GovernanceRoles = {
    owner: [],
    tech: [],
    reviewer: [],
    admin: [],
  };
  const file = path.join(appDir, GOVERNANCE_YAML);
  if (!fs.existsSync(file)) return empty;
  let lines: string[];
  try {
    lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  } catch {
    return empty;
  }
  const roles: GovernanceRoles = { ...empty };
  const allowed = new Set(["owner", "tech", "reviewer", "admin"]);
  let inRoles = false;
  let current: keyof GovernanceRoles | null = null;
  for (const raw of lines) {
    const stripped = raw.trim();
    if (!stripped || stripped.startsWith("#")) continue;
    if (stripped === "roles:") {
      inRoles = true;
      continue;
    }
    if (inRoles && !/^\s/.test(raw)) inRoles = false;
    if (!inRoles) continue;
    const header = raw.match(/^\s{2}(owner|tech|reviewer|admin):\s*(.*)$/);
    if (header && allowed.has(header[1])) {
      current = header[1] as keyof GovernanceRoles;
      const rest = header[2].trim();
      const inline = rest.match(/^\[(.*)\](?:#.*)?$/);
      if (inline && inline[1].trim()) {
        const items = inline[1]
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
        roles[current].push(...items);
      }
      continue;
    }
    if (current && /^\s{4}-\s+/.test(raw)) {
      roles[current].push(
        raw.slice(4).trim().replace(/^['"]|['"]$/g, "").trim(),
      );
    }
  }
  return GovernanceRoleSchema.parse(roles);
}

/** Estado do ciclo (.samba/state.json) — espelha load_state do gate.py. */
export function readGovernanceState(appDir: string): {
  stage: string;
  vetos: number;
} {
  const file = path.join(appDir, STATE_FILE);
  if (!fs.existsSync(file)) return { stage: "draft", vetos: 0 };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
      state?: string;
      vetos?: unknown[];
    };
    return {
      stage: typeof parsed.state === "string" ? parsed.state : "draft",
      vetos: Array.isArray(parsed.vetos) ? parsed.vetos.length : 0,
    };
  } catch {
    return { stage: "draft", vetos: 0 };
  }
}

/** Última linha da trilha de auditoria (evento mais recente), se houver. */
export function readLastAudit(appDir: string): GovernanceAuditEvent | null {
  const file = path.join(appDir, AUDIT_LOG);
  if (!fs.existsSync(file)) return null;
  try {
    const lines = fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return null;
    const last = JSON.parse(lines[lines.length - 1]) as GovernanceAuditEvent;
    return {
      event: String(last.event ?? ""),
      by: last.by ?? null,
      ts: last.ts ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Executa o gate.py no diretório do projeto e devolve o resultado bruto.
 * Nunca lança para saída não-zero do gate — bloqueios são resultados (exitCode
 * != 0) que a UI mostra ao usuário.
 */
export async function runGovernanceGate(opts: {
  gateScript: string;
  appDir: string;
  action: "submit" | "approve" | "veto";
  by?: string;
}): Promise<{ ok: boolean; exitCode: number; output: string }> {
  const args = [opts.gateScript, opts.action, "--root", opts.appDir];
  if (opts.by) args.push("--by", opts.by);
  try {
    const { stdout } = await execFileAsync("python3", args, {
      timeout: 30_000,
      cwd: opts.appDir,
    });
    return { ok: true, exitCode: 0, output: (stdout || "").trim() };
  } catch (err) {
    const e = err as { code?: string | number; stdout?: string; stderr?: string };
    if (e.code === "ENOENT") {
      throw new Error(
        "python3 não encontrado no PATH — o gate de governança precisa de Python.",
      );
    }
    const stdout = String(e.stdout ?? "").trim();
    const stderr = String(e.stderr ?? "").trim();
    const output = stdout || stderr;
    const exitCode =
      typeof e.code === "number" && Number.isFinite(e.code) ? e.code : 1;
    return { ok: false, exitCode, output };
  }
}

/** Resolve o caminho absoluto do gate.py dentro do repositório Samba Builder. */
export function resolveGovernanceGateScript(
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch {
      // caminho inválido — tenta o próximo
    }
  }
  return null;
}
