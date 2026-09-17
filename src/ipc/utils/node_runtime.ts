/**
 * Runtime Node por projeto.
 *
 * O app herda o PATH do processo (launchd/Finder) — que pode começar com um
 * Node antigo (por exemplo v22) enquanto o projeto importado exige outro
 * (`engines.node: ">=24 <26"`). Resultado: `npm install`/`npm test`/`npm run
 * dev` falham com EBADENGINE antes de qualquer coisa útil acontecer, e o
 * agente gasta o turno diagnosticando o ambiente em vez do produto.
 *
 * Aqui resolvemos, para cada projeto, o primeiro binário de Node que satisfaz
 * o `engines.node` declarado e prependemos o diretório dele ao PATH dos
 * comandos do repositório. Se nenhum satisfizer, devolvemos o melhor
 * disponível **e** a explicação, para o agente poder dizer o que falta.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import semver from "semver";
import { prependPathSegment } from "./managed_tools";

export interface NodeCandidate {
  /** Diretório que contém o binário (o que entra no PATH). */
  dir: string;
  /** Caminho do binário `node`. */
  bin: string;
  /** Versão como "v24.20.0" ou null quando não foi possível executar. */
  version: string | null;
  /** Origem, só para diagnóstico ("path", "nvm", "samba-node24", ...). */
  source: string;
}

export interface ProjectNodeResolution {
  /** Melhor candidato encontrado, ou null quando não há Node algum. */
  candidate: NodeCandidate | null;
  /** Range declarado no projeto (engines.node), se houver. */
  engine: string | null;
  /** O candidato satisfaz o range declarado (true quando não há range). */
  satisfied: boolean;
  /** Explicação pronta para o usuário/agente quando há incompatibilidade. */
  warning: string | null;
}

const NODE_BIN = process.platform === "win32" ? "node.exe" : "node";

function isExecutableFile(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function readVersion(bin: string): string | null {
  try {
    const out = execFileSync(bin, ["-v"], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out.startsWith("v") ? out : `v${out}`;
  } catch {
    return null;
  }
}

/** `engines.node` do projeto, lido diretamente do package.json. */
export function readProjectNodeEngine(appPath: string): string | null {
  try {
    const raw = fs.readFileSync(path.join(appPath, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { engines?: { node?: unknown } };
    const engine = parsed.engines?.node;
    return typeof engine === "string" && engine.trim() ? engine.trim() : null;
  } catch {
    return null;
  }
}

function homeDir(env: NodeJS.ProcessEnv): string {
  return env.HOME || os.homedir();
}

/** Diretórios conhecidos onde o usuário costuma instalar Node (macOS/Linux). */
function knownNodeDirs(
  env: NodeJS.ProcessEnv,
): { dir: string; source: string }[] {
  const home = homeDir(env);
  const out: { dir: string; source: string }[] = [
    { dir: path.join(home, ".local", "node24", "bin"), source: "samba-node24" },
    { dir: path.join(home, ".local", "bin"), source: "local-bin" },
    { dir: "/opt/homebrew/bin", source: "homebrew" },
    { dir: "/usr/local/bin", source: "usr-local" },
    { dir: "/usr/bin", source: "system" },
  ];

  // nvm / fnm / volta
  const nvmRoot = path.join(home, ".nvm", "versions", "node");
  try {
    for (const version of fs.readdirSync(nvmRoot)) {
      out.push({ dir: path.join(nvmRoot, version, "bin"), source: "nvm" });
    }
  } catch {}
  const fnmRoot = path.join(home, ".fnm", "node-versions");
  try {
    for (const version of fs.readdirSync(fnmRoot)) {
      out.push({
        dir: path.join(fnmRoot, version, "installation", "bin"),
        source: "fnm",
      });
    }
  } catch {}
  out.push({ dir: path.join(home, ".volta", "bin"), source: "volta" });

  return out;
}

/**
 * Candidatos a Node: primeiro os que já estão no PATH (preservando a ordem do
 * usuário), depois os locais conhecidos. Diretórios repetidos são ignorados.
 */
export function listNodeCandidates(
  env: NodeJS.ProcessEnv = process.env,
): NodeCandidate[] {
  const pathKey =
    process.platform === "win32"
      ? (Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "Path")
      : "PATH";
  const pathDirs = (env[pathKey] ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((dir) => ({ dir, source: "path" }));

  const seen = new Set<string>();
  const candidates: NodeCandidate[] = [];
  for (const { dir, source } of [...pathDirs, ...knownNodeDirs(env)]) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const bin = path.join(resolved, NODE_BIN);
    if (!isExecutableFile(bin)) continue;
    candidates.push({ dir: resolved, bin, version: readVersion(bin), source });
  }
  return candidates;
}

/**
 * Escolhe o melhor candidato para o range declarado: o de maior versão que
 * satisfaz. Sem range, devolve o de maior versão disponível. Quando nada
 * satisfaz, devolve o maior disponível (com `satisfied: false`).
 */
export function pickBestNode(
  candidates: NodeCandidate[],
  engine: string | null,
): { candidate: NodeCandidate | null; satisfied: boolean } {
  const valid = candidates.filter(
    (candidate) => candidate.version && semver.valid(candidate.version),
  );
  if (!valid.length)
    return { candidate: candidates[0] ?? null, satisfied: !engine };

  const byVersionDesc = [...valid].sort((a, b) =>
    semver.rcompare(a.version!, b.version!),
  );

  const range = engine && semver.validRange(engine) ? engine : null;
  if (!range) return { candidate: byVersionDesc[0], satisfied: true };

  const matching = byVersionDesc.find((candidate) =>
    semver.satisfies(candidate.version!, range),
  );
  if (matching) return { candidate: matching, satisfied: true };
  return { candidate: byVersionDesc[0], satisfied: false };
}

/** Resolve o Node do projeto e monta a explicação quando não há compatível. */
export function resolveProjectNode(
  appPath: string,
  env: NodeJS.ProcessEnv = process.env,
): ProjectNodeResolution {
  const engine = readProjectNodeEngine(appPath);
  const candidates = listNodeCandidates(env);
  const { candidate, satisfied } = pickBestNode(candidates, engine);

  let warning: string | null = null;
  if (engine && !satisfied) {
    const found = candidate?.version ?? "nenhum Node encontrado";
    warning =
      `O projeto exige Node ${engine}, mas o melhor disponível nesta máquina é ` +
      `${found}. Instale uma versão compatível (por exemplo com nvm/fnm) — ` +
      `sem isso, npm/pnpm/build/test falham com EBADENGINE.`;
  } else if (!candidate) {
    warning =
      "Nenhum Node encontrado no PATH. Instale o Node (nvm, fnm, Homebrew ou o instalador oficial) para rodar os comandos do projeto.";
  }

  return { candidate, engine, satisfied, warning };
}

/**
 * PATH ajustado para os comandos do projeto: o diretório do Node compatível
 * vem primeiro, então `npm`, `pnpm` e os scripts dos manifests o encontram.
 */
export function withProjectNodeEnv(
  appPath: string,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const { candidate } = resolveProjectNode(appPath, env);
  if (!candidate) return env;
  return prependPathSegment(env, candidate.dir);
}
