import { afterEach, describe, expect, it, vi } from "vitest";

const loader = vi.hoisted(() => ({ init: vi.fn(() => new Promise(() => {})) }));
vi.mock("@monaco-editor/react", () => ({ loader }));
import { configureMonaco } from "./monaco";

describe("on-demand Monaco configuration", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("does not initialize the editor when chat modules load", async () => {
    vi.resetModules();
    vi.stubEnv("VITEST", "false");
    await import("./monaco");
    expect(loader.init).not.toHaveBeenCalled();
  });
  it("configures each editor runtime once before mounting", () => {
    const monaco = {
      editor: { defineTheme: vi.fn() },
      languages: {
        typescript: {
          JsxEmit: { React: 2 },
          typescriptDefaults: {
            setCompilerOptions: vi.fn(),
            setDiagnosticsOptions: vi.fn(),
          },
        },
      },
    };
    configureMonaco(monaco as unknown as Parameters<typeof configureMonaco>[0]);
    configureMonaco(monaco as unknown as Parameters<typeof configureMonaco>[0]);
    expect(monaco.editor.defineTheme).toHaveBeenCalledTimes(2);
    expect(
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions,
    ).toHaveBeenCalledWith({ noSemanticValidation: true });
  });
});
