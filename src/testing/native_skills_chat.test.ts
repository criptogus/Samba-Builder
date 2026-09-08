// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const h = vi.hoisted(() => {
  process.env.NODE_ENV = "development";
  return { ipcHandlers: new Map() };
});
vi.mock("electron", async () => {
  const { createElectronMock } = await import("@/testing/electron_mock");
  return createElectronMock(h);
});
import {
  setupChatFlowHarness,
  type ChatFlowHarness,
} from "./chat_flow_harness";
let harness: ChatFlowHarness;
beforeAll(async () => {
  harness = await setupChatFlowHarness({ electronMock: h, chatMode: "ask" });
}, 30_000);
afterAll(async () => {
  await harness?.dispose();
});
it("sends selected instructions to the model while storing the readable command", async () => {
  const prompt = "/samba-debug [dump] Analise o login";
  const result = await harness.streamChat(prompt);
  expect(result.eventsFor("chat:response:error")).toHaveLength(0);
  expect(
    result.messages.find((message) => message.role === "user")?.content,
  ).toBe(prompt);
  const dump = readFileSync(result.getServerDump().dumpPath, "utf8");
  expect(dump).toContain("Formule uma hipótese falsificável");
  expect(dump).toContain("Em Ask/Plan, não realize alterações");
  expect(dump).not.toContain("Escolha uma direção visual");
}, 30_000);
it("does not retain expanded skill instructions on a later ordinary turn", async () => {
  const result = await harness.streamChat("[dump] Continue a explicação");
  expect(result.eventsFor("chat:response:error")).toHaveLength(0);
  expect(readFileSync(result.getServerDump().dumpPath, "utf8")).not.toContain(
    "Formule uma hipótese falsificável",
  );
}, 30_000);
