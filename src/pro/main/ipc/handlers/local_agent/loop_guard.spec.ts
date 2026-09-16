import { describe, expect, it, vi } from "vitest";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import {
  REPEATED_TOOL_CALL_THRESHOLD,
  RepeatedToolCallGuard,
  repeatedToolCallReminder,
  runToolWithTimeout,
  stableStringify,
  toolCallSignature,
  toolTimeoutMs,
} from "./loop_guard";

describe("stableStringify", () => {
  it("não depende da ordem das chaves", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(
      stableStringify({ a: 2, b: 1 }),
    );
  });

  it("ignora chaves indefinidas, como o JSON faria", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(
      stableStringify({ a: 1 }),
    );
  });

  it("preserva ordem de arrays, que é significativa", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});

describe("toolCallSignature", () => {
  it("separa a mesma tool com argumentos diferentes", () => {
    expect(toolCallSignature("read_file", { path: "a.ts" })).not.toBe(
      toolCallSignature("read_file", { path: "b.ts" }),
    );
  });

  it("junta a mesma tool com argumentos equivalentes em ordem diferente", () => {
    expect(
      toolCallSignature("read_file", { path: "a.ts", app_name: "x" }),
    ).toBe(toolCallSignature("read_file", { app_name: "x", path: "a.ts" }));
  });
});

describe("RepeatedToolCallGuard", () => {
  it("só acusa depois do limite de repetições", () => {
    const guard = new RepeatedToolCallGuard();
    for (let index = 1; index < REPEATED_TOOL_CALL_THRESHOLD; index += 1) {
      expect(guard.note("read_file", { path: "a.ts" }).repeated).toBe(false);
    }
    expect(guard.note("read_file", { path: "a.ts" })).toEqual({
      count: REPEATED_TOOL_CALL_THRESHOLD,
      repeated: true,
    });
  });

  it("não mistura tools diferentes nem argumentos diferentes", () => {
    const guard = new RepeatedToolCallGuard();
    guard.note("read_file", { path: "a.ts" });
    guard.note("read_file", { path: "b.ts" });
    expect(guard.note("read_file", { path: "a.ts" }).repeated).toBe(false);
    expect(guard.note("list_files", { path: "a.ts" }).repeated).toBe(false);
  });
});

describe("repeatedToolCallReminder", () => {
  it("diz quantas vezes repetiu e pede mudança de abordagem", () => {
    const reminder = repeatedToolCallReminder("read_file", 3);
    expect(reminder).toContain("read_file");
    expect(reminder).toContain("3 vezes");
    expect(reminder).toContain("Pare de repetir");
  });
});

describe("toolTimeoutMs", () => {
  it("declara limite para as tools que podem travar a sessão", () => {
    expect(toolTimeoutMs("run_build")).toBeGreaterThan(0);
    expect(toolTimeoutMs("execute_sandbox_script")).toBeGreaterThan(0);
  });

  it("não inventa limite para tools rápidas", () => {
    expect(toolTimeoutMs("read_file")).toBeUndefined();
  });
});

describe("runToolWithTimeout", () => {
  it("sem limite, apenas executa a tool", async () => {
    const run = vi.fn().mockResolvedValue("ok");
    await expect(
      runToolWithTimeout({ toolName: "read_file", run }),
    ).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("devolve o resultado quando termina dentro do teto", async () => {
    await expect(
      runToolWithTimeout({
        toolName: "run_build",
        timeoutMs: 1000,
        run: async () => "build ok",
      }),
    ).resolves.toBe("build ok");
  });

  it("falha com erro claro quando estoura o teto", async () => {
    const pending = runToolWithTimeout({
      toolName: "run_build",
      timeoutMs: 10,
      run: () => new Promise((resolve) => setTimeout(resolve, 5000)),
    });

    await expect(pending).rejects.toThrow(/run_build.*excedeu o limite/);
    await expect(pending).rejects.toBeInstanceOf(SambaError);
    await pending.catch((error: unknown) => {
      expect((error as SambaError).kind).toBe(SambaErrorKind.Precondition);
    });
  });

  it("deixa o erro real da tool passar, sem mascarar com timeout", async () => {
    await expect(
      runToolWithTimeout({
        toolName: "run_build",
        timeoutMs: 1000,
        run: async () => {
          throw new SambaError("build quebrou", SambaErrorKind.Validation);
        },
      }),
    ).rejects.toThrow("build quebrou");
  });
});
