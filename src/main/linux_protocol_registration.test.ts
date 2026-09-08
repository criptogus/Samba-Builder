import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDesktopFile,
  computeExecCommand,
} from "@/main/linux_protocol_registration";

describe("computeExecCommand", () => {
  it("pins NODE_ENV and the absolute userData for the dev relaunch", () => {
    const command = computeExecCommand({
      defaultApp: true,
      execPath: "/usr/lib/electron/electron",
      argv: [
        "/usr/lib/electron/electron",
        "/home/user/code/samba/.vite/main.js",
      ],
      appImagePath: undefined,
      nodeEnv: "development",
      devUserDataDir: "/home/user/code/samba/userData",
    });

    const script = path.resolve("/home/user/code/samba/.vite/main.js");
    const escapedScript = script.replace(/(["`$\\])/g, "\\$1");
    // The env prefix keeps the relaunched deep-link handler on the dev userData
    // (independent of the launcher's CWD) so it forwards into the running dev
    // instance instead of opening a second window (see computeExecCommand).
    expect(command.exec).toBe(
      `env -u ELECTRON_RUN_AS_NODE NODE_ENV=development ` +
        `"SAMBA_DEV_USER_DATA_DIR=/home/user/code/samba/userData" ` +
        `"/usr/lib/electron/electron" "${escapedScript}" %u`,
    );
    expect(command.tryExec).toBe("/usr/lib/electron/electron");
  });

  it("omits SAMBA_DEV_USER_DATA_DIR when the userData dir is unknown", () => {
    const command = computeExecCommand({
      defaultApp: true,
      execPath: "/usr/lib/electron/electron",
      argv: [
        "/usr/lib/electron/electron",
        "/home/user/code/samba/.vite/main.js",
      ],
      appImagePath: undefined,
      nodeEnv: "development",
      devUserDataDir: undefined,
    });

    expect(command.exec).toContain("NODE_ENV=development");
    expect(command.exec).not.toContain("SAMBA_DEV_USER_DATA_DIR");
  });

  it("omits the env prefix when NODE_ENV is not development", () => {
    const command = computeExecCommand({
      defaultApp: true,
      execPath: "/usr/lib/electron/electron",
      argv: [
        "/usr/lib/electron/electron",
        "/home/user/code/samba/.vite/main.js",
      ],
      appImagePath: undefined,
      nodeEnv: undefined,
      devUserDataDir: "/home/user/code/samba/userData",
    });

    const script = path.resolve("/home/user/code/samba/.vite/main.js");
    const escapedScript = script.replace(/(["`$\\])/g, "\\$1");
    expect(command.exec).toBe(
      `"/usr/lib/electron/electron" "${escapedScript}" %u`,
    );
    expect(command.exec).not.toContain("env ");
  });

  it("uses the stable APPIMAGE path, never the /tmp mount", () => {
    const command = computeExecCommand({
      defaultApp: false,
      execPath: "/tmp/.mount_sambaXXXX/usr/lib/samba/samba",
      argv: ["/tmp/.mount_sambaXXXX/usr/lib/samba/samba"],
      appImagePath: "/home/user/AppImages/samba.AppImage",
      nodeEnv: undefined,
      devUserDataDir: undefined,
    });

    expect(command.exec).toBe(`"/home/user/AppImages/samba.AppImage" %u`);
    expect(command.tryExec).toBe("/home/user/AppImages/samba.AppImage");
    expect(command.exec).not.toContain("/tmp/.mount");
  });

  it("uses the installed binary for packaged deb/rpm", () => {
    const command = computeExecCommand({
      defaultApp: false,
      execPath: "/opt/samba/samba",
      argv: ["/opt/samba/samba"],
      appImagePath: undefined,
      nodeEnv: undefined,
      devUserDataDir: undefined,
    });

    expect(command.exec).toBe(`"/opt/samba/samba" %u`);
    expect(command.tryExec).toBe("/opt/samba/samba");
  });

  it("escapes characters reserved inside quoted Exec values", () => {
    const command = computeExecCommand({
      defaultApp: false,
      execPath: "/opt/samba/samba",
      argv: [],
      appImagePath: `/home/u$er/My "Apps"/samba \`v1\`.AppImage`,
      nodeEnv: undefined,
      devUserDataDir: undefined,
    });

    expect(command.exec).toBe(
      `"/home/u\\$er/My \\"Apps\\"/samba \\\`v1\\\`.AppImage" %u`,
    );
  });
});

describe("buildDesktopFile", () => {
  it("includes the scheme handler, TryExec, and NoDisplay", () => {
    const contents = buildDesktopFile({
      exec: `"/opt/samba/samba" %u`,
      tryExec: "/opt/samba/samba",
    });

    expect(contents).toContain("MimeType=x-scheme-handler/samba;");
    expect(contents).toContain(`Exec="/opt/samba/samba" %u`);
    expect(contents).toContain("TryExec=/opt/samba/samba");
    expect(contents).toContain("NoDisplay=true");
  });
});
