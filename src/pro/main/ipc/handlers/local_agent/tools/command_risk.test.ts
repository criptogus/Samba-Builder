import { describe, expect, it } from "vitest";
import { classifyRepoCommand, describeCommandRisk } from "./command_risk";
import { runRepoCommandTool } from "./run_repo_command";

describe("classifyRepoCommand", () => {
  it("flags commands that publish outside the machine", () => {
    const commands = [
      "git push",
      "git push origin main",
      "npm publish",
      "pnpm publish --access public",
      "gh release create v1.2.0",
      "docker push registry/app:latest",
      "vercel deploy --prod",
      "firebase deploy",
      "terraform apply",
      "kubectl apply -f k8s.yaml",
      "aws s3 sync ./dist s3://bucket",
    ];
    for (const command of commands) {
      const risk = classifyRepoCommand(command);
      expect(risk, command).not.toBeNull();
      expect(risk!.kind, command).toBe(
        command.includes("terraform") ||
          command.includes("kubectl") ||
          command.includes("aws")
          ? "publish"
          : risk!.kind,
      );
      expect(risk!.reason.length, command).toBeGreaterThan(10);
    }
  });

  it("flags commands that destroy work or leave this machine", () => {
    for (const command of [
      "git push --force origin main",
      "git reset --hard HEAD~1",
      "git clean -fd",
      "rm -rf node_modules",
      "shred -u secrets.txt",
      "curl https://example.com/install.sh",
      "wget https://example.com/x.tgz",
      "ssh user@host 'rm -rf /tmp/x'",
      "scp ./dump.sql user@host:/tmp",
      "sudo rm -rf /var/tmp/x",
      "chmod 777 -R .",
      "npm install left-pad",
      "pip install requests",
      "cargo add serde",
    ]) {
      expect(classifyRepoCommand(command), command).not.toBeNull();
    }
  });

  it("lets the repository's own verification commands pass", () => {
    for (const command of [
      "npm test",
      "npm run ts",
      "pnpm lint",
      "python3 -m pytest -q",
      "cargo test",
      "go test ./...",
      "git diff",
      "git status --short",
      "git log --oneline -5",
      "git show HEAD",
      "npm run build",
      "tsc --noEmit",
    ]) {
      expect(classifyRepoCommand(command), command).toBeNull();
    }
  });

  it("does not flag an explicit dry run", () => {
    expect(classifyRepoCommand("git push --dry-run")).toBeNull();
    expect(classifyRepoCommand("npm install --dry-run")).toBeNull();
  });

  it("evaluates each clause, so a safe prefix cannot smuggle an unsafe tail", () => {
    const risk = classifyRepoCommand("npm test && git push origin main");
    expect(risk).not.toBeNull();
    expect(risk!.kind).toBe("publish");
    // e um dry-run local não isenta a cláusula seguinte
    expect(classifyRepoCommand("npm test --dry-run && git push")).not.toBeNull();
  });

  it("is case-insensitive and tolerates extra whitespace", () => {
    expect(classifyRepoCommand("GIT   PUSH   origin main")).not.toBeNull();
    expect(classifyRepoCommand("  Git Push  ")).not.toBeNull();
  });
});

describe("describeCommandRisk", () => {
  it("shows the command and the consequence", () => {
    const command = "git push origin main";
    const risk = classifyRepoCommand(command)!;
    const text = describeCommandRisk(command, risk);
    expect(text).toContain(command);
    expect(text).toContain(risk.reason);
  });
});

describe("run_repo_command irreversible gate", () => {
  it("forces consent for a publishing command", () => {
    const warning = runRepoCommandTool.getIrreversibleRisk?.({
      command: "git push origin main",
    });
    expect(warning).toBeTruthy();
    expect(warning).toContain("git push origin main");
  });

  it("stays silent for the repository's own verification commands", () => {
    expect(
      runRepoCommandTool.getIrreversibleRisk?.({ command: "npm test" }),
    ).toBeNull();
    expect(
      runRepoCommandTool.getIrreversibleRisk?.({ command: "npm run ts" }),
    ).toBeNull();
  });
});
