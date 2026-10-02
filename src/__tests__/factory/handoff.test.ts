import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PlanSchema,
  ProjectSchema,
} from "../../../packages/samba-factory/src/schema";
import {
  handoffPullRequest,
  planToStagingMs,
} from "../../../packages/samba-factory/src/handoff";
import {
  isExternalPublishTool,
  PUBLISH_PATHS,
} from "../../../packages/samba-factory/src/publish_paths";
describe("handoff pull request", () => {
  it("includes the acceptance checklist and scan evidence", () => {
    const project = ProjectSchema.parse({
      appId: 1,
      client: "Cliente A",
      name: "Portal",
      brief: "Portal para clientes",
      revision: 2,
      mode: "build",
      plan: PlanSchema.parse({
        problem: "Isolar acesso",
        users: "Compradores",
        stack: "React TS",
        outOfScope: "Pagamento",
        risks: "Dados privados",
        tasks: [
          {
            id: "6bd4a19b-ae6e-4e7f-9c55-cf10deed90f2",
            title: "Autorização",
            priority: "must",
            acceptance: "A não vê dados de B",
            status: "done",
          },
        ],
      }),
      approval: null,
      brand: null,
      brandApproval: null,
      scan: null,
      changes: [],
      audit: [],
    });
    project.approval = {
      actor: "Ana",
      at: "2026-10-02T12:00:00.000Z",
      revision: 2,
    };
    project.scan = {
      at: "2026-10-02T15:00:00.000Z",
      digest: "abc",
      complete: true,
      findings: [],
      limitations: [],
      typecheck: "passed",
      smoke: "passed",
      dependencies: "passed",
    };
    project.stages = {
      planApprovedAt: "2026-10-02T12:00:00.000Z",
      stagingAt: "2026-10-02T18:00:00.000Z",
    };
    const document = handoffPullRequest(project);
    expect(document.title).toContain("Portal");
    expect(document.body).toContain("Checklist de aceite");
    expect(document.body).toContain("Autorização");
    expect(document.body).toContain("docs/security-report.md");
    expect(document.body).toContain("abc");
    expect(planToStagingMs(project)).toBe(6 * 60 * 60 * 1000);
  });
});

describe("publish inventory", () => {
  it("gates the native paths and one external MCP path", () => {
    const gated = PUBLISH_PATHS.filter((path) => path.disposition === "gated");
    expect(gated.map((path) => path.id)).toEqual(
      expect.arrayContaining([
        "git-push",
        "vercel-deploy",
        "coolify-deploy",
        "mcp-publish",
      ]),
    );
    expect(isExternalPublishTool("deploy_project")).toBe(true);
    expect(isExternalPublishTool("list_deployments")).toBe(false);
    const matrix = readFileSync("docs/samba-factory/PUBLISH-GATES.md", "utf8");
    for (const path of PUBLISH_PATHS) {
      expect(matrix.length).toBeGreaterThan(0);
      expect(path.id.length).toBeGreaterThan(0);
    }
    expect(matrix).toContain("Terminal interativo");
    expect(matrix).toContain("MCP");
  });
});

describe("assessment plan template", () => {
  it("imports as a factory plan", () => {
    const raw = JSON.parse(
      readFileSync(
        "docs/samba-factory/templates/assessment-follow-up.plan.json",
        "utf8",
      ),
    );
    const plan = PlanSchema.parse(raw);
    expect(plan.tasks.some((task) => task.priority === "must")).toBe(true);
    expect(plan.tasks).toHaveLength(5);
  });
});
