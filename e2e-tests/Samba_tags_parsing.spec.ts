import { testSkipIfWindows } from "./helpers/test_helper";

testSkipIfWindows("samba tags handles nested < tags", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");
  await po.sendPrompt("tc=samba-write-angle");
  await po.snapshotAppFiles({
    name: "angle-tags-handled",
    files: ["src/foo/bar.tsx"],
  });
});
