// @vitest-environment node
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { transcribeMeetingAudio } from "./transcribe";
import { MeetingImportRegistry } from "./import_registry";
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "samba-audio-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});
it("streams the chosen file to the fixed provider and retains timestamps", async () => {
  const file = path.join(dir, "client.mp3");
  await writeFile(file, "fake audio");
  const request = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        text: "Precisamos agendar",
        segments: [{ start: 65.5, text: "Precisamos agendar" }],
      }),
    ),
  );
  const result = await transcribeMeetingAudio(
    file,
    "test-key",
    new AbortController().signal,
    request,
  );
  expect(result).toEqual({
    filename: "client.mp3",
    text: "[1:05] Precisamos agendar",
  });
  const [url, opts] = request.mock.calls[0];
  expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
  expect(opts.redirect).toBe("error");
  expect(opts.body.get("model")).toBe("whisper-1");
  expect(await opts.body.get("file").text()).toBe("fake audio");
});
it("rejects unsupported files before any upload", async () => {
  const file = path.join(dir, "client.exe");
  await writeFile(file, "fake");
  const request = vi.fn();
  await expect(
    transcribeMeetingAudio(file, "key", new AbortController().signal, request),
  ).rejects.toThrow("24 MB");
  expect(request).not.toHaveBeenCalled();
});
it("surfaces provider rejection without leaking response bodies or keys", async () => {
  const file = path.join(dir, "client.mp3");
  await writeFile(file, "fake");
  const request = vi
    .fn()
    .mockResolvedValue(new Response("private details", { status: 401 }));
  await expect(
    transcribeMeetingAudio(
      file,
      "SECRET",
      new AbortController().signal,
      request,
    ),
  ).rejects.toThrow("chave OpenAI");
});
it("bounds upstream responses", async () => {
  const file = path.join(dir, "client.mp3");
  await writeFile(file, "fake");
  const request = vi
    .fn()
    .mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1)));
  await expect(
    transcribeMeetingAudio(file, "key", new AbortController().signal, request),
  ).rejects.toThrow("muito longa");
});
it("caps concurrency and lets only the originating window cancel", async () => {
  const registry = new MeetingImportRegistry();
  let finish!: () => void;
  let signal!: AbortSignal;
  const running = registry.run(1, "first", async (s) => {
    signal = s;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  await expect(registry.run(2, "second", async () => 1)).rejects.toThrow(
    "andamento",
  );
  registry.cancel(2, "first");
  expect(signal.aborted).toBe(false);
  registry.cancel(1, "first");
  expect(signal.aborted).toBe(true);
  finish();
  await running;
  expect(await registry.run(2, "second", async () => 1)).toBe(1);
});
