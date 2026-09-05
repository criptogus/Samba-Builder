import { z } from "zod";
import { spawnStreaming } from "@/ipc/utils/spawn_streaming";
import { scanSources } from "../../../../packages/samba-factory/src/scanner";
import type { FactoryScan } from "../../../../packages/samba-factory/src/schema";
import { readFactorySources } from "./files";
const PackageSchema = z.object({
  scripts: z.record(z.string(), z.string()).default({}),
});
const AuditSchema = z.object({
  metadata: z.object({
    vulnerabilities: z.object({ high: z.number(), critical: z.number() }),
  }),
});

export async function runFactoryScan(root: string): Promise<FactoryScan> {
  const before = await readFactorySources(root);
  const manifest = before.files.find((file) => file.path === "package.json");
  const scripts = manifest
    ? PackageSchema.parse(JSON.parse(manifest.content)).scripts
    : {};
  async function check(
    script: string | undefined,
  ): Promise<FactoryScan["typecheck"]> {
    if (!script) return "missing";
    try {
      const result = await spawnStreaming({
        command: "npm",
        args: ["--ignore-scripts", "run", script],
        cwd: root,
        env: { ...process.env, CI: "true" },
        timeoutMs: 120000,
      });
      return result.code === 0 && !result.timedOut && !result.aborted
        ? "passed"
        : "failed";
    } catch {
      return "failed";
    }
  }
  const typecheck = await check(
    scripts.typecheck ? "typecheck" : scripts.ts ? "ts" : undefined,
  );
  const smoke = await check(scripts["test:smoke"] ? "test:smoke" : undefined);
  let dependencies: FactoryScan["dependencies"] = "unavailable";
  if (before.files.some((file) => file.path === "package-lock.json")) {
    try {
      const result = await spawnStreaming({
        command: "npm",
        args: ["audit", "--json", "--ignore-scripts"],
        cwd: root,
        timeoutMs: 45000,
      });
      const audit = AuditSchema.safeParse(JSON.parse(result.stdout));
      if (
        audit.success &&
        !result.timedOut &&
        !result.aborted &&
        (result.code === 0 || result.code === 1)
      )
        dependencies =
          audit.data.metadata.vulnerabilities.high +
            audit.data.metadata.vulnerabilities.critical ===
          0
            ? "passed"
            : "failed";
    } catch {
      /* Offline/unsupported registry is not a green result. */
    }
  }
  const after = await readFactorySources(root);
  const changed = before.digest !== after.digest;
  return {
    at: new Date().toISOString(),
    digest: after.digest,
    complete: after.complete && !changed,
    findings: scanSources(after.files),
    typecheck,
    smoke,
    dependencies,
    limitations: [
      ...after.limitations,
      ...(changed
        ? [
            "Os scripts alteraram fontes durante a verificação. Revise e execute novamente.",
          ]
        : []),
      "Scan heurístico local: não verifica o estado do banco remoto, IDOR, LGPD, headers em produção ou exploitabilidade.",
      "Auditoria de dependências exige package-lock.json e acesso ao registry npm.",
      "Papéis e identidade nesta versão são declarações do operador local; não há autenticação de equipe.",
    ],
  };
}
