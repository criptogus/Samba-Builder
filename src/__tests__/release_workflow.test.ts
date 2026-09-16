// @vitest-environment node

import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

function readWorkflow(): string {
  return fs.readFileSync(
    path.join(process.cwd(), ".github/workflows/release.yml"),
    "utf8",
  );
}

describe("release workflow", () => {
  it.each(["\n", "\r\n"])(
    "verifies the draft inside the write-scoped publish job with %j line endings",
    (lineEnding) => {
      const workflow = fs
        .readFileSync(
          path.join(process.cwd(), ".github/workflows/release.yml"),
          "utf8",
        )
        .replace(/\r?\n/g, lineEnding);
      const publishJob = workflow.slice(workflow.indexOf("  publish:"));

      expect(publishJob).toMatch(/permissions:\r?\n      contents: write/);
      expect(publishJob).toMatch(
        /Upload provenance manifests to draft release[\s\S]*Verify release tag still points to this workflow commit[\s\S]*Verify all release assets are uploaded/,
      );
      expect(workflow).not.toMatch(/^  verify-assets:/m);
    },
  );

  it("dispara também por tag empurrada (v*)", () => {
    const workflow = fs
      .readFileSync(
        path.join(process.cwd(), ".github/workflows/release.yml"),
        "utf8",
      )
      .replace(/\r?\n/g, "\n");

    expect(workflow).toMatch(
      /on:\n {2}workflow_dispatch:\n {2}push:\n {4}tags:\n {6}- "v\*"/,
    );
  });

  it("tira o draft só no caminho da tag e só depois de verificar os assets", () => {
    const workflow = fs
      .readFileSync(
        path.join(process.cwd(), ".github/workflows/release.yml"),
        "utf8",
      )
      .replace(/\r?\n/g, "\n");
    const publishJob = workflow.slice(workflow.indexOf("  publish:"));

    expect(publishJob).toMatch(
      /Verify all release assets are uploaded[\s\S]*Publish the release \(remove draft\)/,
    );
    expect(publishJob).toMatch(/if: github\.event_name == 'push'/);
    // Prerelease (beta) não pode ser marcada como "latest".
    expect(publishJob).toMatch(/--prerelease/);
  });

  it("é YAML válido e publica de fato a release marcada", () => {
    // O risco de editar workflow à mão é YAML malformado passar batido pelo
    // regex: aqui o arquivo é interpretado de verdade.
    const parsed = parseYaml(readWorkflow()) as {
      on: { workflow_dispatch: unknown; push: { tags: string[] } };
      jobs: Record<string, { steps: Array<Record<string, unknown>> }>;
    };

    expect(parsed.on.push.tags).toEqual(["v*"]);

    const stepNames = parsed.jobs.publish.steps.map((step) => step.name);
    expect(stepNames.indexOf("Publish the release (remove draft)")).toBe(
      stepNames.length - 1,
    );

    const publishStep = parsed.jobs.publish.steps.at(-1) as {
      if: string;
      run: string;
    };
    expect(publishStep.if).toBe("github.event_name == 'push'");
    expect(publishStep.run).toContain("gh release edit");
    expect(publishStep.run).toContain("--draft=false");
  });

  it("recusa build quando a tag não corresponde à versão do package.json", () => {
    const workflow = fs
      .readFileSync(
        path.join(process.cwd(), ".github/workflows/release.yml"),
        "utf8",
      )
      .replace(/\r?\n/g, "\n");

    expect(workflow).toMatch(/A tag \$\{TAG\} não corresponde à versão/);
    expect(workflow).toMatch(/node scripts\/prepare-release-tag\.js prepare/);
  });
});
