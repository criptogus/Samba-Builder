import { readFileSync } from "node:fs";

import { selectPreviousReleaseTag } from "../src/ipc/services/release_check.ts";

const [file, currentTag] = process.argv.slice(2);
if (!file || !currentTag) {
  process.stderr.write(
    "uso: node scripts/select-previous-release-tag.mjs <releases.json> <tag-atual>\n",
  );
  process.exit(1);
}

const tag = selectPreviousReleaseTag(
  JSON.parse(readFileSync(file, "utf8")),
  currentTag,
);
if (tag) {
  process.stdout.write(tag);
}
