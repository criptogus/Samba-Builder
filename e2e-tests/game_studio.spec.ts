import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";

test("game studio inspects and restores bundled skills through preload", async ({
  po,
}) => {
  const result = await po.page.evaluate(async () => {
    const invoke = (channel: string, input: object) =>
      (window as any).electron.ipcRenderer.invoke(channel, input);
    const before = await invoke("extensions:game-studio", {});
    const installed = await invoke("extensions:install-game-skill", {
      slug: "construtor-de-jogos",
    });
    const repeated = await invoke("extensions:install-game-skill", {
      slug: "construtor-de-jogos",
    });
    const after = await invoke("extensions:game-studio", {});
    return {
      programCount: before.computer.length,
      bundledCount: before.bundled.length,
      installed,
      repeated,
      restored: after.bundled.find(
        (skill: { slug: string }) => skill.slug === "construtor-de-jogos",
      )?.installed,
    };
  });
  expect(result.programCount).toBe(5);
  expect(result.bundledCount).toBe(6);
  expect(result.installed.relativePath).toBe(
    "skills/construtor-de-jogos/SKILL.md",
  );
  expect(result.repeated.status).toBe("already-present");
  expect(result.restored).toBe(true);
});
