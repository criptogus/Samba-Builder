import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  previewOnCharBoundary,
  spillNotice,
  spillOversizedText,
} from "./spill_policy";
import { spillSlug, spillText } from "./spill_store";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "samba-spill-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("spillSlug", () => {
  it("transforma origem em nome de arquivo seguro", () => {
    expect(spillSlug("../../etc/passwd", "output")).toBe("etc-passwd");
    expect(spillSlug("Server.LOG", "output")).toBe("server-log");
  });

  it("usa o fallback quando sobra nada utilizável", () => {
    expect(spillSlug("///", "output")).toBe("output");
    expect(spillSlug("", "session")).toBe("session");
  });
});

describe("spillText", () => {
  it("grava o texto íntegro em pasta privada da sessão", async () => {
    const directory = await makeTempDir();
    const text = "conteúdo grande ".repeat(100);

    const result = await spillText(text, {
      directory,
      sessionKey: "chat-12",
      label: "server.log",
    });

    expect(result.bytes).toBe(Buffer.byteLength(text, "utf8"));
    expect(path.dirname(result.locator)).toBe(path.join(directory, "chat-12"));
    await expect(fs.readFile(result.locator, "utf8")).resolves.toBe(text);
    const stats = await fs.stat(result.locator);
    if (process.platform !== "win32") {
      expect(stats.mode & 0o777).toBe(0o600);
    }
  });

  it("isola sessões diferentes em pastas diferentes", async () => {
    const directory = await makeTempDir();
    const first = await spillText("a", {
      directory,
      sessionKey: "chat-1",
      label: "x",
    });
    const second = await spillText("a", {
      directory,
      sessionKey: "chat-2",
      label: "x",
    });

    expect(path.dirname(first.locator)).not.toBe(path.dirname(second.locator));
  });
});

describe("spillOversizedText", () => {
  it("deixa passar texto dentro do limite", async () => {
    const store = vi.fn();
    await expect(
      spillOversizedText("curto", { maxInlineBytes: 100, store }),
    ).resolves.toEqual({ spilled: false });
    expect(store).not.toHaveBeenCalled();
  });

  it("troca texto grande por preview + localizador", async () => {
    const text = "x".repeat(500);
    const outcome = await spillOversizedText(text, {
      maxInlineBytes: 100,
      store: async () => ({ locator: "/tmp/spill/arquivo.txt", bytes: 500 }),
    });

    expect(outcome.spilled).toBe(true);
    if (!outcome.spilled) return;
    expect(outcome.locator).toBe("/tmp/spill/arquivo.txt");
    expect(outcome.bytes).toBe(500);
    expect(Buffer.byteLength(outcome.preview, "utf8")).toBeLessThanOrEqual(100);
    expect(spillNotice(outcome)).toContain("/tmp/spill/arquivo.txt");
    expect(spillNotice(outcome)).toContain("500 bytes");
  });

  it("não engole o resultado quando o armazenamento falha", async () => {
    await expect(
      spillOversizedText("x".repeat(500), {
        maxInlineBytes: 100,
        store: async () => {
          throw new Error("disco cheio");
        },
      }),
    ).resolves.toEqual({ spilled: false });
  });
});

describe("previewOnCharBoundary", () => {
  it("não corta caractere multibyte no meio", () => {
    const text = "á".repeat(10); // 2 bytes por caractere
    const preview = previewOnCharBoundary(text, 5);
    expect(preview).toBe("áá");
    expect(Buffer.byteLength(preview, "utf8")).toBe(4);
  });

  it("devolve o texto inteiro quando já cabe", () => {
    expect(previewOnCharBoundary("curto", 100)).toBe("curto");
  });
});
