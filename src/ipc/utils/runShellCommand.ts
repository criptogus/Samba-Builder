import { spawn } from "child_process";
import log from "electron-log";

const logger = log.scope("runShellCommand");

export function runShellCommand(
  command: string,
  args: string[] = [],
  options: { env?: NodeJS.ProcessEnv } = {},
): Promise<string | null> {
  const commandString = `${command} ${args.join(" ")}`.trim();
  logger.debug(`Running command: ${commandString}`);
  return new Promise((resolve) => {
    let output = "";
    const process = spawn(command, args, {
      env: options.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"], // ignore stdin, pipe stdout/stderr
    });

    process.stdout?.on("data", (data) => {
      output += data.toString();
    });

    process.stderr?.on("data", (data) => {
      // Log stderr but don't treat it as a failure unless the exit code is non-zero
      logger.warn(`Stderr from "${commandString}": ${data.toString().trim()}`);
    });

    process.on("error", (error) => {
      logger.error(`Error executing command "${commandString}":`, error.message);
      resolve(null); // Command execution failed
    });

    process.on("close", (code) => {
      if (code === 0) {
        logger.debug(
          `Command "${commandString}" succeeded with code ${code}: ${output.trim()}`,
        );
        resolve(output.trim()); // Command succeeded, return trimmed output
      } else {
        logger.error(`Command "${commandString}" failed with code ${code}`);
        resolve(null); // Command failed
      }
    });
  });
}
