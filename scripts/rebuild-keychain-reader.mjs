import { execFileSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.log(
    `Skipping samba-keychain-reader rebuild on ${process.platform}; it is macOS-only.`,
  );
  process.exit(0);
}

execFileSync("npm", ["rebuild", "samba-keychain-reader"], {
  stdio: "inherit",
});
