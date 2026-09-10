import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listNodeCandidates,
  pickBestNode,
  readProjectNodeEngine,
  resolveProjectNode,
  type NodeCandidate,
} from "./node_runtime";

function candidate(version: string | null, source = "path"): NodeCandidate {
  return {
    dir: `/fake/${version ?? "unknown"}/bin`,
    bin: `/fake/${version ?? "unknown"}/bin/node`,
    version,
    source,
  };
}

describe("pickBestNode", () => {
  const v22 = candidate("v22.23.1");
  const v24 = candidate("v24.20.0", "samba-node24");
  const v20 = candidate("v20.11.0");

  it("picks the version that satisfies the project's engine range", () => {
    const { candidate: picked, satisfied } = pickBestNode(
      [v22, v24],
      ">=24 <26",
    );
    expect(picked?.version).toBe("v24.20.0");
    expect(satisfied).toBe(true);
  });

  it("prefers the highest version among those that satisfy", () => {
    const { candidate: picked, satisfied } = pickBestNode(
      [candidate("v24.1.0"), candidate("v24.20.0"), candidate("v25.0.0")],
      ">=24 <25",
    );
    // v25 fica de fora pelo range, então vence a maior dentro de >=24 <25.
    expect(picked?.version).toBe("v24.20.0");
    expect(satisfied).toBe(true);
  });

  it("falls back to the best available and reports dissatisfaction", () => {
    const { candidate: picked, satisfied } = pickBestNode(
      [v22, v20],
      ">=24 <26",
    );
    expect(picked?.version).toBe("v22.23.1");
    expect(satisfied).toBe(false);
  });

  it("uses the highest version when the project declares no engine", () => {
    const { candidate: picked, satisfied } = pickBestNode(
      [v20, v22, v24],
      null,
    );
    expect(picked?.version).toBe("v24.20.0");
    expect(satisfied).toBe(true);
  });

  it("ignores a caret range written without a comparator", () => {
    const { candidate: picked } = pickBestNode([v20, v24], "^20.0.0");
    expect(picked?.version).toBe("v20.11.0");
  });

  it("treats an invalid range as no range", () => {
    const { candidate: picked, satisfied } = pickBestNode(
      [v22, v24],
      "not-a-range",
    );
    expect(picked?.version).toBe("v24.20.0");
    expect(satisfied).toBe(true);
  });

  it("returns the first candidate when no version could be read", () => {
    const unknown = candidate(null);
    const { candidate: picked } = pickBestNode([unknown], ">=24 <26");
    expect(picked).toBe(unknown);
  });

  it("handles an empty candidate list", () => {
    expect(pickBestNode([], ">=24 <26")).toEqual({
      candidate: null,
      satisfied: false,
    });
  });
});

describe("readProjectNodeEngine", () => {
  const dirs: string[] = [];
  function projectWith(pkg: unknown): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samba-node-engine-"));
    dirs.push(dir);
    if (pkg !== null) {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg));
    }
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads engines.node from the project's package.json", () => {
    expect(
      readProjectNodeEngine(projectWith({ engines: { node: ">=24 <26" } })),
    ).toBe(">=24 <26");
  });

  it("returns null when the project declares no engine", () => {
    expect(readProjectNodeEngine(projectWith({ name: "x" }))).toBeNull();
    expect(readProjectNodeEngine(projectWith({ engines: {} }))).toBeNull();
  });

  it("returns null when there is no package.json", () => {
    expect(readProjectNodeEngine(projectWith(null))).toBeNull();
  });

  it("returns null when package.json is not valid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samba-node-engine-"));
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, "package.json"), "{ not json");
    expect(readProjectNodeEngine(dir)).toBeNull();
  });
});

describe("listNodeCandidates", () => {
  const currentNodeDir = path.dirname(process.execPath);

  it("lists executable nodes from the PATH first", () => {
    const candidates = listNodeCandidates({
      PATH: currentNodeDir,
      HOME: os.homedir(),
    });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].source).toBe("path");
    expect(candidates[0].dir).toBe(path.resolve(currentNodeDir));
    for (const item of candidates) {
      expect(fs.existsSync(item.bin)).toBe(true);
    }
  });

  it("does not repeat a directory that appears twice in the PATH", () => {
    const candidates = listNodeCandidates({
      PATH: `${currentNodeDir}${path.delimiter}${currentNodeDir}`,
      HOME: os.homedir(),
    });
    const dirs = candidates.map((item) => item.dir);
    expect(new Set(dirs).size).toBe(dirs.length);
  });
});

describe("resolveProjectNode", () => {
  it("never throws and explains itself when the project's engine is unreachable", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samba-node-resolve-"));
    try {
      fs.writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ engines: { node: ">=99.0.0" } }),
      );
      const resolution = resolveProjectNode(dir);
      expect(resolution.engine).toBe(">=99.0.0");
      expect(resolution.satisfied).toBe(false);
      expect(resolution.warning).toContain("EBADENGINE");
      // ainda entrega o melhor disponível para o comando poder rodar
      expect(resolution.candidate?.version).toBeTruthy();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is satisfied when the project declares no engine", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "samba-node-resolve-"));
    try {
      const resolution = resolveProjectNode(dir);
      expect(resolution.engine).toBeNull();
      expect(resolution.satisfied).toBe(true);
      expect(resolution.warning).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
