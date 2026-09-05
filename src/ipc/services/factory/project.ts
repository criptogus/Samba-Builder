import { randomUUID } from "node:crypto";
import type { FactoryAction } from "@/ipc/types/factory";
import type { FactoryProject } from "../../../../packages/samba-factory/src/schema";
import { buildBlockers } from "../../../../packages/samba-factory/src/policy";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

export function applyFactoryAction(
  project: FactoryProject,
  action: FactoryAction,
  now: string,
): FactoryProject {
  const next = structuredClone(project);
  next.revision++;
  const actor = "actor" in action ? action.actor : "Operador local";
  const approval = { actor, at: now, revision: next.revision };
  switch (action.type) {
    case "brief":
      next.brief = action.brief;
      next.knowledge = action.knowledge;
      next.approval = null;
      next.scan = null;
      next.mode = "discover";
      break;
    case "plan":
      if (
        new Set(action.plan.tasks.map((task) => task.id)).size !==
        action.plan.tasks.length
      )
        throw new DyadError(
          "IDs de tarefas duplicados.",
          DyadErrorKind.Validation,
        );
      next.plan = action.plan;
      next.approval = null;
      next.scan = null;
      next.mode = "plan";
      break;
    case "approve-plan":
      if (!next.plan || !next.brief.trim())
        throw new DyadError(
          "Preencha briefing e plano antes de aprovar.",
          DyadErrorKind.Precondition,
        );
      next.approval = approval;
      next.mode = next.brandApproval ? "build" : "design";
      break;
    case "brand":
      next.brand = action.brand;
      next.brandApproval = approval;
      next.scan = null;
      break;
    case "mode":
      if (action.mode === "build" || action.mode === "fix") {
        const blockers = buildBlockers(next);
        if (blockers.length)
          throw new DyadError(blockers.join("\n"), DyadErrorKind.Precondition);
      }
      next.mode = action.mode;
      break;
    case "task": {
      const task = next.plan?.tasks.find((entry) => entry.id === action.taskId);
      if (!task || !next.approval)
        throw new DyadError(
          "A tarefa precisa pertencer a um plano aprovado.",
          DyadErrorKind.Precondition,
        );
      task.status = action.status;
      break;
    }
    case "request":
      next.changes.push({
        id: randomUUID(),
        request: action.request,
        taskId: null,
        status: "pending",
        at: now,
      });
      break;
    case "resolve-request": {
      const request = next.changes.find((entry) => entry.id === action.id);
      if (!request)
        throw new DyadError(
          "Solicitação não encontrada.",
          DyadErrorKind.NotFound,
        );
      if (
        action.status === "in-scope" &&
        (!next.approval ||
          !next.plan?.tasks.some((task) => task.id === action.taskId))
      )
        throw new DyadError(
          "Vincule o pedido a uma tarefa do plano aprovado.",
          DyadErrorKind.Precondition,
        );
      request.status = action.status;
      request.taskId = action.taskId;
      break;
    }
  }
  next.audit.push({
    at: now,
    actor,
    action: action.type,
    revision: next.revision,
  });
  return next;
}
