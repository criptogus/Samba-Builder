import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function desktopExecutable(root, name, platform, arch) {
  const base = path.join(root, "out", "desktop", `${name}-${platform}-${arch}`);
  if (platform === "darwin") {
    return path.join(base, `${name}.app`, "Contents", "MacOS", name);
  }
  return path.join(base, platform === "win32" ? `${name}.exe` : name);
}

export function desktopLaunchOptions(root, env = process.env) {
  const userData = path.resolve(
    root,
    env.SAMBA_DEV_USER_DATA_DIR?.trim() || "userData",
  );
  const childEnv = { ...env, NODE_ENV: "production" };
  delete childEnv.ELECTRON_RUN_AS_NODE;
  delete childEnv.E2E_TEST_BUILD;
  return {
    args: [`--user-data-dir=${userData}`],
    options: {
      cwd: root,
      env: childEnv,
      detached: true,
      stdio: "ignore",
      shell: false,
    },
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const executable = desktopExecutable(
    root,
    pkg.productName || pkg.name,
    process.platform,
    process.arch,
  );
  if (!existsSync(executable)) {
    console.error(
      "Compile primeiro com npm run desktop:build. Depois feche o Samba em modo dev e execute npm run desktop.",
    );
    process.exitCode = 1;
  } else {
    const { args, options } = desktopLaunchOptions(root);
    const child = spawn(executable, args, options);
    child.once("error", (error) => {
      console.error("Não foi possível abrir o Samba:", error.message);
      process.exitCode = 1;
    });
    child.unref();
  }
}
