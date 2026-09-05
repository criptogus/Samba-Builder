// @vitest-environment node
import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  handlers: new Map(),
  settings: vi.fn(),
  dialog: vi.fn(),
  transcribe: vi.fn(),
}));
vi.mock("./base", () => ({
  createTypedHandler: (contract: { channel: string }, handler: unknown) =>
    mocks.handlers.set(contract.channel, handler),
}));
vi.mock("electron", () => ({
  dialog: { showOpenDialog: mocks.dialog },
  BrowserWindow: { fromWebContents: () => null },
}));
vi.mock("@/main/settings", () => ({ readSettings: mocks.settings }));
vi.mock("../services/meetings/transcribe", () => ({
  transcribeMeetingAudio: mocks.transcribe,
}));
import { registerMeetingsHandlers } from "./meetings_handlers";
registerMeetingsHandlers();
const requestId = "c39cfd03-b953-4c66-a6d2-4e39704c48bf";
const event = () => ({ sender: Object.assign(new EventEmitter(), { id: 1 }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.settings.mockReturnValue({
    providerSettings: { openai: { apiKey: { value: "private-key" } } },
  });
});
it("requires a configured provider before showing a file dialog", async () => {
  mocks.settings.mockReturnValue({});
  await expect(
    mocks.handlers.get("meetings:import-audio")(event(), { requestId }),
  ).rejects.toThrow("Configure sua chave OpenAI");
  expect(mocks.dialog).not.toHaveBeenCalled();
  expect(mocks.transcribe).not.toHaveBeenCalled();
});
it("does not upload when the file selection is cancelled", async () => {
  mocks.dialog.mockResolvedValue({ canceled: true, filePaths: [] });
  expect(
    await mocks.handlers.get("meetings:import-audio")(event(), { requestId }),
  ).toBeNull();
  expect(mocks.transcribe).not.toHaveBeenCalled();
});
it("uses the native-selected path, returns only text metadata, and removes lifecycle listeners", async () => {
  mocks.dialog.mockResolvedValue({
    canceled: false,
    filePaths: ["/selected/meeting.mp3"],
  });
  mocks.transcribe.mockResolvedValue({
    filename: "meeting.mp3",
    text: "client brief",
  });
  const current = event();
  expect(
    await mocks.handlers.get("meetings:import-audio")(current, { requestId }),
  ).toEqual({ filename: "meeting.mp3", text: "client brief" });
  expect(mocks.transcribe).toHaveBeenCalledWith(
    "/selected/meeting.mp3",
    "private-key",
    expect.any(AbortSignal),
  );
  expect(current.sender.listenerCount("destroyed")).toBe(0);
});
