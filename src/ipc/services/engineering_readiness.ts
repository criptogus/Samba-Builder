import { execGit } from "../utils/git_utils";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { projectQualityRuns, projectTestExecutions } from "@/db/schema";
import type { DeliveryPlan } from "@/delivery/model";
import { qualityKinds, QualityReportSchema } from "@/delivery/quality";

export async function assertEngineeringReady(
  appId: number,
  plan: DeliveryPlan,
  commit: string,
  root: string,
) {
  if (!plan.engineeringRequired && !plan.engineeringPolicy) return;
  const policy = plan.engineeringPolicy;
  if (!policy)
    throw new Error(
      "Defina requisitos, metas de arquitetura e evidências na seção Engenharia antes de aprovar.",
    );
  if (
    !policy.requirements.length ||
    !policy.architectureEvidence.trim() ||
    !policy.usabilityEvidence.trim()
  )
    throw new Error(
      "Complete requisitos e evidências de arquitetura e usabilidade.",
    );
  const requiredCategories =
    policy.profile === "critical"
      ? ["authorization", "recovery", "load"]
      : policy.profile === "private"
        ? ["authorization"]
        : [];
  for (const category of requiredCategories)
    if (!policy.requirements.some((r) => r.category === category))
      throw new Error(`O perfil exige um requisito testado de ${category}.`);
  const tree = await execGit(["ls-tree", "-r", "-z", commit], root, {
    maxBuffer: 4 * 1024 * 1024,
    signal: AbortSignal.timeout(10000),
  });
  if (tree.exitCode !== 0)
    throw new Error("Não foi possível verificar os arquivos da versão.");
  const paths = new Set(
    tree.stdout
      .split("\0")
      .filter((line) => line.startsWith("100"))
      .map((line) => line.slice(line.indexOf("\t") + 1)),
  );
  for (const task of plan.tasks) {
    if (
      !task.requirementIds?.length ||
      task.requirementIds.some(
        (id) =>
          !policy.requirements.some((requirement) => requirement.id === id),
      )
    )
      throw new Error(
        `Vincule a tarefa “${task.title}” a requisitos válidos do PRD.`,
      );
  }
  for (const requirement of policy.requirements) {
    if (
      !/^REQ-[A-Z0-9-]{1,40}$/.test(requirement.id) ||
      !requirement.title.trim() ||
      !requirement.acceptance.trim()
    )
      throw new Error("Complete ID, título e aceite de cada requisito.");
    if (
      !requirement.codePaths?.length ||
      requirement.codePaths.some((file) => !paths.has(file))
    )
      throw new Error(
        `${requirement.id}: vincule arquivos existentes na versão Git, sem links simbólicos.`,
      );

    if (
      !plan.tasks.some((task) => task.requirementIds?.includes(requirement.id))
    )
      throw new Error(`${requirement.id}: vincule uma tarefa de entrega.`);
    if (!requirement.testExecutionId)
      throw new Error(
        `${requirement.id}: selecione a execução que verifica o critério de aceite.`,
      );
    const run = db
      .select()
      .from(projectTestExecutions)
      .where(eq(projectTestExecutions.id, requirement.testExecutionId))
      .get();
    if (
      !run ||
      run.appId !== appId ||
      run.commit !== commit ||
      run.status !== "passed" ||
      run.passed < 1
    )
      throw new Error(
        `${requirement.id}: o teste precisa ter passado na versão atual deste projeto.`,
      );
  }
  for (const kind of qualityKinds) {
    const run = db
      .select()
      .from(projectQualityRuns)
      .where(
        and(
          eq(projectQualityRuns.appId, appId),
          eq(projectQualityRuns.kind, kind),
          eq(projectQualityRuns.commit, commit),
        ),
      )
      .orderBy(desc(projectQualityRuns.createdAt))
      .limit(1)
      .get();
    if (!run) throw new Error(`Execute a verificação ${kind} na versão atual.`);
    const report = QualityReportSchema.parse(JSON.parse(run.report));
    if (report.status !== "passed")
      throw new Error(`A verificação ${kind} não passou na versão atual.`);
    if (
      kind === "performance" &&
      (!report.metrics?.lcpMs ||
        report.metrics.lcpMs > policy.maxLcpMs ||
        report.metrics.cls === undefined ||
        report.metrics.cls > policy.maxCls)
    )
      throw new Error("A medição de desempenho não atende às metas atuais.");
  }
}
