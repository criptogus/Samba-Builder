import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";
import {
  selectFileAndWaitForEditor,
  replaceEditorContent,
} from "./helpers/monaco_editor";

test("loads Monaco only when opening a file and still saves edits", async ({
  po,
  electronApp,
}, testInfo) => {
  await po.setUp();
  await po.importApp("minimal");
  expect(await po.page.evaluate(() => "monaco" in window)).toBe(false);
  expect(
    await po.page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) =>
          /monaco-editor.*(?:loader|editor\.main)/.test(entry.name),
        ),
    ),
  ).toBe(false);
  const beforeEditor = await electronApp.evaluate(({ app }) =>
    app.getAppMetrics().map(({ type, memory }) => ({ type, memory })),
  );
  await po.previewPanel.selectPreviewMode("code");
  await selectFileAndWaitForEditor(po.page, "package.json", "package.json");
  const afterEditor = await electronApp.evaluate(({ app }) =>
    app.getAppMetrics().map(({ type, memory }) => ({ type, memory })),
  );
  await testInfo.attach("electron-memory.json", {
    body: JSON.stringify({ beforeEditor, afterEditor }, null, 2),
    contentType: "application/json",
  });
  await replaceEditorContent(
    po.page,
    '{"name":"memory-check","version":"1.0.0"}\n',
  );
  await po.page.getByTestId("save-file-button").click();
  await expect(po.page.getByTestId("save-file-button")).toBeDisabled();
  const appPath = await po.appManagement.getCurrentAppPath();
  await expect
    .poll(
      async () =>
        JSON.parse(await readFile(path.join(appPath, "package.json"), "utf8"))
          .name,
    )
    .toBe("memory-check");
  console.log(
    "Electron memory snapshots:",
    JSON.stringify({ beforeEditor, afterEditor }),
  );
});
